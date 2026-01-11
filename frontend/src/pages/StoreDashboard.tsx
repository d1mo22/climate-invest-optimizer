import React, { useEffect, useState, useMemo } from "react";
import {
  PageContainer,
  ProCard,
  StatisticCard,
  ProTable,
} from "@ant-design/pro-components";
import { Button, Progress, Spin, Alert, Tag, Modal, Popconfirm, List, Tooltip, Typography, message } from "antd";
import { RedoOutlined, ThunderboltOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { Gauge, Column, Pie, Area } from "@ant-design/plots";
import { shopService, riskService } from "../services";
import type { RiskAssessment, Measure, ShopWithCluster } from "../services/shopService";
import { ApiError } from "../services/apiClient";
import { API_BASE_URL, API_ENDPOINTS } from "../config/api";
import { slugify } from "../utils/slugify";
import { OptimizeBudgetModal } from "../components/OptimizeBudgetModal";
import { colors, getReadableTextColor } from "../theme/colors";

/* =========================
   Tipos
========================= */
interface StoreData {
  id: number;
  tienda: string;
  pais: string;
  inversion: number;
  roi: number;
  riesgos_totales: number;
  riesgos_resueltos: number;
  riesgos_pendientes: number;
  beneficio_anual: number;
  plan_next_year: number;
  plan_10y: number;
  totalRisk?: number;
  measures: Measure[];
  risks: RiskAssessment['risks'];
  coveredRiskIds?: number[];
}


// Riesgos de respaldo para construir dashboards cuando el backend no responde
const FALLBACK_RISKS = [
  {
    id: 1,
    name: "Inundaciones",
    exposure: "Alto",
    sensitivity: "Medio",
    consequence: "Alta",
    probability: "Probable",
  },
  {
    id: 2,
    name: "Ola de calor",
    exposure: "Medio",
    sensitivity: "Medio",
    consequence: "Media",
    probability: "Posible",
  },
  {
    id: 3,
    name: "Viento extremo",
    exposure: "Bajo",
    sensitivity: "Alto",
    consequence: "Alta",
    probability: "Posible",
  },
  {
    id: 4,
    name: "Variabilidad de precipitaciones",
    exposure: "Medio",
    sensitivity: "Medio",
    consequence: "Media",
    probability: "Probable",
  },
];

/* =========================
   Estilos
========================= */
const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
};


const pill = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color,
  fontWeight: 900,
  fontSize: 12,
});

const importanceColor = (v: string) =>
  v === "Alta" ? "#ff4d4f" : v === "Media" ? "#faad14" : "#52c41a";

const stateColor = (v: string) => (v === "Resuelto" ? "#00ff88" : "#ff4d4f");

function mapRiskType(riskName: string): string {
  if (riskName.includes("nivel del mar") || riskName.includes("Inundación")) return "Climático";
  if (riskName.includes("temperatura") || riskName.includes("calor")) return "Climático";
  if (riskName.includes("precipitaciones") || riskName.includes("lluvia")) return "Climático";
  if (riskName.includes("incendio")) return "Climático";
  if (riskName.includes("tormenta") || riskName.includes("viento")) return "Climático";
  return "Operacional";
}

function mapImportance(value: string): string {
  const v = value?.toLowerCase() || "";
  if (v.includes("high") || v.includes("alto") || v.includes("alta")) return "Alta";
  if (v.includes("low") || v.includes("bajo") || v.includes("baja")) return "Baja";
  return "Media";
}

// Carga desde CSV de respaldo cuando el backend no responde
const loadFallbackStore = async (slugOrId: string): Promise<StoreData | null> => {
  const base = (import.meta as any)?.env?.BASE_URL || "/";
  const sources = [
    `${base}data/Store_details.csv`,
    `${base}data_backup/Store_details.csv`,
    // rutas sin base por si BASE_URL ya tiene '/'
    "/data/Store_details.csv",
    "/data_backup/Store_details.csv",
  ];

  for (const src of sources) {
    try {
      const resp = await fetch(src);
      if (!resp.ok) continue;
      const text = await resp.text();
      const [headerLine, ...lines] = text.trim().split(/\r?\n/);
      const headers = headerLine.split(",").map((h) => h.trim());

      for (const line of lines) {
        if (!line.trim()) continue;
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });

        const rowSlug = row.slug || slugify(row.tienda || "");
        const rowId = row.id;
        if (rowSlug === slugOrId || rowId === slugOrId) {
          const inversion = parseFloat(row.inversion) || 0;
          const roi = parseFloat((row.roi || "").replace("%", "")) || 12;
          const riesgosTotales = parseInt(row.riesgos_totales || "0", 10) || FALLBACK_RISKS.length;
          const riesgosResueltos = parseInt(row.riesgos_resueltos || "0", 10) || Math.floor(riesgosTotales / 2);
          const riesgosPendientes = parseInt(row.riesgos_pendientes || "0", 10) || Math.max(0, riesgosTotales - riesgosResueltos);
          const beneficioAnual = parseFloat(row.beneficio_anual || "0");
          const planNextYear = parseFloat(row.plan_next_year || "0");
          const plan10y = parseFloat(row.plan_10y || "0");

          const measures: Measure[] = [
            {
              name: "Plan base de adaptación",
              estimatedCost: inversion * 1000,
              type: "material",
            },
          ];

          const risks: RiskAssessment["risks"] = FALLBACK_RISKS.slice(0, Math.max(1, riesgosTotales)).map((r, idx) => ({
            ...r,
            id: idx + 1,
          }));

          return {
            id: parseInt(row.id, 10),
            tienda: row.tienda,
            pais: row.pais,
            inversion,
            roi,
            riesgos_totales: riesgosTotales,
            riesgos_resueltos: riesgosResueltos,
            riesgos_pendientes: riesgosPendientes,
            beneficio_anual: beneficioAnual,
            plan_next_year: planNextYear,
            plan_10y: plan10y,
            totalRisk: undefined,
            measures,
            risks,
          };
        }
      }
    } catch (err) {
      console.warn(`No se pudo leer ${src}`, err);
    }
  }

  return null;
};

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [shopMeta, setShopMeta] = useState<ShopWithCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<{ id: number; name: string } | null>(null);
  const [riskMeasuresLoading, setRiskMeasuresLoading] = useState(false);
  const [riskMeasuresError, setRiskMeasuresError] = useState<string | null>(null);
  const [riskMeasures, setRiskMeasures] = useState<Measure[]>([]);
  const [riskMeasuresCache, setRiskMeasuresCache] = useState<Record<number, Measure[]>>({});
  const [applyingMeasureName, setApplyingMeasureName] = useState<string | null>(null);
  const [removingMeasureName, setRemovingMeasureName] = useState<string | null>(null);

  const [optOpen, setOptOpen] = useState(false);

  const [protocolByRiskId, setProtocolByRiskId] = useState<Record<
    number,
    { fileName: string; sentAt: number }
  >>({});

  const protocolStorageKey = useMemo(() => {
    const shopId = storeData?.id;
    if (!Number.isFinite(shopId) || (shopId ?? -1) <= 0) return null;
    return `protocols:shop:${shopId}`;
  }, [storeData?.id]);

  useEffect(() => {
    if (!protocolStorageKey) {
      setProtocolByRiskId({});
      return;
    }

    try {
      const raw = localStorage.getItem(protocolStorageKey);
      if (!raw) {
        setProtocolByRiskId({});
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setProtocolByRiskId(parsed);
      } else {
        setProtocolByRiskId({});
      }
    } catch {
      setProtocolByRiskId({});
    }
  }, [protocolStorageKey]);

  const saveProtocolState = (next: Record<number, { fileName: string; sentAt: number }>) => {
    setProtocolByRiskId(next);
    if (!protocolStorageKey) return;
    try {
      localStorage.setItem(protocolStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const pickAndMarkProtocol = (riskId: number, riskName: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.txt,.md";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const next = {
        ...protocolByRiskId,
        [riskId]: { fileName: file.name, sentAt: Date.now() },
      };
      saveProtocolState(next);

      message.success(`Protocolo listo para enviar: ${file.name}`);
      console.log("[UI] protocol selected", { shopId: storeData?.id, riskId, riskName, fileName: file.name });
    };
    input.click();
  };

  const riskOptions = useMemo(
    () =>
      (storeData?.risks || []).map((r) => ({
        id: r.id,
        label: r.name,
      })),
    [storeData?.risks]
  );

  useEffect(() => {
    loadStoreData();
  }, [storeSlug]);

  const loadStoreData = async () => {
    if (!storeSlug) return;

    try {
      setLoading(true);
      setError(null);

      // Parse store ID from slug
      const storeId = parseInt(storeSlug, 10);

      // 1) Intentar con el backend
      if (!isNaN(storeId)) {
        try {
          const [shop, measuresResponse, riskAssessmentResponse, riskCoverageResponse] = await Promise.all([
            shopService.getShopById(storeId),
            shopService.getShopMeasures(storeId).catch(() => []),
            shopService.getRiskAssessment(storeId).catch(() => ({ risks: [] })),
            shopService.getRiskCoverage(storeId).catch(() => null),
          ]);

          setShopMeta(shop);

          const measures = measuresResponse || [];
          const riskAssessment = riskAssessmentResponse || { risks: [] };
          const risks = riskAssessment.risks || [];
          const country = shop.country || "Unknown";

          const coveredRiskIds = riskCoverageResponse?.risks
            ? riskCoverageResponse.risks.filter((r) => r.is_covered).map((r) => r.risk_id)
            : undefined;

          // Datos coherentes: si existe risk-coverage, usamos sus contadores (fuente de verdad).
          // Si no, fallback determinista: total = riesgos disponibles; resueltos = min(total, #medidas aplicadas).
          const usedRisks = risks.length ? risks : FALLBACK_RISKS;
          const totalRisks = riskCoverageResponse?.total_risks ?? usedRisks.length;
          const resolvedRisks = riskCoverageResponse?.covered_risks ?? Math.min(totalRisks, measures.length);
          const pendingRisks = riskCoverageResponse?.uncovered_risks ?? Math.max(0, totalRisks - resolvedRisks);

          const investment = measures.reduce(
            (sum, m) => sum + (m.estimatedCost || 0),
            0
          );
          // ROI determinista basado en riesgo total (evita números "bailando")
          const baseRisk = shop.totalRisk ?? 0;
          const roi = Number((Math.max(3, (1 - Math.min(1, baseRisk)) * 12)).toFixed(1));
          const annualBenefit = investment * (roi / 100);

          setStoreData({
            id: shop.id,
            tienda: shop.location,
            pais: country,
            inversion: investment / 1000,
            roi,
            riesgos_totales: totalRisks,
            riesgos_resueltos: resolvedRisks,
            riesgos_pendientes: pendingRisks,
            beneficio_anual: annualBenefit / 1000,
            plan_next_year: investment * 0.4 / 1000,
            plan_10y: investment * 3.5 / 1000,
            totalRisk: shop.totalRisk,
            measures,
            risks: usedRisks,
            coveredRiskIds,
          });
          setLoading(false);
          return;
        } catch (apiErr) {
          console.warn("API de tiendas falló, usando CSV de respaldo", apiErr);
        }
      }

      // 2) Fallback a CSV público
      const fallback = await loadFallbackStore(storeSlug);
      if (!fallback) {
        // Último recurso: datos sintéticos para no dejar pantalla vacía
        const totalRisks = FALLBACK_RISKS.length;
        const dummy = {
          id: Number.isNaN(storeId) ? -1 : storeId,
          tienda: `Tienda ${storeSlug}`,
          pais: "Desconocido",
          inversion: 1,
          roi: 12,
          riesgos_totales: totalRisks,
          riesgos_resueltos: 0,
          riesgos_pendientes: totalRisks,
          beneficio_anual: 0.2,
          plan_next_year: 0.3,
          plan_10y: 2,
          totalRisk: undefined,
          measures: [],
          risks: FALLBACK_RISKS,
        } as StoreData;
        setStoreData(dummy);
        setShopMeta(null);
        return;
      }
      setStoreData(fallback);
      setShopMeta(null);
    } catch (err) {
      console.error("Error loading store data:", err);
      setError(err instanceof Error ? err.message : "Error cargando datos de la tienda");
    } finally {
      setLoading(false);
    }
  };

  const openRiskMeasuresModal = async (risk: { id: number; descripcion: string }) => {
    if (!storeData) return;

    setSelectedRisk({ id: risk.id, name: risk.descripcion });
    setRiskModalOpen(true);
    setRiskMeasuresError(null);

    if (!Number.isFinite(risk.id)) {
      setRiskMeasures([]);
      setRiskMeasuresError("ID de riesgo inválido");
      return;
    }

    const cached = riskMeasuresCache[risk.id];
    if (cached) {
      setRiskMeasures(cached);
      return;
    }

    try {
      setRiskMeasuresLoading(true);
      const measures = await riskService.getRiskMeasures(risk.id);
      const safeMeasures = Array.isArray(measures) ? measures : [];
      setRiskMeasures(safeMeasures);
      setRiskMeasuresCache((prev) => ({ ...prev, [risk.id]: safeMeasures }));
    } catch (e) {
      console.warn("No se pudieron cargar medidas por riesgo", e);
      setRiskMeasures([]);
      setRiskMeasuresError("No se pudieron cargar medidas para este riesgo (API)");
    } finally {
      setRiskMeasuresLoading(false);
    }
  };

  const applyMeasureFromModal = async (m: Measure) => {
    if (!storeData) return;

    const alreadyApplied = !!storeData.measures?.some((am) => am.name === m.name);
    if (alreadyApplied) return;

    try {
      setApplyingMeasureName(m.name);
      await shopService.applyMeasure(storeData.id, m.name);

      // Refrescar medidas aplicadas y cobertura desde backend (fuente de verdad)
      const [updatedMeasures, updatedCoverage] = await Promise.all([
        shopService.getShopMeasures(storeData.id).catch(() => {
        // Si falla, al menos reflejamos localmente el cambio
        return [...(storeData.measures || []), m];
        }),
        shopService.getRiskCoverage(storeData.id).catch(() => null),
      ]);

      setStoreData((prev) => {
        if (!prev) return prev;

        const measures = updatedMeasures || [];
        const investment = measures.reduce((sum, mm) => sum + (mm.estimatedCost || 0), 0);

        const totalRisks = updatedCoverage?.total_risks ?? prev.riesgos_totales;
        const resolvedRisks = updatedCoverage?.covered_risks ?? Math.min(totalRisks, measures.length);
        const pendingRisks = updatedCoverage?.uncovered_risks ?? Math.max(0, totalRisks - resolvedRisks);

        const coveredRiskIds = updatedCoverage?.risks
          ? updatedCoverage.risks.filter((r) => r.is_covered).map((r) => r.risk_id)
          : prev.coveredRiskIds;

        const roi = prev.roi; // mantener estable (evitar cambios aleatorios)
        const annualBenefit = investment * (roi / 100);

        return {
          ...prev,
          measures,
          inversion: investment / 1000,
          beneficio_anual: annualBenefit / 1000,
          plan_next_year: (investment * 0.4) / 1000,
          plan_10y: (investment * 3.5) / 1000,
          riesgos_resueltos: resolvedRisks,
          riesgos_pendientes: pendingRisks,
          riesgos_totales: totalRisks,
          coveredRiskIds,
        };
      });

      message.success(`Medida aplicada: ${m.name}`);
    } catch (e) {
      console.error("Error aplicando medida", e);
      if (e instanceof ApiError) {
        message.error(`No se pudo aplicar la medida (${e.status}): ${e.message}`);
      } else {
        message.error("No se pudo aplicar la medida");
      }
    } finally {
      setApplyingMeasureName(null);
    }
  };

  const removeMeasureFromStore = async (m: Measure) => {
    if (!storeData) return;

    console.log("[UI] removeMeasureFromStore(start)", { shopId: storeData.id, measure: m.name });

    const isApplied = !!storeData.measures?.some((am) => am.name === m.name);
    if (!isApplied) return;

    // Si estamos en modo fallback (sin backend real), solo reflejamos localmente.
    const canCallApi = Number.isFinite(storeData.id) && storeData.id > 0;

    try {
      setRemovingMeasureName(m.name);

      if (canCallApi) {
        console.log("[UI] removeMeasureFromStore(api)", { shopId: storeData.id, measure: m.name });
        await shopService.removeMeasure(storeData.id, m.name);
      }

      const [updatedMeasures, updatedCoverage] = await Promise.all([
        canCallApi
          ? shopService.getShopMeasures(storeData.id).catch(() => {
              return (storeData.measures || []).filter((mm) => mm.name !== m.name);
            })
          : Promise.resolve((storeData.measures || []).filter((mm) => mm.name !== m.name)),
        canCallApi ? shopService.getRiskCoverage(storeData.id).catch(() => null) : Promise.resolve(null),
      ]);

      setStoreData((prev) => {
        if (!prev) return prev;

        const measures = updatedMeasures || [];
        const investment = measures.reduce((sum, mm) => sum + (mm.estimatedCost || 0), 0);

        const totalRisks = updatedCoverage?.total_risks ?? prev.riesgos_totales;
        const resolvedRisks = updatedCoverage?.covered_risks ?? Math.min(totalRisks, measures.length);
        const pendingRisks = updatedCoverage?.uncovered_risks ?? Math.max(0, totalRisks - resolvedRisks);

        const coveredRiskIds = updatedCoverage?.risks
          ? updatedCoverage.risks.filter((r) => r.is_covered).map((r) => r.risk_id)
          : prev.coveredRiskIds;

        const roi = prev.roi;
        const annualBenefit = investment * (roi / 100);

        return {
          ...prev,
          measures,
          inversion: investment / 1000,
          beneficio_anual: annualBenefit / 1000,
          plan_next_year: (investment * 0.4) / 1000,
          plan_10y: (investment * 3.5) / 1000,
          riesgos_resueltos: resolvedRisks,
          riesgos_pendientes: pendingRisks,
          riesgos_totales: totalRisks,
          coveredRiskIds,
        };
      });

      message.success(`Medida eliminada: ${m.name}`);
    } catch (e) {
      console.error("Error eliminando medida", e);
      if (e instanceof ApiError) {
        message.error(`No se pudo eliminar la medida (${e.status}): ${e.message}`);
      } else {
        message.error("No se pudo eliminar la medida");
      }
    } finally {
      setRemovingMeasureName(null);
    }
  };

  const parsed = useMemo(() => {
    if (!storeData) return null;

    const percentRiesgos =
      storeData.riesgos_totales > 0
        ? storeData.riesgos_resueltos / storeData.riesgos_totales
        : 0;

    return {
      inversion: storeData.inversion,
      roi: storeData.roi.toFixed(1),
      riesgosTotales: storeData.riesgos_totales,
      riesgosResueltos: storeData.riesgos_resueltos,
      riesgosPendientes: storeData.riesgos_pendientes,
      percentRiesgos,
      beneficioAnual: storeData.beneficio_anual,
      planNextYear: storeData.plan_next_year,
      plan10y: storeData.plan_10y,
    };
  }, [storeData]);

  const countrySlug = useMemo(() => {
    if (!storeData) return "";
    return storeData.pais.toLowerCase().replace(/\s+/g, "-");
  }, [storeData]);

  const gaugeConfig = useMemo(() => {
    const percent = parsed?.percentRiesgos ?? 0;
    return {
      percent,
      innerRadius: 0.9,
      range: { color: ["#00ff88", "#2b2b2b"] },
      indicator: undefined,
      statistic: {
        content: {
          formatter: () => `${(percent * 100).toFixed(1)}%`,
          style: { fontSize: "18px", color: "#fff", fontWeight: 800 },
        },
      },
    };
  }, [parsed?.percentRiesgos]);

  const columnConfig = useMemo(() => {
    return {
      appendPadding: [24, 8, 8, 8],
      data: [
        { tipo: "Resueltos", valor: parsed?.riesgosResueltos ?? 0 },
        { tipo: "Pendientes", valor: parsed?.riesgosPendientes ?? 0 },
      ],
      xField: "tipo",
      yField: "valor",
      seriesField: "tipo",
      color: ({ tipo }: any) => (tipo === "Resueltos" ? "#00ff88" : "#ff4d4f"),
      label: {
        position: "top" as const,
        offset: 8,
        style: { fill: "#fff", fontSize: 14, fontWeight: 800 },
      },
      legend: { position: "bottom" as const },
      yAxis: { min: 0, nice: true },
    };
  }, [parsed?.riesgosResueltos, parsed?.riesgosPendientes]);

  const riskTypeConfig = useMemo(() => {
    if (!storeData?.risks) {
      return {
        data: [],
        angleField: "cantidad",
        colorField: "tipo",
        radius: 0.9,
        innerRadius: 0.6,
        label: {
          type: "spider" as const,
          formatter: (datum: any) => `${datum.tipo}: ${datum.cantidad}`,
          style: { fill: "#fff" },
        },
        legend: { position: "bottom" as const },
      };
    }

    const riskTypeData = storeData.risks.reduce((acc, risk) => {
      const tipo = mapRiskType(risk.name);
      const existing = acc.find((item) => item.tipo === tipo);
      if (existing) {
        existing.cantidad += 1;
      } else {
        acc.push({ tipo, cantidad: 1 });
      }
      return acc;
    }, [] as Array<{ tipo: string; cantidad: number }>);

    return {
      data: riskTypeData,
      angleField: "cantidad",
      colorField: "tipo",
      radius: 0.9,
      innerRadius: 0.6,
      label: {
        type: "spider" as const,
        formatter: (datum: any) => `${datum.tipo}: ${datum.cantidad}`,
        style: { fill: "#fff" },
      },
      legend: { position: "bottom" as const },
    };
  }, [storeData?.risks]);

  const areaConfig = useMemo(() => {
    if (!parsed) {
      return {
        data: [],
        xField: "year",
        yField: "valor",
        seriesField: "tipo",
        color: ["#4B6BFD", "#00ff88"],
        smooth: true,
        legend: { position: "top" as const },
      };
    }

    const years = Array.from({ length: 10 }, (_, i) => 2026 + i);
    const areaData = years.flatMap((year, i) => {
      const factor = 1 + i * 0.15;
      return [
        {
          year: String(year),
          tipo: "Inversión",
          valor: (parsed.plan10y / 10) * (1 - i / years.length),
        },
        {
          year: String(year),
          tipo: "Beneficio",
          valor: parsed.beneficioAnual * factor,
        },
      ];
    });

    return {
      data: areaData,
      xField: "year",
      yField: "valor",
      seriesField: "tipo",
      color: ["#4B6BFD", "#00ff88"],
      smooth: true,
      legend: { position: "top" as const },
    };
  }, [parsed?.inversion, parsed?.beneficioAnual]);

  const tableData = useMemo(() => {
    if (!storeData) return [];

    const covered = new Set<number>(storeData.coveredRiskIds || []);
    return storeData.risks.map((risk, index) => ({
      key: index,
      id: risk.id,
      tipo: mapRiskType(risk.name),
      descripcion: risk.name,
      // Si tenemos coverage por ID, lo usamos. Si no, fallback determinista por índice.
      estado: covered.size ? (covered.has(risk.id) ? "Resuelto" : "Pendiente") : (index < storeData.riesgos_resueltos ? "Resuelto" : "Pendiente"),
      importancia: mapImportance(risk.consequence),
      tiendas_afectadas: 1,
    }));
  }, [storeData]);

  const pendingRisks = useMemo(() => {
    return tableData.filter((r) => r.estado === "Pendiente");
  }, [tableData]);

  if (loading) {
    return (
      <PageContainer title="Cargando...">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (error || !storeData || !parsed) {
    return (
      <PageContainer title="Dashboard de Tienda">
        <Alert
          message="Error"
          description={error || "No se pudo cargar la información de la tienda"}
          type="error"
          showIcon
        />
        <Button
          type="primary"
          onClick={() => navigate("/dashboards")}
          style={{ marginTop: 16 }}
        >
          Volver al Dashboard
        </Button>
      </PageContainer>
    );
  }

  const riskColumns: any[] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 120,
      render: (text: string) => (
        <Tag color="blue" style={{ fontWeight: 800 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      ellipsis: true,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 100,
      render: (val: string) => (
        <span style={{ ...pill(stateColor(val)) }}>{val}</span>
      ),
    },
    {
      title: "Importancia",
      dataIndex: "importancia",
      key: "importancia",
      width: 100,
      render: (val: string) => (
        <span style={{ ...pill(importanceColor(val)) }}>{val}</span>
      ),
    },
    {
      title: "Ver",
      key: "actions",
      width: 280,
      valueType: "option" as const,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="small" type="primary" onClick={() => openRiskMeasuresModal(record)}>
            Ver
          </Button>
          {(() => {
            const riskId = Number(record.id);
            const p = protocolByRiskId?.[riskId];
            const tooltip = p
              ? `Último protocolo: ${p.fileName} · ${new Date(p.sentAt).toLocaleString("es-ES")}`
              : "Selecciona un archivo (no se envía todavía; solo UI)";

            return (
              <>
                <Tooltip title={tooltip} placement="top">
                  <Button
                    size="small"
                    icon={p ? <RedoOutlined /> : <UploadOutlined />}
                    onClick={() => pickAndMarkProtocol(riskId, String(record.descripcion))}
                  >
                    {p ? "Reenviar" : "Enviar protocolo"}
                  </Button>
                </Tooltip>
                {p ? (
                  <Tag
                    color={colors.primary.green}
                    style={{
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 900,
                      color: getReadableTextColor(colors.primary.green),
                      borderColor: "transparent",
                    }}
                    title={p.fileName}
                  >
                    {p.fileName}
                  </Tag>
                ) : null}
              </>
            );
          })()}
        </div>
      ),
    },
  ];

  const measureColumns: any[] = [
    {
      title: "Medida",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 800, color: "#fff" }}>{text}</span>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (text: string) => {
        const typeColors: Record<string, string> = {
          natural: "#00ff88",
          material: "#4B6BFD",
          inmaterial: "#FDB022",
        };
        const bg = typeColors[text] || "#3f3f46";
        const fg = getReadableTextColor(bg);
        return (
          <Tag
            color={bg}
            style={{
              fontWeight: 900,
              color: fg,
              borderColor: "transparent",
            }}
          >
            {text}
          </Tag>
        );
      },
    },
    {
      title: "Coste Estimado",
      dataIndex: "estimatedCost",
      key: "cost",
      width: 140,
      render: (val: number) => (
        <span style={{ color: colors.primary.green, fontWeight: 900 }}>
          {val?.toLocaleString("es-ES")} €
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      valueType: "option" as const,
      render: (_: any, record: Measure) => (
        <Popconfirm
          title="Eliminar medida"
          description={`¿Seguro que quieres eliminar la medida "${record.name}" de esta tienda?`}
          okText="Eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            if (!Number.isFinite(storeData?.id) || (storeData?.id ?? -1) <= 0) {
              message.warning("Modo offline: no se puede eliminar sin API");
              return;
            }

            console.log("[UI] delete confirmed", { shopId: storeData.id, measure: record.name });
            removeMeasureFromStore(record);
          }}
        >
          <Button
            danger
            size="small"
            loading={removingMeasureName === record.name}
            onClick={() => {
              if (!Number.isFinite(storeData?.id) || (storeData?.id ?? -1) <= 0) {
                message.warning("Modo offline: no se puede eliminar sin API");
                return;
              }

              const encodedMeasure = encodeURIComponent(record.name).replace(/%2F/gi, "/");
              const endpoint = `${API_ENDPOINTS.SHOP_MEASURES(storeData.id)}/${encodedMeasure}`;

              message.info(`DELETE → ${API_BASE_URL}${endpoint}`);
              console.log("[UI] delete clicked", {
                shopId: storeData.id,
                measure: record.name,
                url: `${API_BASE_URL}${endpoint}`,
              });
            }}
          >
            Eliminar
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageContainer
      title={`Tienda: ${storeData.tienda}`}
      subTitle={storeData.pais}
      extra={[
        <Button key="back" onClick={() => navigate(`/country/${countrySlug}`)}>
          ← País
        </Button>,
        <Button
          key="opt"
          type="primary"
          icon={<ThunderboltOutlined />}
          disabled={!shopMeta || !Number.isFinite(storeData?.id) || (storeData?.id ?? -1) <= 0}
          onClick={() => setOptOpen(true)}
        >
          Optimizar
        </Button>,
        <Button key="global" onClick={() => navigate("/dashboards")}>
          Dashboard Global
        </Button>,
      ]}
    >
      <OptimizeBudgetModal
        open={optOpen}
        onClose={() => setOptOpen(false)}
        title={`Optimizar: ${storeData.tienda}`}
        shops={shopMeta ? [shopMeta] : []}
        fixedShopIds={shopMeta ? [shopMeta.id] : []}
        riskOptions={riskOptions}
        onApplied={loadStoreData}
      />

      <ProCard gutter={[16, 16]} wrap>
        {/* Summary Cards */}
        <ProCard colSpan={6} bordered style={cardStyle}>
          <StatisticCard
            statistic={{
              title: "Inversión Total",
              value: `${parsed.inversion.toFixed(1)}k €`,
              valueStyle: { color: "#00ff88", fontSize: 22, fontWeight: 900 },
            }}
          />
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <StatisticCard
            statistic={{
              title: "ROI Esperado",
              value: `${parsed.roi}%`,
              valueStyle: { color: "#4B6BFD", fontSize: 22, fontWeight: 900 },
            }}
          />
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <StatisticCard
            statistic={{
              title: "Riesgo Total",
              value: storeData.totalRisk?.toFixed(1) || "N/A",
              valueStyle: { color: "#ff4d4f", fontSize: 22, fontWeight: 900 },
            }}
          />
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <StatisticCard
            statistic={{
              title: "Beneficio Anual",
              value: `${parsed.beneficioAnual.toFixed(1)}k €`,
              valueStyle: { color: "#00ff88", fontSize: 22, fontWeight: 900 },
            }}
          />
        </ProCard>

        {/* Progress Card */}
        <ProCard colSpan={24} title="Progreso de Mitigación de Riesgos" bordered style={cardStyle}>
          <div style={{ padding: 16 }}>
            <Progress
              percent={parsed.percentRiesgos * 100}
              strokeColor="#00ff88"
              trailColor="#2b2b2b"
              format={(percent) => `${percent?.toFixed(1)}%`}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#00ff88", fontWeight: 800 }}>
                Resueltos: {parsed.riesgosResueltos}
              </span>
              <span style={{ color: "#ff4d4f", fontWeight: 800 }}>
                Pendientes: {parsed.riesgosPendientes}
              </span>
              <span style={{ color: "#999", fontWeight: 800 }}>
                Total: {parsed.riesgosTotales}
              </span>
            </div>
          </div>
        </ProCard>

        {/* Charts */}
        <ProCard colSpan={8} title="% Riesgos Mitigados" bordered style={cardStyle}>
          <div style={{ height: 220 }}>
            <Gauge {...gaugeConfig} />
          </div>
        </ProCard>

        <ProCard colSpan={8} title="Riesgos por Estado" bordered style={cardStyle}>
          <div style={{ height: 220 }}>
            <Column {...columnConfig} />
          </div>
        </ProCard>

        <ProCard colSpan={8} title="Riesgos por Tipo" bordered style={cardStyle}>
          <div style={{ height: 220 }}>
            <Pie {...riskTypeConfig} />
          </div>
        </ProCard>

        {/* Area Chart */}
        <ProCard colSpan={24} title="Proyección 10 años" bordered style={cardStyle}>
          <div style={{ height: 280 }}>
            <Area {...areaConfig} />
          </div>
        </ProCard>

        {/* Measures Table */}
        <ProCard colSpan={24} title="Medidas Aplicadas" bordered style={cardStyle}>
          <ProTable
            columns={measureColumns}
            dataSource={storeData.measures}
            search={false}
            pagination={false}
            rowKey="name"
            style={{ background: "transparent" }}
          />
        </ProCard>

        {/* Risks Table */}
        <ProCard colSpan={24} title="Detalle de Riesgos" bordered style={cardStyle}>
          <ProTable
            columns={riskColumns}
            dataSource={tableData}
            search={false}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
            }}
            rowKey="key"
            style={{ background: "transparent" }}
          />
        </ProCard>

        {/* Pending Risks */}
        {pendingRisks.length > 0 && (
          <ProCard colSpan={24} title="⚠️ Riesgos Pendientes" bordered style={{...cardStyle, borderColor: "#ff4d4f"}}>
            <div style={{ padding: 16 }}>
              {pendingRisks.map((risk) => (
                <div
                  key={risk.key}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    background: "rgba(255,77,79,0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(255,77,79,0.3)",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#ff4d4f", marginBottom: 4 }}>
                    {risk.tipo}: {risk.descripcion}
                  </div>
                  <div style={{ fontSize: 12, color: "#999" }}>
                    Importancia: <span style={{ color: importanceColor(risk.importancia) }}>{risk.importancia}</span>
                  </div>
                </div>
              ))}
            </div>
          </ProCard>
        )}
      </ProCard>

      <Modal
        title={selectedRisk ? `Medidas para: ${selectedRisk.name}` : "Medidas recomendadas"}
        open={riskModalOpen}
        onCancel={() => {
          setRiskModalOpen(false);
          setSelectedRisk(null);
          setRiskMeasuresError(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setRiskModalOpen(false);
              setSelectedRisk(null);
              setRiskMeasuresError(null);
            }}
          >
            Cerrar
          </Button>,
        ]}
      >
        {riskMeasuresError && (
          <Alert
            type="warning"
            showIcon
            message={riskMeasuresError}
            style={{ marginBottom: 12 }}
          />
        )}

        {riskMeasuresLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <>
            <List
              dataSource={riskMeasures}
              locale={{ emptyText: "No hay medidas sugeridas para este riesgo." }}
              renderItem={(m) => {
                const applied = !!storeData?.measures?.some((am) => am.name === m.name);
                return (
                  <List.Item>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                    <List.Item.Meta
                      title={
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <Typography.Text strong>{m.name}</Typography.Text>
                          <Tag color={m.type === "natural" ? "green" : m.type === "material" ? "blue" : "gold"}>
                            {m.type}
                          </Tag>
                          {applied && <Tag color="success">Aplicada</Tag>}
                        </div>
                      }
                      description={
                        <Typography.Text type="secondary">
                          Coste estimado: {Number(m.estimatedCost || 0).toLocaleString("es-ES")} €
                        </Typography.Text>
                      }
                    />
                      </div>

                      <Button
                        type="primary"
                        disabled={applied || !storeData}
                        loading={applyingMeasureName === m.name}
                        onClick={() => applyMeasureFromModal(m)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </List.Item>
                );
              }}
            />

            {storeData?.measures?.length ? (
              <div style={{ marginTop: 12 }}>
                <Typography.Text type="secondary">
                  Nota: “Aplicada” significa que esa medida ya está aplicada en la tienda.
                </Typography.Text>
              </div>
            ) : null}
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
