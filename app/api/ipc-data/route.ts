import { NextResponse } from "next/server";
import { parseIpcOfficialFiles } from "../../../lib/ipc-official-data";

const sources = {
  ipc: "https://www.ine.gob.cl/docs/default-source/%C3%ADndice-de-precios-al-consumidor/cuadros-estadisticos/base-anual-2023_100/series-de-tiempo/ipc-xls.xlsx",
  analytics: "https://www.ine.gob.cl/docs/default-source/%C3%ADndice-de-precios-al-consumidor/cuadros-estadisticos/base-anual-2023_100/series-de-tiempo/analiticos-xls.xlsx",
} as const;

type SourceKey = keyof typeof sources;

async function inspect(key: SourceKey) {
  const response = await fetch(sources[key], {
    method: "HEAD",
    redirect: "follow",
    headers: { "user-agent": "INE-Relatos/1.0" },
  });
  if (!response.ok) throw new Error(`No fue posible verificar ${key}`);
  return {
    key,
    url: sources[key],
    lastModified: response.headers.get("last-modified"),
    etag: response.headers.get("etag"),
    size: response.headers.get("content-length"),
  };
}

const updatedLabel = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(date);
};

export async function GET() {
  const db = (globalThis as typeof globalThis & { __SITES_DB?: D1Database })
    .__SITES_DB;
  if (!db)
    return NextResponse.json(
      { error: "La caché compartida aún no está disponible" },
      { status: 503 },
    );

  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS economic_source_cache (kind TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_last_modified TEXT, source_etag TEXT, source_size TEXT, payload_json TEXT NOT NULL, checked_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    )
    .run();
  const cached = await db
    .prepare("SELECT * FROM economic_source_cache WHERE kind = ?")
    .bind("ipc")
    .first<Record<string, string>>();

  try {
    const metadata = await Promise.all(
      (Object.keys(sources) as SourceKey[]).map(inspect),
    );
    const signature = JSON.stringify(
      metadata.map(({ key, lastModified, etag, size }) => ({
        key,
        lastModified,
        etag,
        size,
      })),
    );
    const now = new Date().toISOString();

    if (cached?.source_last_modified === signature) {
      await db
        .prepare(
          "UPDATE economic_source_cache SET checked_at = ? WHERE kind = ?",
        )
        .bind(now, "ipc")
        .run();
      return NextResponse.json(
        {
          ...JSON.parse(cached.payload_json),
          sources: metadata,
          cache: { status: "shared", checkedAt: now, updatedAt: cached.updated_at },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const downloads = await Promise.all(
      metadata.map(async (source) => {
        const response = await fetch(source.url, {
          headers: { "user-agent": "INE-Relatos/1.0" },
        });
        if (!response.ok)
          throw new Error(`No fue posible descargar ${source.key}`);
        return [source.key, await response.arrayBuffer()] as const;
      }),
    );
    const files = Object.fromEntries(downloads) as Record<
      SourceKey,
      ArrayBuffer
    >;
    const payload = parseIpcOfficialFiles(files);
    payload.data.updated = updatedLabel(metadata[0].lastModified);

    await db
      .prepare(
        "INSERT INTO economic_source_cache (kind,source_url,source_last_modified,source_etag,source_size,payload_json,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind) DO UPDATE SET source_url=excluded.source_url,source_last_modified=excluded.source_last_modified,source_etag=excluded.source_etag,source_size=excluded.source_size,payload_json=excluded.payload_json,checked_at=excluded.checked_at,updated_at=excluded.updated_at",
      )
      .bind(
        "ipc",
        JSON.stringify(sources),
        signature,
        null,
        null,
        JSON.stringify(payload),
        now,
        now,
      )
      .run();
    return NextResponse.json(
      {
        ...payload,
        sources: metadata,
        cache: { status: "updated", checkedAt: now, updatedAt: now },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (cached)
      return NextResponse.json(
        {
          ...JSON.parse(cached.payload_json),
          sources: JSON.parse(cached.source_url),
          cache: {
            status: "stale",
            checkedAt: cached.checked_at,
            updatedAt: cached.updated_at,
          },
        },
        {
          headers: { "Cache-Control": "no-store", "X-Data-Warning": "stale" },
        },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error de datos del IPC",
      },
      { status: 503 },
    );
  }
}
