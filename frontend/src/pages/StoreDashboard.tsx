import { useEffect, useMemo, useState } from "react";
import {
  PageContainer,
  ProCard,
  StatisticCard,
  ProTable,
} from "@ant-design/pro-components";
import { Button } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { Gauge, Column, Pie, Area } from "@ant-design/plots";
import { slugify, COUNTRY_ALIAS } from "../utils/slugify";

/* =========================
   Tipos
========================= */
type StoreCsvRow = {
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

type StoreData = StoreCsvRow & {
  riesgos: Array<{
    id: number;
    tipo: string;
    descripcion: string;
    estado: string;
    importancia: string;
    tiendas_afectadas: number;
  }>;
  pctRiesgosResueltos: string;
};

/* =========================
   Riesgos de ejemplo
========================= */
const EXAMPLE_RISKS = [
  {
    id: 1,
    tipo: "Energético",
    descripcion: "Fallo en suministro eléctrico",
    estado: "Resuelto",
    importancia: "Alta",
    tiendas_afectadas: 3,
  },
  {
    id: 2,
    tipo: "Climático",
    descripcion: "Inundaciones",
    estado: "Resuelto",
    importancia: "Media",
    tiendas_afectadas: 2,
  },
  {
    id: 3,
    tipo: "Operacional",
    descripcion: "Fallo en sistemas HVAC",
    estado: "Pendiente",
    importancia: "Alta",
    tiendas_afectadas: 1,
  },
  {
    id: 4,
    tipo: "Regulatorio",
    descripcion: "Normativa de eficiencia",
    estado: "Resuelto",
    importancia: "Baja",
    tiendas_afectadas: 1,
  },
  {
    id: 5,
    tipo: "Financiero",
    descripcion: "Fluctuaciones en divisas",
    estado: "Pendiente",
    importancia: "Media",
    tiendas_afectadas: 2,
  },
  {
    id: 6,
    tipo: "Reputacional",
    descripcion: "Impacto ambiental",
    estado: "Pendiente",
    importancia: "Alta",
    tiendas_afectadas: 3,
  },
];

async function fetchStoreData(slug: string): Promise<StoreData | null> {
  try {
    const response = await fetch("/data/Store_details.csv");
    const text = await response.text();
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = headerLine.split(",").map((h) => h.trim());

    const rows = lines
      .filter((l) => l.trim().length > 0)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: any = {};
        headers.forEach((h, i) => (row[h] = values[i]));
        return row as StoreCsvRow;
      });

    const found = rows.find((r) => r.slug === slug || String(r.id) === slug);
    if (!found) return null;

    const total = parseInt(found.riesgos_totales, 10) || 5;
    const resueltos = parseInt(found.riesgos_resueltos, 10) || 0;
    const pendientes = parseInt(found.riesgos_pendientes, 10) || 0;

    const riesgos: StoreData["riesgos"] = [];
    for (let i = 0; i < resueltos; i++) {
      const base = EXAMPLE_RISKS[i % EXAMPLE_RISKS.length];
      riesgos.push({ ...base, id: i + 1, estado: "Resuelto" });
    }
    for (let i = 0; i < pendientes; i++) {
      const base = EXAMPLE_RISKS[(resueltos + i) % EXAMPLE_RISKS.length];
      riesgos.push({ ...base, id: resueltos + i + 1, estado: "Pendiente" });
    }

    const pct = total > 0 ? ((resueltos / total) * 100).toFixed(1) + "%" : "0%";

    return { ...found, riesgos, pctRiesgosResueltos: pct };
  } catch (error) {
    console.error("Error loading store data:", error);
    return null;
  }
}

/* =========================
   Estilos suaves (unificados)
========================= */
const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
};

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

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;
    setLoading(true);
    fetchStoreData(storeSlug).then((d) => {
      setStoreData(d);
      setLoading(false);
    });
  }, [storeSlug]);

  const importanceOrder: Record<string, number> = { Alta: 1, Media: 2, Baja: 3 };

  const parsed = useMemo(() => {
    if (!storeData) return null;

    const inversion = parseFloat(storeData.inversion);
    const beneficioAnual = parseFloat(storeData.beneficio_anual);
    const roiVal = parseFloat(storeData.roi.replace("%", ""));
    const riesgosTotales = parseInt(storeData.riesgos_totales, 10);
    const riesgosResueltos = parseInt(storeData.riesgos_resueltos, 10);
    const riesgosPendientes = parseInt(storeData.riesgos_pendientes, 10);
    const planNextYear = parseFloat(storeData.plan_next_year);
    const plan10y = parseFloat(storeData.plan_10y);

    const percentRiesgos = riesgosTotales ? riesgosResueltos / riesgosTotales : 0;

    return {
      inversion,
      beneficioAnual,
      roiVal,
      riesgosTotales,
      riesgosResueltos,
      riesgosPendientes,
      planNextYear,
      plan10y,
      percentRiesgos,
    };
  }, [storeData]);

  const countrySlug = useMemo(() => {
    if (!storeData) return "";
    const normalizedName = storeData.pais.trim();
    const entry = Object.entries(COUNTRY_ALIAS).find(
      ([, val]) => val.toLowerCase() === normalizedName.toLowerCase()
    );
    return entry ? entry[0] : slugify(normalizedName);
  }, [storeData]);

  const gaugeConfig = useMemo(() => {
    const p = parsed?.percentRiesgos ?? 0;
    return {
      percent: p,
      innerRadius: 0.9,
      range: { color: ["#2b2b2b", "#00ff88"] },
      axis: { label: null, subTickLine: null, tickLine: null },
      indicator: null,
      statistic: {
        content: {
          formatter: () => `${(p * 100).toFixed(1)}%`,
          style: { fontSize: "18px", color: "#fff", fontWeight: 900 },
        },
      },
    } as any;
  }, [parsed?.percentRiesgos]);

  const columnConfig = useMemo(() => {
    const res = parsed?.riesgosResueltos ?? 0;
    const pen = parsed?.riesgosPendientes ?? 0;
    return {
      data: [
        { tipo: "Resueltos", cantidad: res },
        { tipo: "Pendientes", cantidad: pen },
      ],
      xField: "tipo",
      yField: "cantidad",
      legend: { position: "bottom" as const },
      color: ["#00ff88", "#ff4d4f"],
      tooltip: { showMarkers: false },
    } as any;
  }, [parsed?.riesgosResueltos, parsed?.riesgosPendientes]);

  const riskTypeConfig = useMemo(() => {
    const risks = storeData?.riesgos ?? [];
    const risksByType = risks.reduce((acc, risk) => {
      const existing = acc.find((r) => r.tipo === risk.tipo);
      if (existing) existing.cantidad++;
      else acc.push({ tipo: risk.tipo, cantidad: 1 });
      return acc;
    }, [] as Array<{ tipo: string; cantidad: number }>);

    return {
      data: risksByType,
      angleField: "cantidad",
      colorField: "tipo",
      legend: { position: "right" as const },
      label: { type: "inner", offset: "-30%", content: "{percentage}" },
      interactions: [{ type: "element-active" }],
    } as any;
  }, [storeData?.riesgos]);

  const areaConfig = useMemo(() => {
    const inversion = parsed?.inversion ?? 0;
    const beneficioAnual = parsed?.beneficioAnual ?? 0;

    const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
    const areaData = years.map((year, i) => ({
      year: String(year),
      "Inversión (€M)": Math.round(
        inversion * (1.2 - 0.2 * (i / (years.length - 1)))
      ),
      "Beneficios (€M)": Math.round(
        beneficioAnual * (0.7 + 0.3 * (i / (years.length - 1)))
      ),
    }));

    return {
      data: areaData,
      xField: "year",
      yField: "Inversión (€M)",
      smooth: true,
      animation: { appear: { animation: "path-in", duration: 900 } },
      legend: { position: "top" as const },
      tooltip: { shared: true },
    } as any;
  }, [parsed?.inversion, parsed?.beneficioAnual]);

  const tableData = useMemo(() => {
    if (!storeData || !parsed) return [];
    const { inversion, beneficioAnual, riesgosTotales, riesgosResueltos, planNextYear, plan10y } = parsed;

    return [
      { key: "1", metrica: "Inversión total", valor: `${inversion}M€` },
      { key: "2", metrica: "ROI", valor: storeData.roi },
      { key: "3", metrica: "Beneficio anual", valor: `${beneficioAnual}M€` },
      { key: "4", metrica: "Payback", valor: `${(inversion / beneficioAnual).toFixed(1)} años` },
      { key: "5", metrica: "Riesgos totales", valor: riesgosTotales },
      { key: "6", metrica: "Riesgos resueltos", valor: `${riesgosResueltos} (${storeData.pctRiesgosResueltos})` },
      { key: "7", metrica: "Plan próximo año", valor: `${planNextYear}M€` },
      { key: "8", metrica: "Plan 10 años", valor: `${plan10y}M€` },
    ];
  }, [storeData, parsed]);

  const pendingRisks = useMemo(() => {
    return (storeData?.riesgos ?? []).filter((r) => r.estado === "Pendiente");
  }, [storeData?.riesgos]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: 24, opacity: 0.85 }}>Cargando datos de la tienda...</div>
      </PageContainer>
    );
  }

  if (!storeData || !parsed) {
    return (
      <PageContainer>
        <div style={{ padding: 24, opacity: 0.85 }}>
          No se encontró la tienda "{storeSlug}"
        </div>
      </PageContainer>
    );
  }

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
          title: `📊 ${storeData.tienda} — Dashboard`,
          subTitle: storeData.pais,
          extra: [
            <button
              key="country"
              onClick={() => navigate(`/country/${countrySlug}`)}
              style={subtleBtn}
            >
              Volver a mapa
            </button>,
            <button
              key="pais"
              onClick={() => navigate(`/dashboard/${countrySlug}`)}
              style={softButton}
            >
              Dashboard país →
            </button>,
            <button key="all" onClick={() => navigate("/dashboards")} style={subtleBtn}>
              Europa
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
          {/* Header info */}
          <ProCard bordered size="small" style={cardStyle} bodyStyle={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(0,255,136,0.95)",
                    boxShadow: "0 0 18px rgba(0,255,136,0.35)",
                  }}
                />
                <div>
                  <div style={{ opacity: 0.65, fontSize: 12 }}>País</div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{storeData.pais}</div>
                </div>
              </div>

              <div style={{ height: 28, width: 1, background: "rgba(255,255,255,0.08)" }} />

              <div>
                <div style={{ opacity: 0.65, fontSize: 12 }}>Tienda</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{storeData.tienda}</div>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pill(stateColor("Resuelto"))}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: stateColor("Resuelto") }} />
                  Resueltos: {parsed.riesgosResueltos}
                </span>
                <span style={pill(stateColor("Pendiente"))}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: stateColor("Pendiente") }} />
                  Pendientes: {parsed.riesgosPendientes}
                </span>
              </div>
            </div>
          </ProCard>

          {/* KPIs + Gauge */}
          <ProCard split="vertical" ghost>
            <ProCard colSpan="70%" gutter={12} wrap ghost>
              <ProCard bordered style={cardStyle} bodyStyle={{ padding: 14, minWidth: 220 }}>
                <StatisticCard
                  statistic={{ title: "Inversión (€M)", value: parsed.inversion, precision: 1 }}
                />
              </ProCard>

              <ProCard bordered style={cardStyle} bodyStyle={{ padding: 14, minWidth: 220 }}>
                <StatisticCard
                  statistic={{ title: "ROI", value: parsed.roiVal, precision: 1, suffix: "%" }}
                />
              </ProCard>

              <ProCard bordered style={cardStyle} bodyStyle={{ padding: 14, minWidth: 220 }}>
                <StatisticCard
                  statistic={{
                    title: "Payback",
                    value: (parsed.inversion / parsed.beneficioAnual).toFixed(1),
                    suffix: "años",
                  }}
                />
              </ProCard>
            </ProCard>

            <ProCard bordered colSpan="30%" style={cardStyle} bodyStyle={{ padding: 14 }}>
              <div style={{ display: "grid", placeItems: "center" }}>
                <div style={{ width: 190, height: 190 }}>
                  <Gauge {...gaugeConfig} />
                </div>
                <div style={{ textAlign: "center", marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                  {parsed.riesgosResueltos} / {parsed.riesgosTotales} riesgos resueltos
                </div>
              </div>
            </ProCard>
          </ProCard>

          {/* Charts */}
          <ProCard split="vertical" ghost style={{ minHeight: 420 }}>
            <ProCard
              colSpan="50%"
              bordered
              title="Inversión vs Beneficios (2026–2035)"
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
                title="Distribución de riesgos por tipo"
                size="small"
                style={{ ...cardStyle, flex: 1 }}
                bodyStyle={{ padding: 14, height: "100%" }}
              >
                <Pie {...riskTypeConfig} />
              </ProCard>
            </ProCard>
          </ProCard>

          {/* Tabla métricas */}
          <ProCard bordered title="Métricas detalladas" size="small" style={cardStyle} bodyStyle={{ padding: 0 }}>
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

          {/* Pendientes */}
          <ProCard
            bordered
            title="⚠️ Riesgos pendientes"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
          >
            <ProTable
              rowKey="id"
              dataSource={pendingRisks}
              search={false}
              options={false}
              pagination={false}
              size="small"
              columns={[
                { title: "Tipo", dataIndex: "tipo", width: 160 },
                { title: "Descripción", dataIndex: "descripcion" },
                {
                  title: "Importancia",
                  dataIndex: "importancia",
                  width: 140,
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: importanceColor(r.importancia) }}>
                      {r.importancia}
                    </span>
                  ),
                },
              ]}
              toolBarRender={false}
            />
          </ProCard>

          {/* Completo */}
          <ProCard
            bordered
            title="📋 Análisis completo de riesgos"
            size="small"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
          >
            <ProTable
              rowKey="id"
              dataSource={storeData.riesgos}
              search={false}
              options={false}
              pagination={{ pageSize: 5 }}
              size="small"
              columns={[
                {
                  title: "Tipo",
                  dataIndex: "tipo",
                  width: 160,
                  sorter: (a: any, b: any) => String(a.tipo).localeCompare(String(b.tipo)),
                },
                { title: "Descripción", dataIndex: "descripcion" },
                {
                  title: "Estado",
                  dataIndex: "estado",
                  width: 140,
                  sorter: (a: any, b: any) => String(a.estado).localeCompare(String(b.estado)),
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: stateColor(r.estado) }}>
                      {r.estado}
                    </span>
                  ),
                },
                {
                  title: "Importancia",
                  dataIndex: "importancia",
                  width: 160,
                  sorter: (a: any, b: any) =>
                    (importanceOrder[a.importancia] ?? 99) - (importanceOrder[b.importancia] ?? 99),
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 900, color: importanceColor(r.importancia) }}>
                      {r.importancia}
                    </span>
                  ),
                },
                {
                  title: "",
                  valueType: "option",
                  width: 110,
                  render: (_: any, record: any) => [
                    <Button
                      key="open"
                      size="small"
                      type="primary"
                      style={{ borderRadius: 10, fontWeight: 900 }}
                      onClick={() => {
                        // si más adelante quieres un modal, aquí es el hook
                        console.log("open risk", record.id);
                      }}
                    >
                      Ver
                    </Button>,
                  ],
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
