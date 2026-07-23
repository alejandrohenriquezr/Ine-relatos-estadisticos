export type PrefetchKey = "commerce" | "tourism" | "supermarkets";
const endpoints: Record<PrefetchKey, string> = {
  commerce: "/api/economic-data?kind=commerce",
  tourism: "/api/tourism-data",
  supermarkets: "/api/supermarkets-data",
};
const values = new Map<PrefetchKey, unknown>(),
  pending = new Map<PrefetchKey, Promise<unknown>>();

async function request(url: string) {
  const response = await fetch(url, { cache: "no-store" }),
    payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "No fue posible cargar los datos");
  return payload;
}
export function peekDataset<T = unknown>(key: PrefetchKey): T | undefined {
  return values.get(key) as T | undefined;
}
export function primeDataset<T = unknown>(key: PrefetchKey): Promise<T> {
  const existing = values.get(key);
  if (existing) return Promise.resolve(existing as T);
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const promise = request(endpoints[key])
    .then((payload) => {
      values.set(key, payload);
      pending.delete(key);
      return payload;
    })
    .catch((error) => {
      pending.delete(key);
      throw error;
    });
  pending.set(key, promise);
  return promise as Promise<T>;
}
export async function refreshDataset<T = unknown>(
  key: PrefetchKey,
): Promise<T | undefined> {
  const separator = endpoints[key].includes("?") ? "&" : "?",
    payload = await request(`${endpoints[key]}${separator}refresh=1`);
  if (payload.source?.cache === "updated") {
    values.set(key, payload);
    return payload as T;
  }
  return undefined;
}
