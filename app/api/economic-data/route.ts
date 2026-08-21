import { NextRequest, NextResponse } from "next/server";
import { parseEconomicWorkbook, type EconomicKind } from "../../../lib/economic-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

const operations: Record<EconomicKind, string> = {
  energy: "produccion_de_electricidad_gas_y_agua",
  industry: "indice_de_produccion_industrial",
  permits: "permisos_de_edificacion",
  commerce: "actividad_mensual_del_comercio",
};

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") as EconomicKind;
  if (!operations[kind]) return NextResponse.json({ error: "Tema inválido" }, { status: 400 });
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché compartida aún no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached = await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind(kind).first<Record<string, string>>();
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  // Una lectura inmediata desde D1 es caché local; "shared" se reserva para una fuente cuya firma se acaba de confirmar.
  if (cached && !refresh) return NextResponse.json({ ...JSON.parse(cached.payload_json), source: { cache: "cached", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache" } });
  try {
    const source = await latestPublishedAnalysisFiles(operations[kind], { workbook: /serie|hist[oó]ric|empalmad|mensual|[.]xls/i });
    const signature = JSON.stringify({ parserVersion: "2-internal-published-files", files: source.signature });
    const now = new Date().toISOString();
    if (cached?.source_last_modified === signature) {
      await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now, kind).run();
      return NextResponse.json({ ...JSON.parse(cached.payload_json), source: { ...source.metadata.workbook, cache: "shared", checkedAt: now } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
    }
    const files = await source.readAll();
    const payload = parseEconomicWorkbook(files.workbook, kind);
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind(kind, JSON.stringify(source.metadata), signature, null, String(source.metadata.workbook.size), JSON.stringify(payload), now, now).run();
    return NextResponse.json({ ...payload, source: { ...source.metadata.workbook, cache: "updated", checkedAt: now } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
  } catch (error) {
    console.error(`[analysis-cache] ${kind} refresh failed`, error);
    if (cached) return NextResponse.json({ ...JSON.parse(cached.payload_json), source: { cache: "stale", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache", "X-Data-Warning": "stale" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error de datos" }, { status: 503 });
  }
}
