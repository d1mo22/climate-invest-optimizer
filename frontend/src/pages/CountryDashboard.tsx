import { useEffect, useState } from "react";
import {
  PageContainer,
  ProCard,
  StatisticCard,
  ProTable,
} from "@ant-design/pro-components";
import { Button, Progress } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { Gauge, Column, Pie, Area } from "@ant-design/plots";
import { data as allCountriesData } from "./DashBoards";
import { slugify } from "../utils/slugify";

// Alias: slug inglés → nombre español (mismo que en CountryMap)
const ALIAS: Record<string, string> = {
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
};

// Datos de ejemplo para un país individual (si es necesario un fallback)
const exampleCountryData = {
  país: "España",
  inversión: 120,
  ROI: "12.0%",
  riesgosTotales: 22,
  riesgosResueltos: 16,
  riesgosPendientes: 6,
  pctRiesgosResueltos: "72.7%",
  tiendasTotales: 144,
  tiendasMejoradas: 78,
  pctTiendasMejoradas: "54.2%",
  beneficioAnual: 14.4,
  planNextYear: 48,
  plan10y: 420,
};

// Datos de riesgos por país (ejemplo)
const risksByCountry: Record<
  string,
  Array<{
    id: number;
    tipo: string;
    descripcion: string;
    frecuencia: "Alta" | "Media" | "Baja";
    impacto: "Alto" | "Medio" | "Bajo";
    estado: "Resuelto" | "Pendiente";
    tiendas_afectadas: number;
  }>
> = {
  España: [
    {
      id: 1,
      tipo: "Energético",
      descripcion: "Fluctuaciones en el precio de energía",
      frecuencia: "Alta",
      impacto: "Alto",
      estado: "Resuelto",
      tiendas_afectadas: 45,
    },
    {
      id: 2,
      tipo: "Climático",
      descripcion: "Sequías estacionales",
      frecuencia: "Alta",
      impacto: "Medio",
      estado: "Resuelto",
      tiendas_afectadas: 32,
    },
    {
      id: 3,
      tipo: "Regulatorio",
      descripcion: "Cambios en normas de eficiencia",
      frecuencia: "Media",
      impacto: "Medio",
      estado: "Resuelto",
      tiendas_afectadas: 28,
    },
    {
      id: 4,
      tipo: "Operacional",
      descripcion: "Fallo en sistemas HVAC",
      frecuencia: "Media",
      impacto: "Alto",
      estado: "Pendiente",
      tiendas_afectadas: 15,
    },
    {
      id: 5,
      tipo: "Financiero",
      descripcion: "Volatilidad en tipos de cambio",
      frecuencia: "Alta",
      impacto: "Bajo",
      estado: "Pendiente",
      tiendas_afectadas: 8,
    },
    {
      id: 6,
      tipo: "Reputacional",
      descripcion: "Impacto de huella de carbono",
      frecuencia: "Media",
      impacto: "Medio",
      estado: "Pendiente",
      tiendas_afectadas: 12,
    },
  ],
  Alemania: [
    {
      id: 1,
      tipo: "Regulatorio",
      descripcion: "Regulaciones de emisiones de CO2",
      frecuencia: "Alta",
      impacto: "Alto",
      estado: "Resuelto",
      tiendas_afectadas: 52,
    },
    {
      id: 2,
      tipo: "Energético",
      descripcion: "Dependencia de energía renovable",
      frecuencia: "Alta",
      impacto: "Medio",
      estado: "Resuelto",
      tiendas_afectadas: 38,
    },
    {
      id: 3,
      tipo: "Climático",
      descripcion: "Inviernos extremos",
      frecuencia: "Media",
      impacto: "Alto",
      estado: "Resuelto",
      tiendas_afectadas: 25,
    },
    {
      id: 4,
      tipo: "Operacional",
      descripcion: "Mantenimiento preventivo",
      frecuencia: "Media",
      impacto: "Medio",
      estado: "Pendiente",
      tiendas_afectadas: 18,
    },
    {
      id: 5,
      tipo: "Suministro",
      descripcion: "Cadena de suministro disruptiva",
      frecuencia: "Baja",
      impacto: "Alto",
      estado: "Pendiente",
      tiendas_afectadas: 10,
    },
  ],
  Francia: [
    {
      id: 1,
      tipo: "Energético",
      descripcion: "Disponibilidad de energía nuclear",
      frecuencia: "Media",
      impacto: "Alto",
      estado: "Resuelto",
      tiendas_afectadas: 40,
    },
    {
      id: 2,
      tipo: "Climático",
      descripcion: "Olas de calor",
      frecuencia: "Alta",
      impacto: "Alto",
      estado: "Resuelto",
      tiendas_afectadas: 35,
    },
    {
      id: 3,
      tipo: "Regulatorio",
      descripcion: "Regulaciones de etiquetado",
      frecuencia: "Media",
      impacto: "Medio",
      estado: "Resuelto",
      tiendas_afectadas: 22,
    },
    {
      id: 4,
      tipo: "Operacional",
      descripcion: "Gestión de residuos",
      frecuencia: "Alta",
      impacto: "Bajo",
      estado: "Pendiente",
      tiendas_afectadas: 14,
    },
    {
      id: 5,
      tipo: "Financiero",
      descripcion: "Costos de descarbonización",
      frecuencia: "Alta",
      impacto: "Alto",
      estado: "Pendiente",
      tiendas_afectadas: 20,
    },
  ],
};

export default function CountryDashboard() {
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();

  // Debug: mostrar qué slugs tenemos y cuál buscamos
  const availableSlugs = allCountriesData.map((c) => ({
    país: c.país,
    slug: slugify(c.país),
  }));
  console.log("🔍 Slug buscado:", slug);
  console.log("📋 Slugs disponibles:", availableSlugs);

  // Intentar encontrar el país por:
  // 1. Slug directo en español (ej: "alemania")
  // 2. Slug en inglés mediante ALIAS (ej: "germany" → "Alemania")
  let countryData = allCountriesData.find((country) => {
    return slugify(country.país) === slug;
  });

  // Si no encuentra por slug español, buscar por slug inglés
  if (!countryData && ALIAS[slug]) {
    const countryName = ALIAS[slug];
    countryData = allCountriesData.find((country) => {
      return country.país === countryName;
    });
  }

  // Si no encuentra el país, usar datos de ejemplo
  if (!countryData) {
    console.warn(
      `⚠️ País no encontrado para slug "${slug}", usando datos de ejemplo`
    );
    countryData = exampleCountryData as any;
  }

  // Garantizar que countryData no es undefined (TypeScript)
  const data = countryData!;

  // ===== Datos de riesgos =====
  const countryRisks = risksByCountry[data.país] || risksByCountry["España"];

  // ===== Tiendas y prioridad (cargar CSV y generar score simple) =====
  const [stores, setStores] = useState<Array<any>>([]);
  const [loadingStores, setLoadingStores] = useState<boolean>(true);

  useEffect(() => {
    const loadStores = async () => {
      setLoadingStores(true);
      try {
        const res = await fetch("/data/Store_rows_utm_simple.csv");
        const text = await res.text();
        const [headerLine, ...lines] = text.trim().split(/\r?\n/);
        const headers = headerLine.split(",").map((h) => h.trim());
        const rows = lines.map((line) => {
          const vals = line.split(",").map((v) => v.trim());
          const row: any = {};
          headers.forEach((h, i) => (row[h] = vals[i]));
          return row;
        });

        // Filtrar por país (nombre en español tal como aparece en CSV)
        const countryName = data.país;
        const filtered = rows.filter((r: any) => (r.country || "").trim() === countryName);

        // Enriquecer y calcular prioridad (simulado)
        const enriched = filtered.map((s: any) => {
          const currentRoi = +(Math.random() * 15 + 2).toFixed(1); // 2 - 17%
          const riskLevel = Math.random() > 0.6 ? "Alto" : Math.random() > 0.5 ? "Medio" : "Bajo";
          let score = 0;
          if (riskLevel === "Alto") score += 50;
          if (riskLevel === "Medio") score += 30;
          if (currentRoi < 5) score += 40;
          else if (currentRoi < 10) score += 20;
          score = Math.min(Math.round(score + Math.random() * 10), 100);
          return {
            id: s.id,
            name: s.name,
            roi: currentRoi,
            riskLevel,
            priorityScore: score,
            investmentNeeded: `${(Math.random() * 2 + 0.5).toFixed(1)}M€`,
          };
        });

        enriched.sort((a, b) => b.priorityScore - a.priorityScore);
        setStores(enriched);
      } catch (e) {
        console.error("Error cargando tiendas:", e);
        setStores([]);
      } finally {
        setLoadingStores(false);
      }
    };
    loadStores();
  }, [data.país]);

  // Riesgos más frecuentes
  const frequencyOrder = { Alta: 1, Media: 2, Baja: 3 };
  const mostFrequentRisks = [...countryRisks]
    .sort((a, b) => frequencyOrder[a.frecuencia] - frequencyOrder[b.frecuencia])
    .slice(0, 5);

  // Riesgos más expuestos (por tiendas afectadas)
  const mostExposedRisks = [...countryRisks]
    .sort((a, b) => b.tiendas_afectadas - a.tiendas_afectadas)
    .slice(0, 5);

  // Distribución de riesgos por categoría (tipo)
  const risksByType = countryRisks.reduce((acc, risk) => {
    const existing = acc.find((r) => r.tipo === risk.tipo);
    if (existing) {
      existing.cantidad++;
    } else {
      acc.push({ tipo: risk.tipo, cantidad: 1 });
    }
    return acc;
  }, [] as Array<{ tipo: string; cantidad: number }>);

  const riskTypeConfig = {
    data: risksByType,
    angleField: "cantidad",
    colorField: "tipo",
    legend: { position: "right" as const },
    label: { type: "inner", offset: "-30%", content: "{percentage}" },
    interactions: [{ type: "element-active" }],
  };

  // Gauge % riesgos resueltos
  const percentRiesgos = data.riesgosTotales
    ? data.riesgosResueltos / data.riesgosTotales
    : 0;

  const gaugeConfig = {
    percent: percentRiesgos,
    innerRadius: 0.9,
    range: { color: ["#2b2b2b", "#00ff88"] },
    indicator: null,
    statistic: {
      content: {
        formatter: () => `${(percentRiesgos * 100).toFixed(1)}%`,
        style: { fontSize: "18px", color: "#fff" },
      },
    },
  } as any;

  // Area: Evolución anual 10 años (Capex proyectado + Beneficios)
  const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
  const yearlyCapex = data.plan10y / 10; // distribuido
  const yearlyBenefit = data.beneficioAnual;

  const areaData = years.map((year, i) => ({
    year: String(year),
    "Capex (€M)": Math.round(
      yearlyCapex * (1.2 - 0.2 * (i / (years.length - 1)))
    ), // decrece
    "Beneficios (€M)": Math.round(
      yearlyBenefit * (0.7 + 0.3 * (i / (years.length - 1)))
    ), // crece
  }));

  const areaConfig = {
    data: areaData,
    xField: "year",
    yField: "Capex (€M)",
    smooth: true,
    animation: { appear: { animation: "path-in", duration: 1000 } },
    legend: { position: "top" as const },
    tooltip: { shared: true },
  } as any;

  // Pie: Distribución de tiendas
  const tiendasNoMejoradas = data.tiendasTotales - data.tiendasMejoradas;
  const pieDataTiendas = [
    { name: "Mejoradas", value: data.tiendasMejoradas },
    { name: "Por mejorar", value: tiendasNoMejoradas },
  ];

  const pieConfig = {
    data: pieDataTiendas,
    angleField: "value",
    colorField: "name",
    color: ["#00ff88", "#666"],
    legend: { position: "bottom" as const },
    label: { type: "inner", offset: "-30%", content: "{percentage}" },
    interactions: [{ type: "element-active" }],
  };

  // Column: Riesgos (resueltos vs pendientes)
  const columnData = [
    { tipo: "Resueltos", cantidad: data.riesgosResueltos },
    { tipo: "Pendientes", cantidad: data.riesgosPendientes },
  ];

  const columnConfig = {
    data: columnData,
    xField: "tipo",
    yField: "cantidad",
    legend: { position: "bottom" as const },
    color: ["#00ff88", "#ff4d4f"],
    tooltip: { showMarkers: false },
  } as any;

  // Tabla detalle de filas
  const tableData: Array<{
    key: string;
    metrica: string;
    valor: string | number;
  }> = [
    { key: "1", metrica: "Inversión total", valor: `${data.inversión}M€` },
    { key: "2", metrica: "ROI", valor: data.ROI },
    { key: "3", metrica: "Total ahorrado", valor: `${data.beneficioAnual}M€` },
    {
      key: "4",
      metrica: "Payback",
      valor: `${(data.inversión / data.beneficioAnual).toFixed(1)} años`,
    },
    { key: "5", metrica: "Tiendas totales", valor: data.tiendasTotales },
    {
      key: "6",
      metrica: "Tiendas mejoradas",
      valor: `${data.tiendasMejoradas} (${data.pctTiendasMejoradas})`,
    },
    { key: "7", metrica: "Riesgos totales", valor: data.riesgosTotales },
    {
      key: "8",
      metrica: "Riesgos resueltos",
      valor: `${data.riesgosResueltos} (${data.pctRiesgosResueltos})`,
    },
    { key: "9", metrica: "Plan próximo año", valor: `${data.planNextYear}M€` },
    { key: "10", metrica: "Plan 10 años", valor: `${data.plan10y}M€` },
  ];

  return (
    <PageContainer
      header={{
        title: `📊 ${data.país} — Dashboard`,
        extra: [
          <button key="map" onClick={() => navigate(`/country/${slug}`)}>
            Ver Mapa
          </button>,
          <button key="all" onClick={() => navigate("/dashboards")}>
            Todos los países
          </button>,
        ],
      }}
    >
      <ProCard direction="column" gutter={[12, 12]} ghost>
        {/* KPIs + Gauge */}
        <ProCard split="vertical" ghost>
          <ProCard colSpan="70%" gutter={12} wrap ghost>
            <StatisticCard
              bordered
              statistic={{
                title: "Inversión (€M)",
                value: data.inversión,
                precision: 0,
              }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "ROI",
                value: parseFloat(data.ROI),
                precision: 1,
                suffix: "%",
              }}
              style={{ minWidth: 220}}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "Tiendas mejoradas",
                value: parseFloat(data.pctTiendasMejoradas),
                precision: 1,
                suffix: "%",
              }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "Payback",
                value: (data.inversión / data.beneficioAnual).toFixed(1),
                suffix: "años",
              }}
              style={{ minWidth: 220 }}
            />
          </ProCard>

          <ProCard
            colSpan="30%"
            bordered
            style={{ display: "grid", placeItems: "center" }}
          >
            <div style={{ width: 180, height: 180 }}>
              <Gauge {...gaugeConfig} />
            </div>
            <div
              style={{
                textAlign: "center",
                marginTop: 6,
                opacity: 0.85,
                fontSize: 12,
              }}
            >
              {data.riesgosResueltos} / {data.riesgosTotales} riesgos resueltos
            </div>
          </ProCard>
          </ProCard>
        {/* Gráficos */}
        <ProCard split="vertical" ghost style={{ minHeight: 420 }}>
          <ProCard
            colSpan="50%"
            bordered
            title="Capex vs Beneficios (2026–2035)"
            size="small"
            style={{ height: "100%" }}
            bodyStyle={{ padding: 16, height: "100%" }}
          >
            <Area {...areaConfig} />
          </ProCard>

          <ProCard
            colSpan="50%"
            ghost
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <ProCard
              bordered
              title="Estado de riesgos"
              size="small"
              style={{ flex: 1 }}
              bodyStyle={{ padding: 16, height: "100%" }}
            >
              <Column {...columnConfig} />
            </ProCard>
            <ProCard
              bordered
              title="Tiendas mejoradas"
              size="small"
              style={{ flex: 1 }}
              bodyStyle={{ padding: 16, height: "100%" }}
            >
              <Pie {...pieConfig} />
            </ProCard>
          </ProCard>
        </ProCard>

        {/* Tabla de métricas */}
        <ProCard bordered title="Métricas detalladas" size="small">
          <ProTable<{ key: string; metrica: string; valor: string | number }>
            rowKey="key"
            dataSource={tableData}
            search={false}
            options={false}
            pagination={false}
            size="small"
            columns={[
              { title: "Métrica", dataIndex: "metrica", width: "50%" },
              {
                title: "Valor",
                dataIndex: "valor",
                width: "50%",
                align: "right" as const,
              },
            ]}
            toolBarRender={false}
          />
        </ProCard>

        {/* Prioridad de inversión — Tiendas */}
        <ProCard bordered title="📌 Prioridad de inversión — Tiendas" size="small" style={{ marginTop: 12 }}>
          <ProTable<any>
            rowKey="id"
            loading={loadingStores}
            dataSource={stores}
            search={false}
            options={false}
            pagination={{ pageSize: 6 }}
            size="small"
            columns={[
              {
                title: "#",
                render: (_: any, __: any, index: number) => index + 1,
                width: 60,
                align: "center" as const,
              },
              {
                title: "Tienda",
                dataIndex: "name",
                render: (_text: any, record: any) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{record.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>ID: {record.id}</div>
                  </div>
                ),
              },
              {
                title: "Urgencia (Score)",
                dataIndex: "priorityScore",
                render: (_: any, record: any) => (
                  <div style={{ width: 140 }}>
                    <Progress
                      percent={record.priorityScore}
                      showInfo={false}
                      strokeColor={record.priorityScore > 80 ? '#ff4d4f' : record.priorityScore > 50 ? '#faad14' : '#52c41a'}
                    />
                    <div style={{ fontSize: 12, textAlign: 'right', marginTop: 4 }}>{record.priorityScore}/100</div>
                  </div>
                ),
              },
              {
                title: "ROI Actual",
                dataIndex: "roi",
                render: (_: any, record: any) => `${record.roi}%`,
              },
              {
                title: "Inversión necesaria",
                dataIndex: "investmentNeeded",
                align: "right" as const,
              },
              {
                title: "Acción",
                valueType: "option",
                render: (_: any, record: any) => [
                  <Button
                    key="view"
                    type="primary"
                    size="small"
                    onClick={() => navigate(`/store/${record.id}`)}
                  >
                    Analizar
                  </Button>,
                ],
              },
            ]}
            toolBarRender={false}
          />
        </ProCard>

        {/* Análisis de Riesgos */}
        <ProCard
          bordered
          title="⚠️ Análisis de Riesgos"
          size="small"
          style={{ marginTop: 12 }}
        >
          <ProCard split="vertical" ghost style={{ display: "flex", gap: 12, alignItems: "stretch", height: "100%" }}>
            <ProCard
              colSpan="50%"
              bordered
              title="Distribución por tipo"
              size="small"
              style={{ flex: 1, height: "100%" }}
              bodyStyle={{ padding: 16, display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              <Pie {...riskTypeConfig} />
            </ProCard>

            <ProCard
              colSpan="50%"
              ghost
              style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}
            >
              <ProCard
                bordered
                title="Riesgos más frecuentes"
                size="small"
                style={{ flex: 1, height: "100%" }}
                bodyStyle={{ padding: 16, display: "flex", flexDirection: "column" }}
              >
                <ProTable<(typeof mostFrequentRisks)[0]>
                  rowKey="id"
                  dataSource={mostFrequentRisks}
                  search={false}
                  options={false}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: "Tipo", dataIndex: "tipo", width: "30%" },
                    { title: "Descripción", dataIndex: "descripcion", width: "40%" },
                    {
                      title: "Frecuencia",
                      dataIndex: "frecuencia",
                      width: "20%",
                      render: (_, record) => (
                        <span
                          style={{
                            color:
                              record.frecuencia === "Alta"
                                ? "#ff4d4f"
                                : record.frecuencia === "Media"
                                ? "#faad14"
                                : "#52c41a",
                          }}
                        >
                          {record.frecuencia}
                        </span>
                      ),
                    },
                  ]}
                  toolBarRender={false}
                />
              </ProCard>

              <ProCard
                bordered
                title="Riesgos más expuestos"
                size="small"
                style={{ flex: 1, height: "100%" }}
                bodyStyle={{ padding: 16, display: "flex", flexDirection: "column" }}
              >
                <ProTable<(typeof mostExposedRisks)[0]>
                  rowKey="id"
                  dataSource={mostExposedRisks}
                  search={false}
                  options={false}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: "Tipo", dataIndex: "tipo", width: "25%" },
                    { title: "Descripción", dataIndex: "descripcion", width: "40%" },
                    {
                      title: "Tiendas afectadas",
                      dataIndex: "tiendas_afectadas",
                      width: "20%",
                      align: "right" as const,
                    },
                    {
                      title: "Impacto",
                      dataIndex: "impacto",
                      width: "15%",
                      render: (_, record) => (
                        <span
                          style={{
                            color:
                              record.impacto === "Alto"
                                ? "#ff4d4f"
                                : record.impacto === "Medio"
                                ? "#faad14"
                                : "#52c41a",
                          }}
                        >
                          {record.impacto}
                        </span>
                      ),
                    },
                  ]}
                  toolBarRender={false}
                />
              </ProCard>
            </ProCard>
          </ProCard>
        </ProCard>

        {/* Tabla completa de riesgos */}
        <ProCard
          bordered
          title="📋 Detalle completo de riesgos"
          size="small"
          style={{ marginTop: 12 }}
        >
          <ProTable<(typeof countryRisks)[0]>
            rowKey="id"
            dataSource={countryRisks}
            search={false}
            options={false}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: true }}
            columns={[
              {
                title: "Tipo",
                dataIndex: "tipo",
                width: 120,
                sorter: (a, b) => a.tipo.localeCompare(b.tipo),
              },
              { title: "Descripción", dataIndex: "descripcion", width: 250 },
              {
                title: "Frecuencia",
                dataIndex: "frecuencia",
                width: 100,
                sorter: (a, b) => {
                  const order: Record<string, number> = { Alta: 1, Media: 2, Baja: 3 };
                  return (order[a.frecuencia] || 99) - (order[b.frecuencia] || 99);
                },
                render: (_, record) => (
                  <span
                    style={{
                      color:
                        record.frecuencia === "Alta"
                          ? "#ff4d4f"
                          : record.frecuencia === "Media"
                          ? "#faad14"
                          : "#52c41a",
                    }}
                  >
                    {record.frecuencia}
                  </span>
                ),
              },
              {
                title: "Impacto",
                dataIndex: "impacto",
                width: 100,
                sorter: (a, b) => {
                  const order: Record<string, number> = { Alto: 1, Medio: 2, Bajo: 3 };
                  return (order[a.impacto] || 99) - (order[b.impacto] || 99);
                },
                render: (_, record) => (
                  <span
                    style={{
                      color:
                        record.impacto === "Alto"
                          ? "#ff4d4f"
                          : record.impacto === "Medio"
                          ? "#faad14"
                          : "#52c41a",
                    }}
                  >
                    {record.impacto}
                  </span>
                ),
              },
              {
                title: "Tiendas afectadas",
                dataIndex: "tiendas_afectadas",
                width: 130,
                align: "right" as const,
                sorter: (a, b) => (a.tiendas_afectadas || 0) - (b.tiendas_afectadas || 0),
              },
              {
                title: "Estado",
                dataIndex: "estado",
                width: 100,
                sorter: (a, b) => a.estado.localeCompare(b.estado),
                render: (_, record) => (
                  <span
                    style={{
                      color:
                        record.estado === "Resuelto" ? "#52c41a" : "#ff4d4f",
                      fontWeight: "bold",
                    }}
                  >
                    {record.estado}
                  </span>
                ),
              },
            ]}
            toolBarRender={false}
          />
        </ProCard>
      </ProCard>
    </PageContainer>
  );
}
