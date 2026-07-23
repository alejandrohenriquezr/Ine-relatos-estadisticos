import { NextRequest, NextResponse } from "next/server";
import { parseTourismWorkbook } from "../../../lib/tourism-data";

// Esta es la URL oficial válida. La variante "histó3rica" devuelve 404 en el servidor del INE.
const sourceUrl="https://www.ine.gob.cl/docs/default-source/actividad-del-turismo/cuadros-estadisticos-dos/serie-histórica-metodología-2017/series-mensuales-de-julio-2016-a-la-fecha.xlsx";
const requiredSheets=["1","2","3","4","5","6","7","8","9","10","11","16","22","25","28","31"];

type MetaRow={source_last_modified:string|null;source_etag:string|null;source_size:string|null;checked_at:string;updated_at:string;cache_key:string};

async function readCachedPayload(db:D1Database,meta:MetaRow){
  const result=await db.prepare("SELECT sheet,payload_json FROM tourism_payload_chunk_v2 WHERE cache_key=? ORDER BY CAST(sheet AS INTEGER)").bind(meta.cache_key).all<{sheet:string;payload_json:string}>();
  if(result.results.length!==requiredSheets.length)return null;
  const tables=Object.fromEntries(result.results.map(row=>[row.sheet,JSON.parse(row.payload_json)]));
  return {kind:"tourism",base:"Serie histórica desde julio de 2016",tables};
}
export async function GET(request:NextRequest){
  const db=(globalThis as typeof globalThis & {__SITES_DB?:D1Database}).__SITES_DB;
  if(!db)return NextResponse.json({error:"La caché compartida aún no está disponible"},{status:503});

  // Se fragmenta por hoja: el conjunto completo supera el límite de una celda de D1.
  await db.prepare("CREATE TABLE IF NOT EXISTS tourism_source_meta_v2 (id TEXT PRIMARY KEY, source_last_modified TEXT, source_etag TEXT, source_size TEXT, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL, cache_key TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS tourism_payload_chunk_v2 (cache_key TEXT NOT NULL, sheet TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(cache_key,sheet))").run();
  const cached=await db.prepare("SELECT * FROM tourism_source_meta_v2 WHERE id='tourism'").first<MetaRow>();
  const refresh=request.nextUrl.searchParams.get("refresh")==="1";
  if(cached&&!refresh){const payload=await readCachedPayload(db,cached);if(payload)return NextResponse.json({...payload,source:{url:sourceUrl,checkedAt:cached.checked_at,cache:"cached"}},{headers:{"Cache-Control":"no-store","Server-Timing":"data;desc=shared-cache"}});}

  try{
    const head=await fetch(sourceUrl,{method:"HEAD",redirect:"follow",headers:{"user-agent":"INE-Relatos/1.0"}});
    if(!head.ok)throw new Error("No fue posible verificar la planilla oficial");
    const lastModified=head.headers.get("last-modified"),etag=head.headers.get("etag"),size=head.headers.get("content-length"),now=new Date().toISOString();
    const unchanged=cached&&cached.source_last_modified===lastModified&&cached.source_etag===etag&&cached.source_size===size;
    if(unchanged){
      const payload=await readCachedPayload(db,cached);
      if(payload){await db.prepare("UPDATE tourism_source_meta_v2 SET checked_at=? WHERE id='tourism'").bind(now).run();return NextResponse.json({...payload,source:{url:sourceUrl,checkedAt:now,cache:"shared"}},{headers:{"Cache-Control":"no-store"}});}
    }

    const file=await fetch(sourceUrl,{headers:{"user-agent":"INE-Relatos/1.0"}});if(!file.ok)throw new Error("No fue posible descargar la planilla oficial");
    const payload=parseTourismWorkbook(await file.arrayBuffer()),cacheKey=now.replace(/[^0-9]/g,"");
    // Cada escritura permanece bajo el límite SQLITE_TOOBIG; la metadata se actualiza solo al final.
    for(const sheet of requiredSheets){await db.prepare("INSERT INTO tourism_payload_chunk_v2 (cache_key,sheet,payload_json) VALUES (?,?,?)").bind(cacheKey,sheet,JSON.stringify(payload.tables[sheet])).run();}
    await db.prepare("INSERT INTO tourism_source_meta_v2 (id,source_last_modified,source_etag,source_size,checked_at,updated_at,cache_key) VALUES ('tourism',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,checked_at=excluded.checked_at,updated_at=excluded.updated_at,cache_key=excluded.cache_key").bind(lastModified,etag,size,now,now,cacheKey).run();
    await db.prepare("DELETE FROM tourism_payload_chunk_v2 WHERE cache_key<>?").bind(cacheKey).run();
    return NextResponse.json({...payload,source:{url:sourceUrl,checkedAt:now,cache:"updated"}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(cached){const payload=await readCachedPayload(db,cached);if(payload)return NextResponse.json({...payload,source:{url:sourceUrl,checkedAt:cached.checked_at,cache:"stale"}},{headers:{"Cache-Control":"no-store","X-Data-Warning":"stale"}});}
    return NextResponse.json({error:error instanceof Error?error.message:"Error de datos"},{status:503});
  }
}
