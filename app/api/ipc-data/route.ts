import { NextResponse } from "next/server";
import { parseIpcOfficialFiles } from "../../../lib/ipc-official-data";
import { latestPublishedAnalysisFiles } from "../../../lib/published-analysis-files";

// El relato combina el cuadro general con el cuadro analítico. Ambos forman
// parte de la misma firma de caché: si se publica una nueva versión de uno de
// ellos, se vuelve a procesar el conjunto antes de mostrar datos actualizados.
const matchers = {
  ipc: /^(?!.*anal[ií]tic).*(?:(?:^|\W)ipc(?:\W|$)|índice.*precios.*consumidor)/i,
  analytics: /anal[ií]tic/i,
} as const;
const updatedLabel = (value: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" }).format(new Date(value));

export async function GET(request: Request) {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB;
  if (!db) return NextResponse.json({ error: "La caché compartida aún no está disponible" }, { status: 503 });
  await db.prepare("CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const cached = await db.prepare("SELECT * FROM economic_source_cache WHERE kind = ?").bind("ipc").first<Record<string, string>>();
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (cached && !refresh) return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: {}, cache: { status: "shared", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache" } });
  if (!cached && !refresh) {
    const assets = (globalThis as typeof globalThis & { __SITES_ASSETS?: Fetcher }).__SITES_ASSETS;
    if (assets) {
      const [dataResponse, analyticsResponse] = await Promise.all([
        assets.fetch(new Request(new URL("/ipc-data.json", request.url))),
        assets.fetch(new Request(new URL("/ipc-analytics.json", request.url))),
      ]);
      if (dataResponse.ok && analyticsResponse.ok) return NextResponse.json({ data: await dataResponse.json(), analytics: await analyticsResponse.json(), sources: {}, cache: { status: "bootstrap" } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "bundled-fallback", "X-Data-Warning": "refreshing" } });
    }
  }
  try {
    const source = await latestPublishedAnalysisFiles("indice_de_precios_al_consumidor", matchers);
    const signature = JSON.stringify({ parserVersion: "2-internal-published-files", files: source.signature });
    const now = new Date().toISOString();
    if (cached?.source_last_modified === signature) {
      await db.prepare("UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?").bind(now, "ipc").run();
      return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: source.metadata, cache: { status: "shared", checkedAt: now, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
    }
    const payload = parseIpcOfficialFiles(await source.readAll());
    if (!payload.analytics.series.length) {
      const assets = (globalThis as typeof globalThis & { __SITES_ASSETS?: Fetcher }).__SITES_ASSETS;
      const response = assets && await assets.fetch(new Request(new URL("/ipc-analytics.json", request.url)));
      if (response?.ok) payload.analytics = await response.json() as typeof payload.analytics;
    }
    payload.data.updated = updatedLabel(source.metadata.ipc.scheduledAt);
    await db.prepare("INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at").bind("ipc", JSON.stringify(source.metadata), signature, null, null, JSON.stringify(payload), now, now).run();
    return NextResponse.json({ ...payload, sources: source.metadata, cache: { status: "updated", checkedAt: now, updatedAt: now } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "internal-published" } });
  } catch (error) {
    console.error("[analysis-cache] ipc refresh failed", error);
    if (cached) return NextResponse.json({ ...JSON.parse(cached.payload_json), sources: {}, cache: { status: "stale", checkedAt: cached.checked_at, updatedAt: cached.updated_at } }, { headers: { "Cache-Control": "no-store", "X-Analysis-Source": "shared-cache", "X-Data-Warning": "stale" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error de datos del IPC" }, { status: 503 });
  }
}
