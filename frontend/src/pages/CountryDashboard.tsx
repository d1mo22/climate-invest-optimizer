import { useEffect, useMemo, useState } from "react";
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

/* =========================
   Alias slug -> nombre país
========================= */
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

/* =========================
   Helpers UI (suaviza look)
========================= */
const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
};
const cardBody = { padding: 14 };

const softButton: React.CSSProperties = {
  cursor: "pointer",
  borderRadius: 12,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    "linear-gradient(135deg, rgba(0,255,136,0.95), rgba(75,107,253,0.95))",
  color: "#0b0b0f",
  fontWeight: 900,
  boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
};

const subtleBtn: React.CSSProperties = {
  cursor: "pointer",
  borderRadius: 12,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontWeight: 800,
};

const pctColor = (v: number) => (v >= 0.8 ? "#00ff88" : v >= 0.5 ? "#faad14" : "#ff4d4f");

const scoreColor = (score: number) =>
  score > 80 ? "#ff4d4f" : score > 50 ? "#faad14" : "#52c41a";

export default function CountryDashboard() {
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();

  // 1) slug español
  let countryData = allCountriesData.find((c) => slugify(c.país) === slug);

  // 2) slug inglés -> alias -> país
  if (!countryData && ALIAS[slug]) {
    const name = ALIAS[slug];
    countryData = allCountriesData.find((c) => c.país === name);
  }

  if (!countryData) countryData = exampleCountryData as any;
  const data = countryData as any;

  const countryRisks = risksByCountry[data.país] || risksByCountry["España"];

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

        const countryName = data.país;
        const filtered = rows.filter(
          (r: any) => (r.country || "").trim() === countryName
        );

        const enriched = filtered.map((s: any) => {
          const currentRoi = +(Math.random() * 15 + 2).toFixed(1);
          const riskLevel =
            Math.random() > 0.6 ? "Alto" : Math.random() > 0.5 ? "Medio" : "Bajo";

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

  const frequencyOrder = { Alta: 1, Media: 2, Baja: 3 };
  const mostFrequentRisks = useMemo(
    () =>
      [...countryRisks]
        .sort((a, b) => frequencyOrder[a.frecuencia] - frequencyOrder[b.frecuencia])
        .slice(0, 5),
    [countryRisks]
  );

  const mostExposedRisks = useMemo(
    () => [...countryRisks].sort((a, b) => b.tiendas_afectadas - a.tiendas_afectadas).slice(0, 5),
    [countryRisks]
  );

  const risksByType = useMemo(() => {
    return countryRisks.reduce((acc, risk) => {
      const existing = acc.find((r) => r.tipo === risk.tipo);
      if (existing) existing.cantidad++;
      else acc.push({ tipo: risk.tipo, cantidad: 1 });
      return acc;
    }, [] as Array<{ tipo: string; cantidad: number }>);
  }, [countryRisks]);

  const riskTypeConfig = {
    data: risksByType,
    angleField: "cantidad",
    colorField: "tipo",
    legend: { position: "right" as const },
    label: { type: "inner", offset: "-30%", content: "{percentage}" },
    interactions: [{ type: "element-active" }],
  };

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
        style: { fontSize: "18px", color: "#fff", fontWeight: 900 },
      },
    },
  } as any;

  const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
  const yearlyCapex = data.plan10y / 10;
  const yearlyBenefit = data.beneficioAnual;

  const areaData = years.map((year, i) => ({
    year: String(year),
    "Capex (€M)": Math.round(
      yearlyCapex * (1.2 - 0.2 * (i / (years.length - 1)))
    ),
    "Beneficios (€M)": Math.round(
      yearlyBenefit * (0.7 + 0.3 * (i / (years.length - 1)))
    ),
  }));

  const areaConfig = {
    data: areaData,
    xField: "year",
    yField: "Capex (€M)",
    smooth: true,
    animation: { appear: { animation: "path-in", duration: 900 } },
    legend: { position: "top" as const },
    tooltip: { shared: true },
  } as any;

  const tiendasNoMejoradas = data.tiendasTotales - data.tiendasMejoradas;
  const pieConfig = {
    data: [
      { name: "Mejoradas", value: data.tiendasMejoradas },
      { name: "Por mejorar", value: tiendasNoMejoradas },
    ],
    angleField: "value",
    colorField: "name",
    color: ["#00ff88", "#666"],
    legend: { position: "bottom" as const },
    label: { type: "inner", offset: "-30%", content: "{percentage}" },
    interactions: [{ type: "element-active" }],
  };

  const columnConfig = {
    data: [
      { tipo: "Resueltos", cantidad: data.riesgosResueltos },
      { tipo: "Pendientes", cantidad: data.riesgosPendientes },
    ],
    xField: "tipo",
    yField: "cantidad",
    legend: { position: "bottom" as const },
    color: ["#00ff88", "#ff4d4f"],
    tooltip: { showMarkers: false },
  } as any;

  const tableData = [
    { key: "1", metrica: "Inversión total", valor: `${data.inversión}M€` },
    { key: "2", metrica: "ROI", valor: data.ROI },
    { key: "3", metrica: "Beneficio anual", valor: `${data.beneficioAnual}M€` },
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
    <div
      style={{
        minHeight: "100%",
        padding: 8,
        borderRadius: 18,
        background:
          "radial-gradient(900px 520px at 15% 5%, rgba(0,255,136,0.10), transparent 60%)," +
          "radial-gradient(820px 520px at 85% 25%, rgba(75,107,253,0.12), transparent 55%)",
      }}
    >
      <PageContainer
        header={{
          title: `📊 ${data.país} — Dashboard`,
          extra: [
            <button
              key="map"
              onClick={() => navigate(`/country/${slug}`)}
              style={softButton}
            >
              Ver Mapa →
            </button>,
            <button
              key="all"
              onClick={() => navigate("/dashboards")}
              style={subtleBtn}
            >
              Todos los países
            </button>,
          ],
          style: {
            borderRadius: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 12,
          },
        }}
        style={{ background: "transparent" }}
      >
        <ProCard direction="column" gutter={[12, 12]} ghost>
          {/* KPIs + Gauge */}
          <ProCard split="vertical" ghost>
            <ProCard colSpan="70%" gutter={12} wrap ghost>
              <ProCard bordered style={cardStyle} bodyStyle={cardBody}>
                <StatisticCard
                  statistic={{ title: "Inversión (€M)", value: data.inversión, precision: 0 }}
                />
              </ProCard>

              <ProCard bordered style={cardStyle} bodyStyle={cardBody}>
                <StatisticCard
                  statistic={{
                    title: "ROI",
                    value: parseFloat(data.ROI),
                    precision: 1,
                    suffix: "%",
                  }}
                />
              </ProCard>

              <ProCard bordered style={cardStyle} bodyStyle={cardBody}>
                <StatisticCard
                  statistic={{
                    title: "Tiendas mejoradas",
                    value: parseFloat(data.pctTiendasMejoradas),
                    precision: 1,
                    suffix: "%",
                  }}
                />
              </ProCard>

              <ProCard bordered style={cardStyle} bodyStyle={cardBody}>
                <StatisticCard
                  statistic={{
                    title: "Payback",
                    value: (data.inversión / data.beneficioAnual).toFixed(1),
                    suffix: "años",
                  }}
                />
              </ProCard>
            </ProCard>

            <ProCard bordered colSpan="30%" style={cardStyle} bodyStyle={cardBody}>
              <div style={{ display: "grid", placeItems: "center" }}>
                <div style={{ width: 190, height: 190 }}>
                  <Gauge {...gaugeConfig} />
                </div>

                <div style={{ textAlign: "center", marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                  {data.riesgosResueltos} / {data.riesgosTotales} riesgos resueltos
                </div>
              </div>
            </ProCard>
          </ProCard>

          {/* Charts */}
          <ProCard split="vertical" ghost style={{ minHeight: 420 }}>
            <ProCard
              colSpan="50%"
              bordered
              title="Capex vs Beneficios (2026–2035)"
              size="small"
              style={cardStyle}
              bodyStyle={{ padding: 14, height: "100%" }}
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
                style={{ ...cardStyle, flex: 1 }}
                bodyStyle={{ padding: 14, height: "100%" }}
              >
                <Column {...columnConfig} />
              </ProCard>

              <ProCard
                bordered
                title="Tiendas mejoradas"
                size="small"
                style={{ ...cardStyle, flex: 1 }}
                bodyStyle={{ padding: 14, height: "100%" }}
              >
                <Pie {...pieConfig} />
              </ProCard>
            </ProCard>
          </ProCard>

          {/* Tabla métricas */}
          <ProCard
            bordered
            title="Métricas detalladas"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
          >
            <ProTable<{ key: string; metrica: string; valor: string | number }>
              rowKey="key"
              dataSource={tableData}
              search={false}
              options={false}
              pagination={false}
              size="small"
              columns={[
                { title: "Métrica", dataIndex: "metrica", width: "60%" },
                { title: "Valor", dataIndex: "valor", width: "40%", align: "right" as const },
              ]}
              toolBarRender={false}
            />
          </ProCard>

          {/* Prioridad tiendas */}
          <ProCard
            bordered
            title="📌 Prioridad de inversión — Tiendas"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
          >
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
                      <div style={{ fontWeight: 900 }}>{record.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>ID: {record.id}</div>
                    </div>
                  ),
                },
                {
                  title: "Urgencia",
                  dataIndex: "priorityScore",
                  width: 190,
                  render: (_: any, record: any) => (
                    <div style={{ width: 160 }}>
                      <Progress
                        percent={record.priorityScore}
                        showInfo={false}
                        strokeColor={scoreColor(record.priorityScore)}
                        trailColor="rgba(255,255,255,0.10)"
                      />
                      <div style={{ fontSize: 12, textAlign: "right", marginTop: 4, opacity: 0.75 }}>
                        {record.priorityScore}/100
                      </div>
                    </div>
                  ),
                },
                {
                  title: "ROI actual",
                  dataIndex: "roi",
                  width: 110,
                  render: (_: any, record: any) => (
                    <span style={{ fontWeight: 800, opacity: 0.9 }}>{record.roi}%</span>
                  ),
                },
                {
                  title: "Riesgo",
                  dataIndex: "riskLevel",
                  width: 110,
                  render: (_: any, r: any) => (
                    <span
                      style={{
                        fontWeight: 900,
                        color:
                          r.riskLevel === "Alto"
                            ? "#ff4d4f"
                            : r.riskLevel === "Medio"
                            ? "#faad14"
                            : "#52c41a",
                      }}
                    >
                      {r.riskLevel}
                    </span>
                  ),
                },
                {
                  title: "Inversión necesaria",
                  dataIndex: "investmentNeeded",
                  align: "right" as const,
                  width: 160,
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900 }}>{r.investmentNeeded}</span>
                  ),
                },
                {
                  title: "",
                  valueType: "option",
                  width: 120,
                  render: (_: any, record: any) => [
                    <Button
                      key="view"
                      type="primary"
                      size="small"
                      onClick={() => navigate(`/store/${record.id}`)}
                      style={{ borderRadius: 10, fontWeight: 900 }}
                    >
                      Analizar
                    </Button>,
                  ],
                },
              ]}
              toolBarRender={false}
            />
          </ProCard>

          {/* Riesgos */}
          <ProCard
            bordered
            title="⚠️ Análisis de Riesgos"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 12 }}
          >
            <ProCard split="vertical" ghost style={{ gap: 12, alignItems: "stretch" }}>
              <ProCard
                colSpan="50%"
                bordered
                title="Distribución por tipo"
                size="small"
                style={cardStyle}
                bodyStyle={{ padding: 14, display: "grid", placeItems: "center" }}
              >
                <Pie {...riskTypeConfig} />
              </ProCard>

              <ProCard colSpan="50%" ghost style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ProCard
                  bordered
                  title="Riesgos más frecuentes"
                  size="small"
                  style={cardStyle}
                  bodyStyle={{ padding: 0 }}
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
                      { title: "Descripción", dataIndex: "descripcion", width: "55%" },
                      {
                        title: "Frecuencia",
                        dataIndex: "frecuencia",
                        width: "15%",
                        render: (_: any, r: any) => (
                          <span style={{ fontWeight: 900, color: r.frecuencia === "Alta" ? "#ff4d4f" : r.frecuencia === "Media" ? "#faad14" : "#52c41a" }}>
                            {r.frecuencia}
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
                  style={cardStyle}
                  bodyStyle={{ padding: 0 }}
                >
                  <ProTable<(typeof mostExposedRisks)[0]>
                    rowKey="id"
                    dataSource={mostExposedRisks}
                    search={false}
                    options={false}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: "Tipo", dataIndex: "tipo", width: "28%" },
                      { title: "Descripción", dataIndex: "descripcion", width: "52%" },
                      {
                        title: "Tiendas",
                        dataIndex: "tiendas_afectadas",
                        width: "10%",
                        align: "right" as const,
                      },
                      {
                        title: "Impacto",
                        dataIndex: "impacto",
                        width: "10%",
                        render: (_: any, r: any) => (
                          <span style={{ fontWeight: 900, color: r.impacto === "Alto" ? "#ff4d4f" : r.impacto === "Medio" ? "#faad14" : "#52c41a" }}>
                            {r.impacto}
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

          {/* Tabla completa riesgos */}
          <ProCard
            bordered
            title="📋 Detalle completo de riesgos"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
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
                  width: 140,
                  sorter: (a, b) => a.tipo.localeCompare(b.tipo),
                },
                { title: "Descripción", dataIndex: "descripcion", width: 320 },
                {
                  title: "Frecuencia",
                  dataIndex: "frecuencia",
                  width: 120,
                  sorter: (a, b) => ({ Alta: 1, Media: 2, Baja: 3 }[a.frecuencia] - ({ Alta: 1, Media: 2, Baja: 3 }[b.frecuencia])),
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: r.frecuencia === "Alta" ? "#ff4d4f" : r.frecuencia === "Media" ? "#faad14" : "#52c41a" }}>
                      {r.frecuencia}
                    </span>
                  ),
                },
                {
                  title: "Impacto",
                  dataIndex: "impacto",
                  width: 120,
                  sorter: (a, b) => ({ Alto: 1, Medio: 2, Bajo: 3 }[a.impacto] - ({ Alto: 1, Medio: 2, Bajo: 3 }[b.impacto])),
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: r.impacto === "Alto" ? "#ff4d4f" : r.impacto === "Medio" ? "#faad14" : "#52c41a" }}>
                      {r.impacto}
                    </span>
                  ),
                },
                {
                  title: "Tiendas afectadas",
                  dataIndex: "tiendas_afectadas",
                  width: 160,
                  align: "right" as const,
                  sorter: (a, b) => (a.tiendas_afectadas || 0) - (b.tiendas_afectadas || 0),
                },
                {
                  title: "Estado",
                  dataIndex: "estado",
                  width: 120,
                  sorter: (a, b) => a.estado.localeCompare(b.estado),
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: r.estado === "Resuelto" ? "#00ff88" : "#ff4d4f" }}>
                      {r.estado}
                    </span>
                  ),
                },
              ]}
              toolBarRender={false}
            />
          </ProCard>
        </ProCard>
      </PageContainer>
    </div>
  );
}
