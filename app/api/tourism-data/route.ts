import { NextResponse } from "next/server";
import { parseTourismWorkbook } from "../../../lib/tourism-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

const requiredSheets = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "16", "22", "25", "28", "31"];
type MetaRow = { source_last_modified: string; checked_at: string; updated_at: string; cache_key: string };

async function readCached(db: D1Database, meta: MetaRow) {
  const result = await db.prepare("SELECT sheet,payload_json FROM tourism_payload_chunk_v2 WHERE cache_key=? ORDER BY CAST(sheet AS INTEGER)").bind(meta.cache_key).all<{ sheet: string; payload_json: string }>();
  if (result.results.length !== requiredSheets.length) return null;
  return { kind: "tourism", base: "Serie histórica desde julio de 2016", tables: Object.fromEntries(result.results.map((row) => [row.sheet, JSON.parse(row.payload_json)])) };
}

export async function GET(request: Request) {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS tourism_source_meta_v2 (id TEXT PRIMARY KEY,source_last_modified TEXT,source_etag TEXT,source_size TEXT,checked_at TEXT NOT NULL,updated_at TEXT NOT NULL,cache_key TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS tourism_payload_chunk_v2 (cache_key TEXT NOT NULL,sheet TEXT NOT NULL,payload_json TEXT NOT NULL,PRIMARY KEY(cache_key,sheet))").run();
  const cached = await db.prepare("SELECT * FROM tourism_source_meta_v2 WHERE id='tourism'").first<MetaRow>();
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (cached && !refresh) {
    const payload = await readCached(db, cached);
    // Una lectura inmediata desde D1 es caché local; "shared" se reserva para una fuente cuya firma se acaba de confirmar.
    if (payload) return NextResponse.json({ ...payload, source: { cache: "cached" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache" } });
  }
  try {
    const source = await latestPublishedAnalysisFiles("actividad_mensual_del_turismo", { workbook: /turismo|serie.*mensual|[.]xlsx/i });
    const signature = source.signature, now = new Date().toISOString();
    if (cached?.source_last_modified === signature) {
      const payload = await readCached(db, cached);
      if (payload) return NextResponse.json({ ...payload, source: { ...source.metadata.workbook, cache: "shared" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
    }
    const files = await source.readAll(), payload = parseTourismWorkbook(files.workbook), key = now.replace(/\D/g, "");
    for (const sheet of requiredSheets) await db.prepare("INSERT INTO tourism_payload_chunk_v2(cache_key,sheet,payload_json) VALUES(?,?,?)").bind(key, sheet, JSON.stringify(payload.tables[sheet])).run();
    await db.prepare("INSERT INTO tourism_source_meta_v2(id,source_last_modified,source_etag,source_size,checked_at,updated_at,cache_key) VALUES('tourism',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_last_modified=excluded.source_last_modified,source_size=excluded.source_size,checked_at=excluded.checked_at,updated_at=excluded.updated_at,cache_key=excluded.cache_key").bind(signature, null, String(source.metadata.workbook.size), now, now, key).run();
    await db.prepare("DELETE FROM tourism_payload_chunk_v2 WHERE cache_key<>?").bind(key).run();
    return NextResponse.json({ ...payload, source: { ...source.metadata.workbook, cache: "updated" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
  } catch (error) {
    console.error("[analysis-cache] tourism refresh failed", error);
    if (cached) {
      const payload = await readCached(db, cached);
      if (payload) return NextResponse.json(payload, { headers: { "Cache-Control": "no-store", "X-Data-Warning": "stale" } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error de datos" }, { status: 503 });
  }
}
