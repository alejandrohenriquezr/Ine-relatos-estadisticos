import { NextResponse } from "next/server";
import { parseEneOfficialFiles } from "../../../lib/ene-official-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";
import bundledEneData from "../../../public/ene-data.json";

const PARSER_VERSION = "3-internal-published-files";
const matchers = {
  indicators: /indicadores?.*principales|principales.*empleo/i,
  branches: /rama/i,
  categories: /categor/i,
  absent: /ausent/i,
} as const;

export async function GET(request: Request) {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché compartida aún no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached = await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind("ene").first<Record<string, string>>();
  if (cached && new URL(request.url).searchParams.get("refresh") !== "1") return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: {}, cache: { status: "shared", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache" } });
  try {
    const source = await latestPublishedAnalysisFiles("ocupacion_y_desocupacion", matchers);
    const signature = JSON.stringify({ parserVersion: PARSER_VERSION, files: source.signature });
    const now = new Date().toISOString();
    if (cached?.source_last_modified === signature) {
      await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now, "ene").run();
      return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: source.metadata, cache: { status: "shared", checkedAt: now, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
    }
    const files = await source.readAll();
    const payload = parseEneOfficialFiles(files);
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind("ene", JSON.stringify(source.metadata), signature, null, null, JSON.stringify(payload), now, now).run();
    return NextResponse.json({ ...payload, sources: source.metadata, cache: { status: "updated", checkedAt: now, updatedAt: now } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
  } catch (error) {
    console.error("[analysis-cache] ene refresh failed", error);
    if (cached) return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: {}, cache: { status: "stale", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache", "X-Data-Warning": "stale" } });
    // La página pública nunca desaparece por una incidencia de almacenamiento:
    // usa la última instantánea verificada incluida en la aplicación y deja una
    // advertencia explícita para que la caché pueda repararse posteriormente.
    return NextResponse.json({ ...bundledEneData, sources: {}, cache: { status: "bundled-fallback", warning: error instanceof Error ? error.message : "Error de datos ENE" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "bundled-fallback", "X-Data-Warning": "source-unavailable" } });
  }
}
