import { useEffect, useMemo, useState } from "react";
import {
  PageContainer,
  ProCard,
  ProTable,
} from "@ant-design/pro-components";
import { Button, Progress, Spin, Alert } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { Gauge, Column, Pie, Area } from "@ant-design/plots";
import { shopService, clusterService, dashboardService } from "../services";
import type { ShopWithCluster } from "../services/shopService";
import { computeSuggestedInvestment } from "../utils/suggestedInvestment";
import { OptimizeBudgetModal } from "../components/OptimizeBudgetModal";

/* =========================
   Alias slug -> nombre país
========================= */
const ALIAS: Record<string, string> = {
  // Slugs en inglés (para URLs limpias)
  spain: "España",
  germany: "Alemania",
  france: "Francia",
  italy: "Italia",
  "united-kingdom": "Reino Unido",
  netherlands: "Países Bajos",
  belgium: "Bélgica",
  switzerland: "Suiza",
  austria: "Austria",
  poland: "Polonia",
  czechia: "Chequia",
  "czech-republic": "Chequia",
  slovakia: "Eslovaquia",
  hungary: "Hungría",
  slovenia: "Eslovenia",
  croatia: "Croacia",
  greece: "Grecia",
  romania: "Rumanía",
  bulgaria: "Bulgaria",
  lithuania: "Lituania",
  latvia: "Letonia",
  estonia: "Estonia",
  finland: "Finlandia",
  sweden: "Suecia",
  norway: "Noruega",
  iceland: "Islandia",
  ireland: "Irlanda",
  andorra: "Andorra",
  monaco: "Mónaco",
  "san-marino": "San Marino",
  liechtenstein: "Liechtenstein",
  luxembourg: "Luxemburgo",
  malta: "Malta",
  cyprus: "Chipre",
  albania: "Albania",
  serbia: "Serbia",
  montenegro: "Montenegro",
  "north-macedonia": "Macedonia del Norte",
  macedonia: "Macedonia del Norte",
  "bosnia-and-herzegovina": "Bosnia y Herzegovina",
  bosnia: "Bosnia y Herzegovina",
  kosovo: "Kosovo",
  moldova: "Moldavia",
  ukraine: "Ucrania",
  belarus: "Bielorrusia",
  portugal: "Portugal",
  turkey: "Turquía",
  // Slugs generados por slugify (nombres en español sin acentos)
  espana: "España",
  alemania: "Alemania",
  francia: "Francia",
  italia: "Italia",
  "reino-unido": "Reino Unido",
  "paises-bajos": "Países Bajos",
  belgica: "Bélgica",
  suiza: "Suiza",
  polonia: "Polonia",
  chequia: "Chequia",
  eslovaquia: "Eslovaquia",
  hungria: "Hungría",
  eslovenia: "Eslovenia",
  croacia: "Croacia",
  grecia: "Grecia",
  rumania: "Rumanía",
  lituania: "Lituania",
  letonia: "Letonia",
  finlandia: "Finlandia",
  suecia: "Suecia",
  noruega: "Noruega",
  islandia: "Islandia",
  irlanda: "Irlanda",
  moldavia: "Moldavia",
  ucrania: "Ucrania",
  bielorrusia: "Bielorrusia",
  turquia: "Turquía",
  dinamarca: "Dinamarca",
};

// Mapeo de nombres en español a inglés (para buscar en la BD que tiene inglés)
const COUNTRY_ES_TO_EN: Record<string, string> = {
  "España": "Spain",
  "Alemania": "Germany",
  "Francia": "France",
  "Italia": "Italy",
  "Reino Unido": "United Kingdom",
  "Países Bajos": "Netherlands",
  "Bélgica": "Belgium",
  "Suiza": "Switzerland",
  "Austria": "Austria",
  "Polonia": "Poland",
  "Chequia": "Czech Republic",
  "Eslovaquia": "Slovakia",
  "Hungría": "Hungary",
  "Eslovenia": "Slovenia",
  "Croacia": "Croatia",
  "Grecia": "Greece",
  "Rumanía": "Romania",
  "Bulgaria": "Bulgaria",
  "Lituania": "Lithuania",
  "Letonia": "Latvia",
  "Estonia": "Estonia",
  "Finlandia": "Finland",
  "Suecia": "Sweden",
  "Noruega": "Norway",
  "Dinamarca": "Denmark",
  "Islandia": "Iceland",
  "Irlanda": "Ireland",
  "Portugal": "Portugal",
  "Turquía": "Turkey",
  "Ucrania": "Ukraine",
  "Bielorrusia": "Belarus",
  "Moldavia": "Moldova",
  "Albania": "Albania",
  "Serbia": "Serbia",
  "Montenegro": "Montenegro",
  "Macedonia del Norte": "North Macedonia",
  "Bosnia y Herzegovina": "Bosnia and Herzegovina",
  "Kosovo": "Kosovo",
  "Andorra": "Andorra",
  "Mónaco": "Monaco",
  "San Marino": "San Marino",
  "Liechtenstein": "Liechtenstein",
  "Luxemburgo": "Luxembourg",
  "Malta": "Malta",
  "Chipre": "Cyprus",
};

// Función para obtener el nombre en inglés para buscar en BD
const getEnglishCountryName = (spanishName: string): string => {
  return COUNTRY_ES_TO_EN[spanishName] || spanishName;
};

interface CountryData {
  país: string;
  inversión: number;
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
}

interface RiskData {
  id: number;
  tipo: string;
  descripcion: string;
  frecuencia: "Alta" | "Media" | "Baja";
  impacto: "Alto" | "Medio" | "Bajo";
  estado: "Resuelto" | "Pendiente";
  tiendas_afectadas: number;
}

type ShopCoverageComputed = {
  suggestedInvestment: number;
  totalRisks: number;
  coveredRisks: number;
  uncoveredRisks: number;
  coveragePct: number;
};

export default function CountryDashboard() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [risks, setRisks] = useState<RiskData[]>([]);
  const [shops, setShops] = useState<ShopWithCluster[]>([]);
  const [shopCoverageById, setShopCoverageById] = useState<Record<number, ShopCoverageComputed>>({});
  const [dataVersion, setDataVersion] = useState(0);

  const [optCountryOpen, setOptCountryOpen] = useState(false);
  const [optShopOpen, setOptShopOpen] = useState(false);
  const [optShop, setOptShop] = useState<ShopWithCluster | null>(null);
  const [visibleRisksCount, setVisibleRisksCount] = useState(5);

  const riskOptions = useMemo(
    () => risks.map((r) => ({ id: r.id, label: `${r.tipo}: ${r.descripcion}` })),
    [risks]
  );

  useEffect(() => {
    loadCountryData();
  }, [slug, dataVersion]);

  // Listen for data changes from other dashboards
  useEffect(() => {
    const checkVersion = () => {
      const version = parseInt(localStorage.getItem('dataVersion') || '0', 10);
      if (version !== dataVersion) {
        setDataVersion(version);
      }
    };

    // Check on mount and when window regains focus
    checkVersion();
    window.addEventListener('focus', checkVersion);
    window.addEventListener('storage', checkVersion);

    return () => {
      window.removeEventListener('focus', checkVersion);
      window.removeEventListener('storage', checkVersion);
    };
  }, [dataVersion]);

  const loadCountryData = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      // Get country name from slug (ALIAS gives us Spanish name)
      const countryNameSpanish = ALIAS[slug] || slug;
      // Convert to English for DB filtering
      const countryNameEnglish = getEnglishCountryName(countryNameSpanish);

      // Fetch shops for this country (pull all and filter client-side for now)
      const [shopsResponse, stats] = await Promise.all([
        // Respeta el límite de validación del backend (<=100)
        shopService.getShops({ page_size: 100 }),
        dashboardService.getStats(),
      ]);

      // Filter shops by country using the English name from database
      const countryShops = shopsResponse.items.filter((shop) => {
        if (!shop.country) return false;
        return shop.country.toLowerCase() === countryNameEnglish.toLowerCase();
      });

      if (countryShops.length === 0) {
        setError(`No se encontraron tiendas para ${countryNameSpanish}`);
        setLoading(false);
        return;
      }

      // Guardar tiendas del país para la tabla (ordenadas por riesgo desc)
      const sortedCountryShops = [...countryShops].sort(
        (a, b) => (b.totalRisk || 0) - (a.totalRisk || 0)
      );
      setShops(sortedCountryShops);

      // Fetch risk-coverage por tienda: fuente de verdad para coherencia y para inversión sugerida.
      const coverageResults = await Promise.all(
        sortedCountryShops.map(async (shop) => {
          try {
            const coverage = await shopService.getRiskCoverage(shop.id);

            // Inversión sugerida: considera que una medida puede mitigar varios riesgos
            // (aprox greedy set cover para no pagarla dos veces).
            const suggestedInvestment = computeSuggestedInvestment(coverage.risks || []);

            return {
              shopId: shop.id,
              computed: {
                suggestedInvestment,
                totalRisks: coverage.total_risks,
                coveredRisks: coverage.covered_risks,
                uncoveredRisks: coverage.uncovered_risks,
                coveragePct: coverage.coverage_percentage,
              } satisfies ShopCoverageComputed,
              risks: coverage.risks || [],
            };
          } catch {
            return null;
          }
        })
      );

      const nextCoverageById: Record<number, ShopCoverageComputed> = {};
      const riskCounts = new Map<number, { affected: number; covered: number }>();

      for (const r of coverageResults) {
        if (!r) continue;
        nextCoverageById[r.shopId] = r.computed;
        for (const risk of r.risks) {
          const current = riskCounts.get(risk.risk_id) || { affected: 0, covered: 0 };
          current.affected += 1;
          if (risk.is_covered) current.covered += 1;
          riskCounts.set(risk.risk_id, current);
        }
      }
      setShopCoverageById(nextCoverageById);

      // Reordenar por prioridad real: inversión sugerida desc, luego riesgo desc.
      if (Object.keys(nextCoverageById).length) {
        const enrichedSorted = [...sortedCountryShops].sort((a, b) => {
          const invA = nextCoverageById[a.id]?.suggestedInvestment ?? -1;
          const invB = nextCoverageById[b.id]?.suggestedInvestment ?? -1;
          if (invA !== invB) return invB - invA;
          return (b.totalRisk || 0) - (a.totalRisk || 0);
        });
        setShops(enrichedSorted);
      }

      // Get risks from clusters (faster: direct endpoint per cluster)
      const clusterIds = [...new Set(countryShops.map((s) => s.cluster_id))];
      const riskMap = new Map<number, any>();

      for (const clusterId of clusterIds) {
        const risks = await clusterService.getClusterRisks(clusterId).catch(() => []);
        risks.forEach((clusterRisk) => {
          const riskId = clusterRisk.id;
          if (!riskMap.has(riskId)) {
            const counts = riskCounts.get(riskId);
            const isFullyCovered = counts ? counts.covered >= counts.affected : false;
            riskMap.set(riskId, {
              id: riskId,
              tipo: mapRiskType(clusterRisk.name || ""),
              descripcion: clusterRisk.name || "",
              frecuencia: mapLevel(clusterRisk.probability),
              impacto: mapLevel(clusterRisk.consequence),
              estado: isFullyCovered ? "Resuelto" : "Pendiente",
              tiendas_afectadas: counts?.affected ?? 0,
            });
          }
          // Si no tenemos counts (fallback), al menos marcamos 1 tienda afectada.
          const risk = riskMap.get(riskId);
          if (!riskCounts.has(riskId)) {
            risk.tiendas_afectadas += 1;
          }
        });
      }

      const risksArray = Array.from(riskMap.values());
      setRisks(risksArray);

      // Calculate country metrics
      const totalShops = countryShops.length;
      const avgRisk = countryShops.reduce((sum, s) => sum + (s.totalRisk || 0), 0) / totalShops;

      // Coherencia: riesgos totales/resueltos/pendientes como suma por tienda (mismo criterio que StoreDashboard)
      const coverageValues = Object.values(nextCoverageById);
      const sumTotalRisks = coverageValues.reduce((s, c) => s + c.totalRisks, 0);
      const sumCoveredRisks = coverageValues.reduce((s, c) => s + c.coveredRisks, 0);
      const sumUncoveredRisks = coverageValues.reduce((s, c) => s + c.uncoveredRisks, 0);
      const coveragePct = sumTotalRisks > 0 ? (sumCoveredRisks / sumTotalRisks) * 100 : (stats?.coverage_percentage ?? 0);

      const totalRisks = sumTotalRisks || risksArray.length;
      const resolvedRisks = sumTotalRisks ? sumCoveredRisks : risksArray.filter((r) => r.estado === "Resuelto").length;
      const pendingRisks = sumTotalRisks ? sumUncoveredRisks : (totalRisks - resolvedRisks);

      // Inversión real: suma de inversiones sugeridas por tienda
      const investment = Math.round(coverageValues.reduce((s, c) => s + c.suggestedInvestment, 0));
      console.log('[CountryDashboard] Investment calculation:', {
        totalShops,
        coverageValuesCount: coverageValues.length,
        investments: coverageValues.map(c => c.suggestedInvestment),
        totalInvestment: investment
      });
      const roi = (Math.max(0, 1 - avgRisk) * 12).toFixed(1);
      const improvedShops = sumTotalRisks
        ? Object.values(nextCoverageById).filter((c) => c.coveredRisks > 0).length
        : Math.round(totalShops * (coveragePct / 100));
      const annualBenefit = investment * (parseFloat(roi) / 100);

      setCountryData({
        país: countryNameSpanish,
        inversión: investment,
        ROI: `${roi}%`,
        riesgosTotales: totalRisks,
        riesgosResueltos: resolvedRisks,
        riesgosPendientes: pendingRisks,
        pctRiesgosResueltos: totalRisks > 0 ? `${((resolvedRisks / totalRisks) * 100).toFixed(1)}%` : "0%",
        tiendasTotales: totalShops,
        tiendasMejoradas: improvedShops,
        pctTiendasMejoradas: `${((improvedShops / totalShops) * 100).toFixed(1)}%`,
        beneficioAnual: parseFloat(annualBenefit.toFixed(2)),
        planNextYear: Math.round(investment * 0.4),
        plan10y: Math.round(investment * 3.5),
      });
    } catch (err) {
      console.error("Error loading country data:", err);
      setError(err instanceof Error ? err.message : "Error cargando datos del país");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const mapRiskType = (riskName: string): string => {
    if (riskName.includes("nivel del mar") || riskName.includes("Inundación")) return "Climático";
    if (riskName.includes("temperatura") || riskName.includes("calor")) return "Climático";
    if (riskName.includes("precipitaciones") || riskName.includes("lluvia")) return "Climático";
    if (riskName.includes("incendio")) return "Climático";
    if (riskName.includes("tormenta") || riskName.includes("viento")) return "Climático";
    return "Operacional";
  };

  const mapLevel = (value: string): "Alta" | "Media" | "Baja" => {
    const v = value?.toLowerCase() || "";
    if (v.includes("high") || v.includes("alto") || v.includes("alta")) return "Alta";
    if (v.includes("low") || v.includes("bajo") || v.includes("baja")) return "Baja";
    return "Media";
  };

  const euroM = (v: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);

  // Loading state
  if (loading) {
    return (
      <PageContainer title="Cargando...">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error || !countryData) {
    return (
      <PageContainer title="Dashboard de País">
        <Alert
          message="Error"
          description={error || "No se pudo cargar la información del país"}
          type="error"
          showIcon
        />
        <Button
          type="primary"
          onClick={() => navigate("/dashboards")}
          style={{ marginTop: 16 }}
        >
          Volver al Dashboard Global
        </Button>
      </PageContainer>
    );
  }

  // Calculate chart data
  const percentRiesgos = countryData.riesgosTotales > 0
    ? countryData.riesgosResueltos / countryData.riesgosTotales
    : 0;

  const gaugeConfig = {
    percent: percentRiesgos,
    innerRadius: 0.9,
    range: { color: ["#00ff88", "#2b2b2b"] },
    indicator: undefined,
    statistic: {
      content: {
        formatter: () => `${(percentRiesgos * 100).toFixed(1)}%`,
        style: { fontSize: "18px", color: "#fff", fontWeight: 800 },
      },
    },
  };

  const columnData = [
    { tipo: "Resueltos", valor: countryData.riesgosResueltos },
    { tipo: "Pendientes", valor: countryData.riesgosPendientes },
  ];

  const columnConfig = {
    data: columnData,
    xField: "tipo",
    yField: "valor",
    seriesField: "tipo",
    color: ({ tipo }: any) => (tipo === "Resueltos" ? "#00ff88" : "#ff4d4f"),
    label: {
      position: "top" as const,
      style: { fill: "#fff", fontSize: 14, fontWeight: 800 },
    },
  };

  const riskTypeData = risks.reduce((acc, risk) => {
    const existing = acc.find((item) => item.tipo === risk.tipo);
    if (existing) {
      existing.cantidad += 1;
    } else {
      acc.push({ tipo: risk.tipo, cantidad: 1 });
    }
    return acc;
  }, [] as Array<{ tipo: string; cantidad: number }>);

  const pieConfig = {
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
    legend: {
      position: "bottom" as const,
      itemName: {
        style: { fill: "#fff" },
      },
    },
    statistic: {
      title: {
        style: {
          color: "#fff",
          fontSize: "14px",
          fontWeight: 600,
          textAlign: "center",
        },
        content: "Total",
      },
      content: {
        style: {
          color: "#fff",
          fontSize: "20px",
          fontWeight: 800,
          textAlign: "center",
        },
      },
    },
  };

  const years = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const areaData = years.flatMap((year, i) => {
    const factor = 1 + i * 0.15;
    return [
      {
        year: String(year),
        tipo: "Inversión",
        valor: Math.round((countryData.plan10y / 10) * (1 - i / years.length)),
      },
      {
        year: String(year),
        tipo: "Beneficio",
        valor: Math.round(countryData.beneficioAnual * factor),
      },
    ];
  });

  const areaConfig = {
    data: areaData,
    xField: "year",
    yField: "valor",
    seriesField: "tipo",
    color: ["#4B6BFD", "#00ff88"],
    smooth: true,
    legend: { position: "top" as const },
  };

  // Table columns
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
        <span style={{ fontWeight: 800, color: "#4B6BFD" }}>{text}</span>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      ellipsis: true,
    },
    {
      title: "Frecuencia",
      dataIndex: "frecuencia",
      key: "frecuencia",
      width: 100,
      render: (val: string) => {
        const color =
          val === "Alta" ? "#ff4d4f" : val === "Media" ? "#faad14" : "#52c41a";
        return <span style={{ color, fontWeight: 800 }}>{val}</span>;
      },
    },
    {
      title: "Impacto",
      dataIndex: "impacto",
      key: "impacto",
      width: 100,
      render: (val: string) => {
        const color =
          val === "Alto" ? "#ff4d4f" : val === "Medio" ? "#faad14" : "#52c41a";
        return <span style={{ color, fontWeight: 800 }}>{val}</span>;
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 100,
      render: (val: string) => {
        const color = val === "Resuelto" ? "#00ff88" : "#ff4d4f";
        return <span style={{ color, fontWeight: 800 }}>{val}</span>;
      },
    },
    {
      title: "Tiendas Afectadas",
      dataIndex: "tiendas_afectadas",
      key: "tiendas_afectadas",
      width: 140,
      sorter: (a: any, b: any) => a.tiendas_afectadas - b.tiendas_afectadas,
    },
  ];

  const shopColumns: any[] = [
    {
      title: "Prioridad",
      key: "priority",
      width: 90,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 900, color: "#fff" }}>#{index + 1}</span>
      ),
    },
    {
      title: "Tienda",
      dataIndex: "location",
      key: "location",
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 800, color: "#00ff88" }}>{text}</span>
      ),
    },
    {
      title: "Riesgo",
      dataIndex: "totalRisk",
      key: "totalRisk",
      width: 110,
      defaultSortOrder: "descend" as const,
      sorter: (a: any, b: any) => (a.totalRisk || 0) - (b.totalRisk || 0),
      render: (val: number) => {
        const v = Number(val || 0);
        const color = v >= 0.7 ? "#ff4d4f" : v >= 0.4 ? "#faad14" : "#52c41a";
        return <span style={{ color, fontWeight: 900 }}>{v.toFixed(2)}</span>;
      },
    },
    {
      title: "Inversión sugerida",
      key: "suggestedInvestment",
      width: 150,
      sorter: (a: any, b: any) => {
        const av = shopCoverageById[a.id]?.suggestedInvestment ?? 0;
        const bv = shopCoverageById[b.id]?.suggestedInvestment ?? 0;
        return av - bv;
      },
      render: (_: any, record: ShopWithCluster) => {
        const v = shopCoverageById[record.id]?.suggestedInvestment;
        return (
          <span style={{ color: "#fff", fontWeight: 900 }}>
            {typeof v === "number" ? `${Math.round(v).toLocaleString("es-ES")} €` : "—"}
          </span>
        );
      },
    },
    {
      title: "Riesgos pendientes",
      key: "uncoveredRisks",
      width: 140,
      sorter: (a: any, b: any) => {
        const av = shopCoverageById[a.id]?.uncoveredRisks ?? 0;
        const bv = shopCoverageById[b.id]?.uncoveredRisks ?? 0;
        return av - bv;
      },
      render: (_: any, record: ShopWithCluster) => {
        const v = shopCoverageById[record.id]?.uncoveredRisks;
        return <span style={{ color: "#fff", fontWeight: 800 }}>{typeof v === "number" ? v : "—"}</span>;
      },
    },
    {
      title: "Cluster",
      dataIndex: "cluster_id",
      key: "cluster_id",
      width: 90,
      render: (val: number) => <span style={{ color: "#fff" }}>{val}</span>,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 170,
      valueType: "option" as const,
      render: (_: any, record: ShopWithCluster) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" size="small" onClick={() => navigate(`/store/${record.id}`)}>
            Ver
          </Button>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              setOptShop(record);
              setOptShopOpen(true);
            }}
          >
            Optimizar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={`Dashboard: ${countryData.país}`}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboards")}>
          Global
        </Button>,
        <Button key="opt" type="primary" icon={<ThunderboltOutlined />} onClick={() => setOptCountryOpen(true)}>
          Optimizar
        </Button>,
        <Button
          key="map"
          icon={<EnvironmentOutlined />}
          onClick={() => {
            // Usamos el nombre en inglés para el slug del mapa
            const englishName = getEnglishCountryName(countryData.país);
            const mapSlug = englishName.toLowerCase().replace(/\s+/g, "-");
            navigate(`/country/${mapSlug}`);
          }}
          style={{ backgroundColor: "#00ff88", borderColor: "#00ff88", color: "#000" }}
        >
          Ver Mapa
        </Button>,
      ]}
    >
      <OptimizeBudgetModal
        open={optCountryOpen}
        onClose={() => setOptCountryOpen(false)}
        title={`Optimizar: ${countryData.país}`}
        shops={shops}
        riskOptions={riskOptions}
        onApplied={loadCountryData}
      />

      <OptimizeBudgetModal
        open={optShopOpen}
        onClose={() => {
          setOptShopOpen(false);
          setOptShop(null);
        }}
        title={optShop ? `Optimizar tienda: ${optShop.location}` : "Optimizar tienda"}
        shops={optShop ? [optShop] : []}
        fixedShopIds={optShop ? [optShop.id] : []}
        riskOptions={riskOptions}
        onApplied={loadCountryData}
      />

      <ProCard gutter={[16, 16]} wrap>
        {/* Summary Cards */}
        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00ff88" }}>
              {euroM(countryData.inversión)} €
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Inversión Total
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#4B6BFD" }}>
              {countryData.ROI}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              ROI Esperado
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
              {countryData.tiendasTotales}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Tiendas Totales
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00ff88" }}>
              {euroM(countryData.beneficioAnual)} €
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Beneficio Anual
            </div>
          </div>
        </ProCard>

        {/* Progress Cards */}
        <ProCard colSpan={12} title="Progreso de Riesgos" bordered style={cardStyle}>
          <div style={{ padding: 16 }}>
            <Progress
              percent={parseFloat(countryData.pctRiesgosResueltos)}
              strokeColor="#00ff88"
              trailColor="#2b2b2b"
              format={(percent) => `${percent?.toFixed(1)}%`}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#00ff88", fontWeight: 800 }}>
                Resueltos: {countryData.riesgosResueltos}
              </span>
              <span style={{ color: "#ff4d4f", fontWeight: 800 }}>
                Pendientes: {countryData.riesgosPendientes}
              </span>
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={12} title="Tiendas Mejoradas" bordered style={cardStyle}>
          <div style={{ padding: 16 }}>
            <Progress
              percent={parseFloat(countryData.pctTiendasMejoradas)}
              strokeColor="#4B6BFD"
              trailColor="#2b2b2b"
              format={(percent) => `${percent?.toFixed(1)}%`}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#4B6BFD", fontWeight: 800 }}>
                Mejoradas: {countryData.tiendasMejoradas}
              </span>
              <span style={{ color: "#999", fontWeight: 800 }}>
                Total: {countryData.tiendasTotales}
              </span>
            </div>
          </div>
        </ProCard>

        {/* Pending Risks - mostrar justo después del progreso */}
        {(() => {
          const pendingRisks = risks
            .filter(r => r.estado === "Pendiente")
            .sort((a, b) => b.tiendas_afectadas - a.tiendas_afectadas);
          const visibleRisks = pendingRisks.slice(0, visibleRisksCount);
          const hasMore = pendingRisks.length > visibleRisksCount;

          return pendingRisks.length > 0 && (
            <ProCard colSpan={24} title={`⚠️ Riesgos Pendientes (${pendingRisks.length})`} bordered style={{ ...cardStyle, borderColor: "#ff4d4f" }}>
              <div style={{ padding: 16 }}>
                {visibleRisks.map((risk) => (
                  <div
                    key={risk.id}
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
                      Frecuencia: <span style={{ color: risk.frecuencia === "Alta" ? "#ff4d4f" : risk.frecuencia === "Media" ? "#faad14" : "#52c41a" }}>{risk.frecuencia}</span>
                      {" · "}
                      Impacto: <span style={{ color: risk.impacto === "Alto" ? "#ff4d4f" : risk.impacto === "Medio" ? "#faad14" : "#52c41a" }}>{risk.impacto}</span>
                      {" · "}
                      Tiendas afectadas: {risk.tiendas_afectadas}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <Button
                      type="link"
                      onClick={() => setVisibleRisksCount(prev => prev + 5)}
                      style={{ color: "#ff4d4f" }}
                    >
                      Ver más riesgos ({pendingRisks.length - visibleRisksCount} restantes)
                    </Button>
                  </div>
                )}
                {visibleRisksCount > 5 && (
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <Button
                      type="link"
                      onClick={() => setVisibleRisksCount(5)}
                      style={{ color: "#999" }}
                    >
                      Mostrar menos
                    </Button>
                  </div>
                )}
              </div>
            </ProCard>
          );
        })()}

        {/* Charts */}
        <ProCard colSpan={8} title="% Riesgos Resueltos" bordered style={cardStyle}>
          <div style={{ height: 240 }}>
            <Gauge {...gaugeConfig} />
          </div>
        </ProCard>

        <ProCard colSpan={8} title="Riesgos por Estado" bordered style={cardStyle}>
          <div style={{ height: 240 }}>
            <Column {...columnConfig} />
          </div>
        </ProCard>

        <ProCard colSpan={8} title="Riesgos por Tipo" bordered style={cardStyle}>
          <div style={{ height: 240 }}>
            <Pie {...pieConfig} />
          </div>
        </ProCard>

        {/* Area Chart */}
        <ProCard colSpan={24} title="Proyección 10 años" bordered style={cardStyle}>
          <div style={{ height: 300 }}>
            <Area {...areaConfig} />
          </div>
        </ProCard>

        {/* Risks Table */}
        <ProCard colSpan={24} title="Detalle de Riesgos" bordered style={cardStyle}>
          <ProTable<RiskData>
            columns={riskColumns}
            dataSource={risks}
            search={false}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} riesgos`,
            }}
            rowKey="id"
            style={{ background: "transparent" }}
          />
        </ProCard>

        {/* Shops Table */}
        <ProCard
          colSpan={24}
          title="Tiendas del país (prioridad de inversión por riesgo)"
          bordered
          style={cardStyle}
        >
          <ProTable<ShopWithCluster>
            columns={shopColumns}
            dataSource={shops}
            search={false}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} tiendas`,
            }}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => navigate(`/store/${record.id}`),
              style: { cursor: "pointer" },
            })}
            style={{ background: "transparent" }}
          />
        </ProCard>
      </ProCard>
    </PageContainer>
  );
}

const cardStyle = {
  borderRadius: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
};
