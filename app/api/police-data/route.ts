import { NextResponse } from "next/server";
import { parsePoliceWorkbooks, POLICE_SOURCES } from "../../../lib/police-official-data";

const KIND="police", responseHeaders={"Cache-Control":"no-store"};
async function inspect(url:string){const response=await fetch(url,{method:"HEAD",redirect:"follow",headers:{"user-agent":"INE-Relatos/1.0"}});if(!response.ok)throw new Error("No fue posible verificar una planilla policial");return {url,lastModified:response.headers.get("last-modified"),etag:response.headers.get("etag"),size:response.headers.get("content-length")};}
export async function GET(){
  const db=(globalThis as typeof globalThis & {__SITES_DB?:D1Database}).__SITES_DB;
  if(!db)return NextResponse.json({error:"La caché compartida aún no está disponible"},{status:503,headers:responseHeaders});
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached=await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind(KIND).first<Record<string,string>>();
  try{
    const sources=await Promise.all([inspect(POLICE_SOURCES.carabineros),inspect(POLICE_SOURCES.pdi)]), signature=JSON.stringify(sources), now=new Date().toISOString();
    if(cached?.source_last_modified===signature){await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now,KIND).run();return NextResponse.json(JSON.parse(cached.payload_json),{headers:responseHeaders});}
    const files=await Promise.all(sources.map(async source=>{const response=await fetch(source.url,{headers:{"user-agent":"INE-Relatos/1.0"}});if(!response.ok)throw new Error("No fue posible descargar una planilla policial");return response.arrayBuffer();}));
    const payload=parsePoliceWorkbooks(files[0],files[1]);
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind(KIND,JSON.stringify(Object.values(POLICE_SOURCES)),signature,null,null,JSON.stringify(payload),now,now).run();
    return NextResponse.json(payload,{headers:responseHeaders});
  }catch(error){
    if(cached)return NextResponse.json(JSON.parse(cached.payload_json),{headers:{...responseHeaders,"X-Data-Warning":"stale"}});
    return NextResponse.json({error:error instanceof Error?error.message:"Error de datos"},{status:503,headers:responseHeaders});
  }
}
