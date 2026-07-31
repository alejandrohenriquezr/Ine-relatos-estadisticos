import {NextResponse} from "next/server";
import {parseEneOfficialFiles} from "../../../lib/ene-official-data";

const sources={
  indicators:"https://www.ine.gob.cl/docs/default-source/ocupacion-y-desocupacion/cuadros-estadisticos/series-vigentes/indicadores_principales.xlsx",
  branches:"https://www.ine.gob.cl/docs/default-source/ocupacion-y-desocupacion/cuadros-estadisticos/series-vigentes/rama.xlsx",
  categories:"https://www.ine.gob.cl/docs/default-source/ocupacion-y-desocupacion/cuadros-estadisticos/series-vigentes/categoria.xlsx",
  absent:"https://www.ine.gob.cl/docs/default-source/ocupacion-y-desocupacion/cuadros-estadisticos/series-vigentes/ocupados_ausentes.xlsx",
} as const;

const PARSER_VERSION="3-content-hash-validation";
const MIN_XLSX_BYTES=10_000;
const MAX_ATTEMPTS=3;
const RETRY_DELAY_MS=1_500;

type SourceKey=keyof typeof sources;
type CachedRow=Record<string,string|null>;
type SeriesPoint={year:number;quarter:string;[key:string]:unknown};
type EnePayload={series?:{Total?:SeriesPoint[]};[key:string]:unknown};

type DownloadedSource={
  key:SourceKey;
  url:string;
  buffer:ArrayBuffer;
  sha256:string;
  size:number;
  lastModified:string|null;
  etag:string|null;
  contentType:string|null;
};

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

function toHex(bytes:ArrayBuffer){
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function sha256(buffer:ArrayBuffer){
  return toHex(await crypto.subtle.digest("SHA-256",buffer));
}

function assertXlsx(key:SourceKey,buffer:ArrayBuffer,contentType:string|null){
  if(buffer.byteLength<MIN_XLSX_BYTES)throw new Error(`${key}: archivo demasiado pequeño (${buffer.byteLength} bytes)`);
  const magic=new Uint8Array(buffer,0,Math.min(4,buffer.byteLength));
  const isZip=magic[0]===0x50&&magic[1]===0x4b;
  if(!isZip)throw new Error(`${key}: la respuesta no es un archivo XLSX válido`);
  if(contentType?.includes("text/html"))throw new Error(`${key}: el servidor devolvió HTML en lugar del Excel`);
}

async function downloadOnce(key:SourceKey):Promise<DownloadedSource>{
  const url=sources[key];
  const response=await fetch(url,{
    method:"GET",
    redirect:"follow",
    cache:"no-store",
    headers:{
      "user-agent":"INE-Relatos/2.0",
      "accept":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.1",
    },
  });
  if(!response.ok)throw new Error(`${key}: descarga HTTP ${response.status}`);
  const buffer=await response.arrayBuffer();
  const contentType=response.headers.get("content-type");
  assertXlsx(key,buffer,contentType);
  return {
    key,
    url,
    buffer,
    sha256:await sha256(buffer),
    size:buffer.byteLength,
    lastModified:response.headers.get("last-modified"),
    etag:response.headers.get("etag"),
    contentType,
  };
}

async function downloadWithRetry(key:SourceKey){
  let lastError:unknown;
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    try{return await downloadOnce(key);}catch(error){
      lastError=error;
      if(attempt<MAX_ATTEMPTS)await sleep(RETRY_DELAY_MS*attempt);
    }
  }
  throw lastError instanceof Error?lastError:new Error(`${key}: descarga fallida`);
}

function normalizeQuarter(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
}

const periodRank:Record<string,number>={
  "ene - mar":1,"feb - abr":2,"mar - may":3,"abr - jun":4,
  "may - jul":5,"jun - ago":6,"jul - sep":7,"ago - oct":8,
  "sep - nov":9,"oct - dic":10,"nov - ene":11,"dic - feb":12,
};

function periodValue(point:SeriesPoint){
  const rank=periodRank[normalizeQuarter(point.quarter)];
  if(!Number.isInteger(point.year)||!rank)throw new Error(`Período ENE no reconocido: ${point.year} · ${point.quarter}`);
  // Los trimestres móviles Nov-Ene y Dic-Feb se identifican por el año del mes final en el Excel.
  return point.year*12+rank;
}

function validatePayload(payload:EnePayload,cachedPayload:EnePayload|null){
  const points=payload.series?.Total;
  if(!Array.isArray(points)||points.length<12)throw new Error("La serie nacional total no contiene suficientes períodos");
  let previous=-Infinity;
  for(const point of points){
    const current=periodValue(point);
    if(current<=previous)throw new Error(`La serie ENE no está ordenada o contiene períodos duplicados en ${point.year} · ${point.quarter}`);
    previous=current;
    if(typeof point.unemploymentRate!=="number"||!Number.isFinite(point.unemploymentRate)){
      throw new Error(`Tasa de desocupación inválida en ${point.year} · ${point.quarter}`);
    }
  }
  const latest=points.at(-1)!;
  const cachedLatest=cachedPayload?.series?.Total?.at(-1);
  if(cachedLatest&&periodValue(latest)<periodValue(cachedLatest)){
    throw new Error(`La fuente retrocede desde ${cachedLatest.year} · ${cachedLatest.quarter} a ${latest.year} · ${latest.quarter}`);
  }
  return {year:latest.year,quarter:latest.quarter,periodValue:periodValue(latest),observations:points.length};
}

function publicSources(downloads:DownloadedSource[]){
  return downloads.map(({key,url,sha256,size,lastModified,etag,contentType})=>({
    key,url,sha256,size,lastModified,etag,contentType,
  }));
}

export async function GET(){
  const db=(globalThis as typeof globalThis&{__SITES_DB?:D1Database}).__SITES_DB;
  if(!db)return NextResponse.json({error:"La caché compartida aún no está disponible"},{status:503});

  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached=await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind("ene").first<CachedRow>();
  const cachedPayload=cached?.payload_json?JSON.parse(cached.payload_json) as EnePayload:null;
  const now=new Date().toISOString();

  try{
    // Se descarga el contenido real: los encabezados HTTP quedan solo como trazabilidad.
    const downloads=await Promise.all((Object.keys(sources) as SourceKey[]).map(downloadWithRetry));
    const metadata=publicSources(downloads);
    const signature=JSON.stringify({
      parserVersion:PARSER_VERSION,
      sources:metadata.map(({key,sha256,size})=>({key,sha256,size})),
    });

    if(cached?.source_etag===signature){
      await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now,"ene").run();
      const latest=validatePayload(cachedPayload??{},null);
      return NextResponse.json({
        ...cachedPayload,
        sources:metadata,
        cache:{status:"shared",checkedAt:now,updatedAt:cached.updated_at,validation:latest},
      },{headers:{"Cache-Control":"no-store"}});
    }

    const files=Object.fromEntries(downloads.map(source=>[source.key,source.buffer])) as Record<SourceKey,ArrayBuffer>;
    const payload=parseEneOfficialFiles({
      indicators:files.indicators,
      branches:files.branches,
      categories:files.categories,
      absent:files.absent,
    }) as EnePayload;
    const validation=validatePayload(payload,cachedPayload);

    // La fila se reemplaza solo después de descargar, verificar, transformar y validar todo.
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at")
      .bind(
        "ene",
        JSON.stringify(sources),
        JSON.stringify(metadata.map(({key,lastModified,etag})=>({key,lastModified,etag}))),
        signature,
        JSON.stringify(metadata.map(({key,size})=>({key,size}))),
        JSON.stringify(payload),
        now,
        now,
      ).run();

    return NextResponse.json({
      ...payload,
      sources:metadata,
      cache:{status:"updated",checkedAt:now,updatedAt:now,validation},
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Error de datos ENE";
    if(cachedPayload){
      const validation=validatePayload(cachedPayload,null);
      await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now,"ene").run();
      return NextResponse.json({
        ...cachedPayload,
        sources:cached?.source_url?JSON.parse(cached.source_url):sources,
        cache:{status:"stale",checkedAt:now,updatedAt:cached?.updated_at,validation,error:message},
      },{headers:{"Cache-Control":"no-store","X-Data-Warning":"stale","X-Data-Error":encodeURIComponent(message)}});
    }
    return NextResponse.json({error:message},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
