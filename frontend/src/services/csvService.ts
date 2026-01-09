import type { CsvRow, StoreDetailRow } from "../types";

// Cache simple en memoria para evitar requests duplicados
const cache = new Map<string, Promise<unknown[]>>();

/**
 * Fetch genérico de CSV con caché
 */
async function fetchCsvGeneric<T extends Record<string, string>>(
  url: string
): Promise<T[]> {
  if (cache.has(url)) {
    return cache.get(url) as Promise<T[]>;
  }

  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching ${url}: ${response.status}`);
    }
    const txt = await response.text();
    const [header, ...lines] = txt.trim().split(/\r?\n/);
    const cols = header.split(",").map((s) => s.trim());

    return lines
      .filter((l) => l.trim().length > 0)
      .map((line) => {
        const cells = line.split(",").map((s) => s.trim());
        const row: Record<string, string> = {};
        cols.forEach((c, i) => (row[c] = cells[i] || ""));
        return row as T;
      });
  })();

  cache.set(url, promise);
  return promise;
}

/**
 * Fetch de clusters
 */
export const fetchClusters = (): Promise<CsvRow[]> =>
  fetchCsvGeneric<CsvRow>("/data/Cluster_rows_utm_simple.csv");

/**
 * Fetch de tiendas
 */
export const fetchStores = (): Promise<CsvRow[]> =>
  fetchCsvGeneric<CsvRow>("/data/Store_rows_utm_simple.csv");

/**
 * Fetch de detalles de tiendas
 */
export const fetchStoreDetails = (): Promise<StoreDetailRow[]> =>
  fetchCsvGeneric<StoreDetailRow>("/data/Store_details.csv");

/**
 * Limpia la caché (útil para recargar datos)
 */
export const clearCache = (): void => {
  cache.clear();
};
