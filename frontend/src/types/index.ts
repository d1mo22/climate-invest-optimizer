// Tipos de datos de país
export type CountryData = {
  key: number;
  pais: string;
  inversion: number;
  ROI: string;
  riesgosTotales: number;
  riesgosResueltos: number;
  riesgosPendientes: number;
  pctRiesgosResueltos: string;
  tiendasTotales: number;
  tiendasMejoradas: number;
  pctTiendasMejoradas: string;
  beneficioAnual: number;
  planNextYear: number;
  plan10y: number;
};

// Tipos CSV
export type CsvRow = {
  id: string;
  name: string;
  country: string;
  utm_north: string;
  utm_east: string;
};

export type StoreDetailRow = {
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
};

// Tipos de riesgo
export type RiskLevel = "Alta" | "Media" | "Baja";
export type RiskImpact = "Alto" | "Medio" | "Bajo";
export type RiskStatus = "Resuelto" | "Pendiente";

export type Risk = {
  id: number;
  tipo: string;
  descripcion: string;
  frecuencia: RiskLevel;
  impacto: RiskImpact;
  estado: RiskStatus;
  tiendas_afectadas: number;
};

// Coordenadas
export type Point = { x: number; y: number };
export type UTMCoord = [number, number];

// Tooltip del mapa
export type MapTooltip = {
  name: string;
  x: number;
  y: number;
} | null;

// Store con coordenadas parseadas
export type ParsedStore = CsvRow & {
  N: number;
  E: number;
};
