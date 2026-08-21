import { NextResponse } from "next/server";
import { parseEnuscWorkbook } from "../../../lib/enusc-official-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

const KIND = "enusc", CHUNK_SIZE = 400_000;
const headers = { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" };

async function readPayload(db: D1Database, cached: Record<string, string>) {
  const pointer = JSON.parse(cached.payload_json) as { revision: string; chunks: number };
  const result = await db.prepare("SELECT payload_text FROM source_payload_chunks WHERE kind=? AND revision=? ORDER BY chunk_index").bind(KIND, pointer.revision).all<{ payload_text: string }>();
  if (result.results.length !== pointer.chunks) throw new Error("La caché ENUSC está incompleta");
  return JSON.parse(result.results.map((item) => item.payload_text).join(""));
}

async function bundledFallback(request: Request) {
  const assets = (globalThis as typeof globalThis & { __SITES_ASSETS?: Fetcher }).__SITES_ASSETS;
  if (!assets) return null;
  const response = await assets.fetch(new Request(new URL("/enusc-data.json", request.url)));
  return response.ok ? response.json() : null;
}

export async function GET(request: Request) {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS source_payload_chunks (kind TEXT NOT NULL,revision TEXT NOT NULL,chunk_index INTEGER NOT NULL,payload_text TEXT NOT NULL,PRIMARY KEY(kind,revision,chunk_index))").run();
  const cached = await db.prepare("SELECT * FROM economic_source_cache WHERE kind=?").bind(KIND).first<Record<string, string>>();
  if (cached && new URL(request.url).searchParams.get("refresh") !== "1") {
    try { return NextResponse.json(await readPayload(db, cached), { headers: { ...headers, "X-Analysis-Source": "shared-cache" } }); } catch { /* reconstruye */ }
  }
  try {
    const source = await latestPublishedAnalysisFiles("enusc", { workbook: /enusc|seguridad.*ciudadan|[.]xlsx/i });
    const signature = source.signature, now = new Date().toISOString();
    if (cached?.source_last_modified === signature) return NextResponse.json(await readPayload(db, cached), { headers });
    const files = await source.readAll(), payload = parseEnuscWorkbook(files.workbook), serialized = JSON.stringify(payload), revision = crypto.randomUUID(), chunks: string[] = [];
    for (let index = 0; index < serialized.length; index += CHUNK_SIZE) chunks.push(serialized.slice(index, index + CHUNK_SIZE));
    for (let index = 0; index < chunks.length; index++) await db.prepare("INSERT INTO source_payload_chunks(kind,revision,chunk_index,payload_text) VALUES(?,?,?,?)").bind(KIND, revision, index, chunks[index]).run();
    await db.prepare("INSERT INTO economic_source_cache(kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind(KIND, JSON.stringify(source.metadata), signature, null, String(source.metadata.workbook.size), JSON.stringify({ revision, chunks: chunks.length }), now, now).run();
    await db.prepare("DELETE FROM source_payload_chunks WHERE kind=? AND revision<>?").bind(KIND, revision).run();
    return NextResponse.json(payload, { headers });
  } catch (error) {
    console.error("[analysis-cache] enusc refresh failed", error instanceof Error ? error.message : error);
    if (cached) try { return NextResponse.json(await readPayload(db, cached), { headers: { ...headers, "X-Data-Warning": "stale" } }); } catch { /* usa respaldo */ }
    const fallback = await bundledFallback(request);
    if (fallback) return NextResponse.json(fallback, { headers: { ...headers, "X-Analysis-Source": "bundled-fallback", "X-Data-Warning": "stale" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error de datos" }, { status: 503 });
  }
}
