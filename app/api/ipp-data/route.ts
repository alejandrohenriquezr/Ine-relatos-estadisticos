import { NextResponse } from "next/server";
import { parseIppOfficialFiles } from "../../../lib/ipp-official-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

const matchers = { industries: /industrias?(?!.*manufactur)/i, mining: /miner[ií]a/i, ipdega: /ipdega|electricidad.*gas.*agua/i, manufacturing: /manufactur/i } as const;
const headers = { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" };
export async function GET(request: Request) {
  const db=(globalThis as typeof globalThis&{__SITES_DB?:D1Database}).__SITES_DB;if(!db)return NextResponse.json({error:"La caché compartida aún no está disponible"},{status:503});
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached=await db.prepare("SELECT * FROM economic_source_cache WHERE kind=?").bind("ipp").first<Record<string,string>>();
  const refresh=new URL(request.url).searchParams.get("refresh")==="1";
  // La ruta normal nunca consulta la fuente: entrega primero el último payload íntegro almacenado en D1.
  if(cached&&!refresh)return NextResponse.json({...JSON.parse(cached.payload_json),sources:{},cache:{status:"cached",checkedAt:cached.checked_at,updatedAt:cached.updated_at}},{headers});
  // Incluso con refresh explícito, una comprobación válida durante las últimas 24 horas evita tráfico duplicado a la fuente.
  const checkedAt=cached?Date.parse(cached.checked_at):Number.NaN;
  if(cached&&refresh&&Number.isFinite(checkedAt)&&Date.now()-checkedAt<86_400_000)return NextResponse.json({...JSON.parse(cached.payload_json),sources:{},cache:{status:"shared",checkedAt:cached.checked_at,updatedAt:cached.updated_at}},{headers});
  try{const source=await latestPublishedAnalysisFiles("indice_de_precios_al_productor",matchers),signature=JSON.stringify({parserVersion:"3-internal",files:source.signature}),now=new Date().toISOString();
    if(cached?.source_last_modified===signature){await db.prepare("UPDATE economic_source_cache SET checked_at=? WHERE kind='ipp'").bind(now).run();return NextResponse.json({...JSON.parse(cached.payload_json),sources:source.metadata,cache:{status:"shared",checkedAt:now,updatedAt:cached.updated_at}},{headers});}
    const payload=parseIppOfficialFiles(await source.readAll());
    await db.prepare("INSERT INTO economic_source_cache(kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind("ipp",JSON.stringify(source.metadata),signature,null,null,JSON.stringify(payload),now,now).run();
    return NextResponse.json({...payload,sources:source.metadata,cache:{status:"updated",checkedAt:now,updatedAt:now}},{headers});
  }catch(error){if(cached)return NextResponse.json({...JSON.parse(cached.payload_json),sources:{},cache:{status:"stale",checkedAt:cached.checked_at,updatedAt:cached.updated_at}},{headers:{...headers,"X-Data-Warning":"stale"}});return NextResponse.json({error:error instanceof Error?error.message:"Error de datos IPP"},{status:503});}
}
