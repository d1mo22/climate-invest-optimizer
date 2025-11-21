import React from "react";
import { PageContainer, ProCard, StatisticCard, ProTable } from "@ant-design/pro-components";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { Gauge, DualAxes, Column, Pie } from "@ant-design/plots";
import "../index.css"

type Row = {
  key: number;
  país: string;
  inversión: number;         // €M (capex actual de referencia)
  ROI: string;               // "12.3%"

  // Riesgos
  riesgosTotales: number;
  riesgosResueltos: number;
  riesgosPendientes: number;
  pctRiesgosResueltos: string;

  // Tiendas
  tiendasTotales: number;
  tiendasMejoradas: number;
  pctTiendasMejoradas: string;

  // Extensiones para outlook y métricas financieras
  beneficioAnual: number;    // €M/año (aprox) -> usado p/ payback y "beneficios"
  planNextYear: number;      // €M (capex año siguiente estimado)
  plan10y: number;           // €M (capex agregado 10 años)
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const roiToNum = (roi: string) => parseFloat(roi); // "12.3%" -> 12.3

/* ============================
   DATA BASE + ENRIQUECIMIENTO
============================ */
const base: Array<Pick<Row, "key" | "país" | "inversión" | "ROI">> = [
  { key: 1,  país: "Alemania",     inversión: 150, ROI: "10.0%" },
  { key: 2,  país: "Francia",      inversión: 130, ROI: "11.0%" },
  { key: 3,  país: "España",       inversión: 120, ROI: "12.0%" },
  { key: 4,  país: "Italia",       inversión: 125, ROI: "11.5%" },
  { key: 5,  país: "Reino Unido",  inversión: 140, ROI: "10.5%" },
  { key: 6,  país: "Países Bajos", inversión: 95,  ROI: "10.8%" },
  { key: 7,  país: "Bélgica",      inversión: 80,  ROI: "10.7%" },
  { key: 8,  país: "Luxemburgo",   inversión: 35,  ROI: "9.5%"  },
  { key: 9,  país: "Irlanda",      inversión: 70,  ROI: "11.2%" },
  { key: 10, país: "Portugal",     inversión: 65,  ROI: "12.3%" },
  { key: 11, país: "Dinamarca",    inversión: 60,  ROI: "10.2%" },
  { key: 12, país: "Suecia",       inversión: 85,  ROI: "10.1%" },
  { key: 13, país: "Noruega",      inversión: 75,  ROI: "9.8%"  },
  { key: 14, país: "Finlandia",    inversión: 60,  ROI: "10.0%" },
  { key: 15, país: "Islandia",     inversión: 12,  ROI: "11.0%" },
  { key: 16, país: "Austria",      inversión: 70,  ROI: "10.4%" },
  { key: 17, país: "Suiza",        inversión: 85,  ROI: "9.6%"  },
  { key: 18, país: "Polonia",      inversión: 110, ROI: "12.8%" },
  { key: 19, país: "Chequia",      inversión: 55,  ROI: "12.2%" },
  { key: 20, país: "Eslovaquia",   inversión: 35,  ROI: "12.5%" },
  { key: 21, país: "Hungría",      inversión: 45,  ROI: "12.9%" },
  { key: 22, país: "Eslovenia",    inversión: 22,  ROI: "11.8%" },
  { key: 23, país: "Croacia",      inversión: 28,  ROI: "12.7%" },
  { key: 24, país: "Bosnia y Herzegovina", inversión: 14, ROI: "13.5%" },
  { key: 25, país: "Serbia",       inversión: 26,  ROI: "13.2%" },
  { key: 26, país: "Montenegro",   inversión: 8,   ROI: "13.0%" },
  { key: 27, país: "Albania",      inversión: 12,  ROI: "13.8%" },
  { key: 28, país: "Macedonia del Norte", inversión: 10, ROI: "13.4%" },
  { key: 29, país: "Kosovo",       inversión: 6,   ROI: "14.0%" },
  { key: 30, país: "Grecia",       inversión: 50,  ROI: "12.1%" },
  { key: 31, país: "Bulgaria",     inversión: 24,  ROI: "13.1%" },
  { key: 32, país: "Rumanía",      inversión: 60,  ROI: "13.0%" },
  { key: 33, país: "Moldavia",     inversión: 8,   ROI: "14.2%" },
  { key: 34, país: "Ucrania",      inversión: 40,  ROI: "15.0%" },
  { key: 35, país: "Bielorrusia",  inversión: 18,  ROI: "12.8%" },
  { key: 36, país: "Lituania",     inversión: 20,  ROI: "12.3%" },
  { key: 37, país: "Letonia",      inversión: 16,  ROI: "12.4%" },
  { key: 38, país: "Estonia",      inversión: 18,  ROI: "12.0%" },
  { key: 39, país: "Malta",        inversión: 10,  ROI: "11.6%" },
  { key: 40, país: "Chipre",       inversión: 14,  ROI: "11.9%" },
  { key: 41, país: "Andorra",      inversión: 6,   ROI: "10.8%" },
  { key: 42, país: "Mónaco",       inversión: 5,   ROI: "9.4%"  },
  { key: 43, país: "San Marino",   inversión: 3,   ROI: "10.2%" },
  { key: 44, país: "Liechtenstein", inversión: 4,  ROI: "9.7%"  },
];

export const data: Row[] = base.map((d) => {
  const roiNum = roiToNum(d.ROI);

  // Riesgos
  const riesgosTotales = Math.max(6, Math.round(d.inversión * 0.18));
  const ratioResueltos = clamp(0.45 + (roiNum - 10) * 0.02, 0.45, 0.9);
  const riesgosResueltos = Math.min(riesgosTotales, Math.round(riesgosTotales * ratioResueltos));
  const riesgosPendientes = riesgosTotales - riesgosResueltos;
  const pctRiesgosResueltos = `${((riesgosResueltos / riesgosTotales) * 100).toFixed(1)}%`;

  // Tiendas
  const tiendasTotales = Math.max(20, Math.round(d.inversión * 1.2));
  const ratioTiendasMejoradas = clamp(0.35 + (roiNum - 10) * 0.03, 0.35, 0.9);
  const tiendasMejoradas = Math.min(tiendasTotales, Math.round(tiendasTotales * ratioTiendasMejoradas));
  const pctTiendasMejoradas = `${((tiendasMejoradas / tiendasTotales) * 100).toFixed(1)}%`;

  // Beneficio anual aproximado (ROI sobre la inversión de referencia)
  const beneficioAnual = +(d.inversión * (roiNum / 100)).toFixed(1);

  // Planes (demostrativos): año siguiente ~40% del capex de referencia; 10 años ~3.5x
  const planNextYear = +(d.inversión * 0.4).toFixed(0);
  const plan10y = +(d.inversión * 3.5).toFixed(0);

  return {
    ...d,
    riesgosTotales,
    riesgosResueltos,
    riesgosPendientes,
    pctRiesgosResueltos,
    tiendasTotales,
    tiendasMejoradas,
    pctTiendasMejoradas,
    beneficioAnual,
    planNextYear,
    plan10y,
  };
});

// Orden y agregados
data.sort((a, b) => b.inversión - a.inversión);

const inversionTotal = data.reduce((s, r) => s + r.inversión, 0);
const totRiesgos = data.reduce((s, r) => s + r.riesgosTotales, 0);
const totResueltos = data.reduce((s, r) => s + r.riesgosResueltos, 0);
const roiTotalPct =
  inversionTotal === 0 ? 0 : data.reduce((s, r) => s + r.inversión * roiToNum(r.ROI), 0) / inversionTotal;

const totTiendas = data.reduce((s, r) => s + r.tiendasTotales, 0);
const totTiendasMej = data.reduce((s, r) => s + r.tiendasMejoradas, 0);
const pctTiendasMejoradasGlobal = totTiendas === 0 ? 0 : (totTiendasMej / totTiendas) * 100;

const beneficioAnualTotal = data.reduce((s, r) => s + r.beneficioAnual, 0);
const paybackMedio = beneficioAnualTotal > 0 ? inversionTotal / beneficioAnualTotal : 0; // años

const percentRiesgos = totRiesgos ? totResueltos / totRiesgos : 0;

/* ============================
   CONFIG GRÁFICOS
============================ */
// Gauge % riesgos resueltos
const gaugeConfig = {
  percent: percentRiesgos,
  innerRadius: 0.9,
  range: { color: ["#2b2b2b", "#00ff88"] },
  indicator: null,
  statistic: {
    content: {
      formatter: () => `${(percentRiesgos * 100).toFixed(1)}%`,
      style: { fontSize: 18, color: "#fff" },
    },
  },
};

// DualAxes: inversión vs beneficios (2026-2035)
const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
const capex10yTotal = data.reduce((s, r) => s + r.plan10y, 0);
const beneficios10yBase = beneficioAnualTotal * 10 * 0.9; // leve conservadurismo

// distribuciones sencillas para demo
const invSeries = years.map((y, i) => ({
  year: String(y),
  tipo: "Inversión (€M)",
  valor: Math.round((capex10yTotal * (1 - i / years.length) * 2) / (years.length * 2)), // más front-loaded
}));
const benSeries = years.map((y, i) => ({
  year: String(y),
  tipo: "Beneficios (€M)",
  valor: Math.round((beneficios10yBase / years.length) * (0.8 + 0.4 * (i / (years.length - 1)))), // crecen
}));
const dualData = [invSeries, benSeries];

const dualConfig = {
  data: dualData as any,
  xField: "year",
  yField: ["valor", "valor"],
  geometryOptions: [
    { geometry: "column", isStack: false },
    { geometry: "line", smooth: true },
  ],
  legend: { position: "top" as const },
  tooltip: { shared: true },
};

// Column: Top 10 inversión por país
const top10 = [...data].sort((a, b) => b.inversión - a.inversión).slice(0, 10);
const columnConfig = {
  data: top10.map((d) => ({ país: d.país, inversión: d.inversión })),
  xField: "país",
  yField: "inversión",
  xAxis: { label: { autoRotate: true } },
  tooltip: { showMarkers: false },
};

// Pie: distribución de inversión (Top 8 + resto)
const top8 = [...data].sort((a, b) => b.inversión - a.inversión).slice(0, 8);
const rest = data.slice(8);
const restSum = rest.reduce((s, r) => s + r.inversión, 0);
const pieData = [
  ...top8.map((d) => ({ name: d.país, value: d.inversión })),
  ...(restSum > 0 ? [{ name: "Resto", value: restSum }] : []),
];
const pieConfig = {
  data: pieData,
  angleField: "value",
  colorField: "name",
  legend: { position: "right" as const },
  label: { type: "inner", offset: "-30%", content: "{percentage}" },
  interactions: [{ type: "element-active" }],
};

export default function Dashboards() {
  const navigate = useNavigate();

return (
    <PageContainer
      header={{
        title: "📊 Europa — Overview compañía",
        extra: [
          <button key="map" onClick={() => navigate("/map")}>
          Ir al Mapa
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
              statistic={{ title: "Inversión total (€M)", value: inversionTotal, precision: 0, suffix: "M" }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{ title: "ROI total (pond.)", value: roiTotalPct, precision: 1, suffix: "%" }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{ title: "% Tiendas mejoradas", value: pctTiendasMejoradasGlobal, precision: 1, suffix: "%" }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{ title: "Payback medio (años)", value: paybackMedio, precision: 1 }}
              style={{ minWidth: 220 }}
            />
          </ProCard>

          <ProCard colSpan="30%" bordered style={{ display: "grid", placeItems: "center" }}>
            <div style={{ width: 180, height: 180 }}>
              <Gauge {...gaugeConfig} />
            </div>
            <div style={{ textAlign: "center", marginTop: 6, opacity: 0.85, fontSize: 12 }}>
              {totResueltos.toLocaleString()} / {totRiesgos.toLocaleString()} riesgos resueltos
            </div>
          </ProCard>
        </ProCard>

        {/* Outlook 10 años + Top inversión + Distribución */}
        <ProCard split="vertical" ghost style={{ minHeight: 420 }}>
  {/* Izquierda: DualAxes ocupa toda la altura disponible de la fila */}
  <ProCard
    colSpan="50%"
    bordered
    title="Inversión vs Beneficios (2026–2035)"
    size="small"
    style={{ height: "100%" }}
    bodyStyle={{ padding: 16, height: "100%" }}
  >
    <DualAxes {...dualConfig} />
  </ProCard>

  {/* Derecha: dos cards apilados que rellenan toda la columna */}
  <ProCard
    colSpan="50%"
    ghost
    style={{ display: "flex", flexDirection: "column", gap: 12 }}
  >
    <ProCard
      bordered
      title="Top 10 inversión por país"
      size="small"
      style={{ flex: 1 }}
      bodyStyle={{ padding: 16, height: "100%" }}
    >
      <Column {...columnConfig} />
    </ProCard>

    <ProCard
      bordered
      title="Distribución inversión (Top 8 + resto)"
      size="small"
      style={{ flex: 1 }}
      bodyStyle={{ padding: 16, height: "100%" }}
    >
      <Pie {...pieConfig} />
    </ProCard>
  </ProCard>
</ProCard>

        {/* Tabla compacta por país */}
        <ProCard bordered title="Detalle por país" size="small">
          <ProTable<Row>
            rowKey="key"
            dataSource={data}
            search={false}
            options={false}
            pagination={false}
            size="small"
            scroll={{ y: 420, x: true }}
            columns={[
              { title: "País", dataIndex: "país", width: 180, fixed: "left" as const },
              { title: "Inversión (€M)", dataIndex: "inversión", align: "right", width: 140 },
              { title: "ROI", dataIndex: "ROI", align: "right", width: 90 },
              { title: "Riesgos resueltos", dataIndex: "riesgosResueltos", align: "right", width: 160 },
              { title: "Tiendas mejoradas", dataIndex: "tiendasMejoradas", align: "right", width: 170 },
            ]}
            sticky
            toolBarRender={false}
          />
        </ProCard>
      </ProCard>
    </PageContainer>
  );
}