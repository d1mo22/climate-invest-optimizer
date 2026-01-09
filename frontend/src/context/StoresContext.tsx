import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { fetchStores, fetchStoreDetails, fetchClusters } from "../services/csvService";
import type { CsvRow, StoreDetailRow, ParsedStore } from "../types";

type StoresContextType = {
  stores: ParsedStore[];
  clusters: ParsedStore[];
  storeDetails: Map<string, StoreDetailRow>;
  loading: boolean;
  error: string | null;
};

const StoresContext = createContext<StoresContextType | null>(null);

type StoresProviderProps = {
  children: ReactNode;
};

function parseRows(rows: CsvRow[]): ParsedStore[] {
  return rows
    .map((r) => ({
      ...r,
      N: parseFloat(r.utm_north),
      E: parseFloat(r.utm_east),
    }))
    .filter((r) => !Number.isNaN(r.N) && !Number.isNaN(r.E));
}

export function StoresProvider({ children }: StoresProviderProps) {
  const [stores, setStores] = useState<ParsedStore[]>([]);
  const [clusters, setClusters] = useState<ParsedStore[]>([]);
  const [storeDetails, setStoreDetails] = useState<Map<string, StoreDetailRow>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [storeRows, clusterRows, detailRows] = await Promise.all([
          fetchStores(),
          fetchClusters(),
          fetchStoreDetails(),
        ]);

        setStores(parseRows(storeRows));
        setClusters(parseRows(clusterRows));

        const detailsMap = new Map<string, StoreDetailRow>();
        detailRows.forEach((d) => detailsMap.set(String(d.id), d));
        setStoreDetails(detailsMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <StoresContext.Provider
      value={{ stores, clusters, storeDetails, loading, error }}
    >
      {children}
    </StoresContext.Provider>
  );
}

export function useStores(): StoresContextType {
  const ctx = useContext(StoresContext);
  if (!ctx) {
    throw new Error("useStores must be used within StoresProvider");
  }
  return ctx;
}
