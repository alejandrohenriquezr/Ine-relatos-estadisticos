import { NextResponse } from "next/server";
import { parseSupermarketsWorkbook } from "../../../lib/supermarkets-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

type Meta = { etag: string; cache_key: string; checked_at: string };
async function load(db: D1Database, key: string) {
  const result = await db.prepare("SELECT part,payload FROM supermarkets_payload_v1 WHERE cache_key=? ORDER BY part").bind(key).all<{ part: string; payload: string }>();
  if (result.results.length < 21) return null;
  const rows = Object.fromEntries(result.results.map((row) => [row.part, JSON.parse(row.payload)]));
  return { ...rows.meta, indexByTerritory: Object.fromEntries(Object.entries(rows).filter(([key]) => key.startsWith("index:")).map(([key, value]) => [key.slice(6), value])), matrices: Object.fromEntries(Object.entries(rows).filter(([key]) => key.startsWith("matrix:")).map(([key, value]) => [key.slice(7), value])) };
}

export async function GET(request: Request) {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS supermarkets_meta_v1 (id TEXT PRIMARY KEY,etag TEXT,last_modified TEXT,size TEXT,cache_key TEXT,checked_at TEXT,updated_at TEXT)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS supermarkets_payload_v1 (cache_key TEXT,part TEXT,payload TEXT,PRIMARY KEY(cache_key,part))").run();
  const cached = await db.prepare("SELECT * FROM supermarkets_meta_v1 WHERE id='supermarkets'").first<Meta>();
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (cached && !refresh) {
    const payload = await load(db, cached.cache_key);
    // Una lectura inmediata desde D1 es caché local; "shared" se reserva para una fuente cuya firma se acaba de confirmar.
    if (payload) return NextResponse.json({ ...payload, source: { cache: "cached" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache" } });
  }
  try {
    const source = await latestPublishedAnalysisFiles("ventas_mensuales_de_supermercados", { workbook: /supermercado|serie.*mensual|[.]xls/i });
    const signature = source.signature, now = new Date().toISOString();
    if (cached?.etag === signature) {
      const payload = await load(db, cached.cache_key);
      if (payload) return NextResponse.json({ ...payload, source: { ...source.metadata.workbook, cache: "shared" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
    }
    const files = await source.readAll(), payload = parseSupermarketsWorkbook(files.workbook), key = now.replace(/\D/g, ""), parts: Record<string, unknown> = { meta: { kind: payload.kind, base: payload.base, territories: payload.territories } };
    for (const [name, value] of Object.entries(payload.indexByTerritory)) parts[`index:${name}`] = value;
    for (const [name, value] of Object.entries(payload.matrices)) parts[`matrix:${name}`] = value;
    for (const [name, value] of Object.entries(parts)) await db.prepare("INSERT INTO supermarkets_payload_v1(cache_key,part,payload) VALUES(?,?,?)").bind(key, name, JSON.stringify(value)).run();
    await db.prepare("INSERT INTO supermarkets_meta_v1 VALUES('supermarkets',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET etag=excluded.etag,size=excluded.size,cache_key=excluded.cache_key,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind(signature, null, String(source.metadata.workbook.size), key, now, now).run();
    await db.prepare("DELETE FROM supermarkets_payload_v1 WHERE cache_key<>?").bind(key).run();
    return NextResponse.json({ ...payload, source: { ...source.metadata.workbook, cache: "updated" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
  } catch (error) {
    console.error("[analysis-cache] supermarkets refresh failed", error);
    if (cached) {
      const payload = await load(db, cached.cache_key);
      if (payload) return NextResponse.json(payload, { headers: { "Cache-Control": "no-store", "X-Data-Warning": "stale" } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error de datos" }, { status: 503 });
  }
}
