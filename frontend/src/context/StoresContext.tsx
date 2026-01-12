import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { shopService, clusterService } from "../services";
import type { ShopWithCluster } from "../services/shopService";
import type { Cluster } from "../services/clusterService";

// Mapeo de nombres en inglés a español (la BD tiene los países en inglés)
const COUNTRY_EN_TO_ES: Record<string, string> = {
  "Spain": "España",
  "Germany": "Alemania",
  "France": "Francia",
  "Italy": "Italia",
  "United Kingdom": "Reino Unido",
  "Netherlands": "Países Bajos",
  "Belgium": "Bélgica",
  "Switzerland": "Suiza",
  "Austria": "Austria",
  "Poland": "Polonia",
  "Czech Republic": "Chequia",
  "Czechia": "Chequia",
  "Slovakia": "Eslovaquia",
  "Hungary": "Hungría",
  "Slovenia": "Eslovenia",
  "Croatia": "Croacia",
  "Greece": "Grecia",
  "Romania": "Rumanía",
  "Bulgaria": "Bulgaria",
  "Lithuania": "Lituania",
  "Latvia": "Letonia",
  "Estonia": "Estonia",
  "Finland": "Finlandia",
  "Sweden": "Suecia",
  "Norway": "Noruega",
  "Denmark": "Dinamarca",
  "Iceland": "Islandia",
  "Ireland": "Irlanda",
  "Portugal": "Portugal",
  "Turkey": "Turquía",
  "Ukraine": "Ucrania",
  "Belarus": "Bielorrusia",
  "Moldova": "Moldavia",
};

// Función para traducir país de inglés a español
const translateCountry = (country: string): string => {
  return COUNTRY_EN_TO_ES[country] || country;
};

export interface ParsedStore {
  id: string;
  name: string;
  utm_north: string;
  utm_east: string;
  N: number;
  E: number;
  location?: string;
  cluster_id?: number;
  totalRisk?: number;
  country?: string;
}

export interface StoreDetailRow {
  id: string;
  slug: string;
  tienda: string;
  pais: string;
  inversion: string;
  roi: string;
  riesgos_totales: string;
  riesgos_resueltos: string;
  riesgos_pendientes: string;
  beneficio_anual: string;
  plan_next_year: string;
  plan_10y: string;
}

type StoresContextType = {
  stores: ParsedStore[];
  clusters: ParsedStore[];
  storeDetails: Map<string, StoreDetailRow>;
  loading: boolean;
  error: string | null;
  refreshStores: () => Promise<void>;
};

const StoresContext = createContext<StoresContextType | null>(null);

type StoresProviderProps = {
  children: ReactNode;
};

function shopToParsedStore(shop: ShopWithCluster): ParsedStore {
  return {
    id: String(shop.id),
    name: shop.cluster?.name || `Cluster ${shop.cluster_id}`,
    utm_north: String(shop.utm_north),
    utm_east: String(shop.utm_east),
    N: shop.utm_north,
    E: shop.utm_east,
    location: shop.location,
    cluster_id: shop.cluster_id,
    totalRisk: shop.totalRisk,
    country: shop.country,
  };
}

function clusterToParsedStore(cluster: Cluster): ParsedStore {
  return {
    id: String(cluster.id),
    name: cluster.name,
    utm_north: String(cluster.utm_north),
    utm_east: String(cluster.utm_east),
    N: cluster.utm_north,
    E: cluster.utm_east,
  };
}

export function StoresProvider({ children }: StoresProviderProps) {
  const [stores, setStores] = useState<ParsedStore[]>([]);
  const [clusters, setClusters] = useState<ParsedStore[]>([]);
  const [storeDetails, setStoreDetails] = useState<Map<string, StoreDetailRow>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch shops and clusters from API
      const [shopsResponse, clustersData] = await Promise.all([
        // El backend valida page_size<=100
        shopService.getShops({ page_size: 100 }),
        clusterService.getClusters(),
      ]);

      // Convert to ParsedStore format
      const parsedStores = shopsResponse.items.map(shopToParsedStore);
      const parsedClusters = clustersData.map(clusterToParsedStore);

      setStores(parsedStores);
      setClusters(parsedClusters);

      // Create store details map (would need a proper endpoint for this)
      // For now, create basic details from shop data
      const detailsMap = new Map<string, StoreDetailRow>();
      shopsResponse.items.forEach((shop) => {
        const pais = translateCountry(shop.country || "Desconocido");
        detailsMap.set(String(shop.id), {
          id: String(shop.id),
          slug: shop.location.toLowerCase().replace(/\s+/g, "-"),
          tienda: shop.location,
          pais,
          inversion: "0",
          roi: "0",
          riesgos_totales: "0",
          riesgos_resueltos: "0",
          riesgos_pendientes: "0",
          beneficio_anual: "0",
          plan_next_year: "0",
          plan_10y: "0",
        });
      });
      setStoreDetails(detailsMap);
    } catch (e) {
      console.error("Error loading stores:", e);
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <StoresContext.Provider
      value={{ stores, clusters, storeDetails, loading, error, refreshStores: loadData }}
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
