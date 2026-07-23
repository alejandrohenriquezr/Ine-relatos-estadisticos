import { NextResponse } from "next/server";
import { ENUSC_OFFICIAL_SOURCE, parseEnuscWorkbook } from "../../../lib/enusc-official-data";

const KIND="enusc", CHUNK_SIZE=400_000;
const headers={"Cache-Control":"no-store"};
async function inspect(){
  const response=await fetch(ENUSC_OFFICIAL_SOURCE,{method:"HEAD",redirect:"follow",headers:{"user-agent":"INE-Relatos/1.0"}});
  if(!response.ok) throw new Error("No fue posible verificar la planilla ENUSC");
  return {url:ENUSC_OFFICIAL_SOURCE,lastModified:response.headers.get("last-modified"),etag:response.headers.get("etag"),size:response.headers.get("content-length")};
}
async function readPayload(db:D1Database,cached:Record<string,string>){
  const pointer=JSON.parse(cached.payload_json) as {revision:string;chunks:number};
  if(!pointer.revision) return cached.payload_json;
  const result=await db.prepare("SELECT payload_text FROM source_payload_chunks WHERE kind = ? AND revision = ? ORDER BY chunk_index").bind(KIND,pointer.revision).all<{payload_text:string}>();
  if(result.results.length!==pointer.chunks) throw new Error("La caché ENUSC está incompleta");
  return result.results.map(item=>item.payload_text).join("");
}
export async function GET(){
  const db=(globalThis as typeof globalThis & {__SITES_DB?:D1Database}).__SITES_DB;
  if(!db) return NextResponse.json({error:"La caché compartida aún no está disponible"},{status:503,headers});
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS source_payload_chunks (kind TEXT NOT NULL, revision TEXT NOT NULL, chunk_index INTEGER NOT NULL, payload_text TEXT NOT NULL, PRIMARY KEY(kind,revision,chunk_index))").run();
  const cached=await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind(KIND).first<Record<string,string>>();
  try{
    const source=await inspect(), now=new Date().toISOString();
    const unchanged=cached&&cached.source_url===source.url&&cached.source_last_modified===source.lastModified&&cached.source_etag===source.etag&&cached.source_size===source.size;
    if(unchanged){const payload=JSON.parse(await readPayload(db,cached));await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now,KIND).run();return NextResponse.json(payload,{headers});}
    const response=await fetch(source.url,{headers:{"user-agent":"INE-Relatos/1.0"}}); if(!response.ok) throw new Error("No fue posible descargar la planilla ENUSC");
    const payload=parseEnuscWorkbook(await response.arrayBuffer()), serialized=JSON.stringify(payload), revision=crypto.randomUUID(), chunks=[];
    for(let index=0;index<serialized.length;index+=CHUNK_SIZE) chunks.push(serialized.slice(index,index+CHUNK_SIZE));
    for(let index=0;index<chunks.length;index++) await db.prepare("INSERT INTO source_payload_chunks (kind,revision,chunk_index,payload_text) VALUES (?,?,?,?)").bind(KIND,revision,index,chunks[index]).run();
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind(KIND,source.url,source.lastModified,source.etag,source.size,JSON.stringify({revision,chunks:chunks.length}),now,now).run();
    await db.prepare("DELETE FROM source_payload_chunks WHERE kind = ? AND revision <> ?").bind(KIND,revision).run();
    return NextResponse.json(payload,{headers});
  }catch(error){
    if(cached) try{return NextResponse.json(JSON.parse(await readPayload(db,cached)),{headers:{...headers,"X-Data-Warning":"stale"}});}catch{}
    return NextResponse.json({error:error instanceof Error?error.message:"Error de datos"},{status:503,headers});
  }
}
