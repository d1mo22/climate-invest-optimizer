import React, { useState } from "react";
import {
  PageContainer,
  ProCard,
  StatisticCard,
  ProTable,
} from "@ant-design/pro-components";
import { useNavigate } from "react-router-dom";
import { Gauge, Column, Pie, Area } from "@ant-design/plots";
import { Modal, Button, Tag } from "antd";
import { slugify } from "../utils/slugify";

// Add example stores for demonstration purposes
const exampleStores = [
  {
    slug: "tienda-1",
    tienda: "Tienda 1",
    país: "Spain",
    inversión: 1.2,
    ROI: "15.0%",
    riesgosTotales: 5,
    riesgosResueltos: 4,
    riesgosPendientes: 1,
    pctRiesgosResueltos: "80.0%",
    beneficioAnual: 0.18,
    planNextYear: 0.5,
    plan10y: 3.5,
    riesgos: [
      { id: 1, tipo: "Energético", descripcion: "Fallo en suministro eléctrico", estado: "Resuelto", importancia: "Alta", tiendas_afectadas: 3 },
      { id: 2, tipo: "Climático", descripcion: "Inundaciones", estado: "Resuelto", importancia: "Media", tiendas_afectadas: 2 },
      { id: 3, tipo: "Operacional", descripcion: "Fallo en sistemas HVAC", estado: "Pendiente", importancia: "Alta", tiendas_afectadas: 1 },
      { id: 4, tipo: "Regulatorio", descripcion: "Normativa de eficiencia", estado: "Resuelto", importancia: "Baja", tiendas_afectadas: 1 },
      { id: 5, tipo: "Financiero", descripcion: "Fluctuaciones en divisas", estado: "Pendiente", importancia: "Media", tiendas_afectadas: 2 },
    ],
  },
  {
    slug: "tienda-2",
    tienda: "Tienda 2",
    país: "Francia",
    inversión: 1.5,
    ROI: "12.0%",
    riesgosTotales: 6,
    riesgosResueltos: 5,
    riesgosPendientes: 1,
    pctRiesgosResueltos: "83.3%",
    beneficioAnual: 0.2,
    planNextYear: 0.6,
    plan10y: 4.0,
    riesgos: [
      { id: 1, tipo: "Energético", descripcion: "Fallo en suministro eléctrico", estado: "Resuelto", importancia: "Alta", tiendas_afectadas: 3 },
      { id: 2, tipo: "Climático", descripcion: "Olas de calor", estado: "Resuelto", importancia: "Media", tiendas_afectadas: 2 },
      { id: 3, tipo: "Operacional", descripcion: "Fallo en sistemas HVAC", estado: "Pendiente", importancia: "Alta", tiendas_afectadas: 1 },
      { id: 4, tipo: "Regulatorio", descripcion: "Normativa de etiquetado", estado: "Resuelto", importancia: "Baja", tiendas_afectadas: 1 },
      { id: 5, tipo: "Financiero", descripcion: "Fluctuaciones en divisas", estado: "Resuelto", importancia: "Media", tiendas_afectadas: 2 },
      { id: 6, tipo: "Reputacional", descripcion: "Impacto ambiental", estado: "Pendiente", importancia: "Alta", tiendas_afectadas: 3 },
    ],
  },
];

// Adjust StoreDashboard to show store-specific risks and metrics
const initialStore = exampleStores.find((store) => store.slug === "tienda-1") || exampleStores[0];

export default function StoreDashboard() {
  const navigate = useNavigate();
  const [currentStore, setCurrentStore] = useState(initialStore);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Gauge % riesgos resueltos
  const percentRiesgos = currentStore.riesgosTotales
    ? currentStore.riesgosResueltos / currentStore.riesgosTotales
    : 0;

  // Update Gauge configuration to remove arrow and numbers, and reverse the range
  const gaugeConfig = {
    percent: percentRiesgos,
    innerRadius: 0.9,
    range: { color: ["#00ff88", "#2b2b2b"] }, // Reverse colors
    axis: {
      label: null, // Remove numbers
      subTickLine: null, // Remove sub-ticks
      tickLine: null, // Remove ticks
    },
    indicator: undefined, // Correct type for indicator
    statistic: {
      content: {
        formatter: () => `${(percentRiesgos * 100).toFixed(1)}%`,
        style: { fontSize: "18px", color: "#fff" },
      },
    },
  };

  // Pie: Distribución de riesgos
  // (simple Resueltos/Pendientes pie removed — using column + riskTypeConfig instead)

  // Column: Riesgos (resueltos vs pendientes)
  const columnData = [
    { tipo: "Resueltos", cantidad: currentStore.riesgosResueltos },
    { tipo: "Pendientes", cantidad: currentStore.riesgosPendientes },
  ];

  const columnConfig = {
    data: columnData,
    xField: "tipo",
    yField: "cantidad",
    legend: { position: "bottom" as const },
    color: ["#00ff88", "#ff4d4f"],
    tooltip: { showMarkers: false },
  };

  // Risk distribution by type (Pie chart)
  const risksByType = currentStore.riesgos.reduce((acc, risk) => {
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

  // Improved stores percentage (example)
  const tiendasMejoradas = Math.round(currentStore.inversión * 10);
  const tiendasTotales = 20;
  const pctTiendasMejoradas = ((tiendasMejoradas / tiendasTotales) * 100).toFixed(1);

  // Area chart: Investment vs Benefits over time (10 years)
  const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
  const areaData = years.map((year, i) => ({
    year: String(year),
    "Inversión (€M)": Math.round(
      currentStore.inversión * (1.2 - 0.2 * (i / (years.length - 1)))
    ),
    "Beneficios (€M)": Math.round(
      currentStore.beneficioAnual * (0.7 + 0.3 * (i / (years.length - 1)))
    ),
  }));

  const areaConfig = {
    data: areaData,
    xField: "year",
    yField: "Inversión (€M)",
    smooth: true,
    animation: { appear: { animation: "path-in", duration: 1000 } },
    legend: { position: "top" as const },
    tooltip: { shared: true },
  } as any;

  // Tabla detalle de métricas
  const tableData: Array<{
    key: string;
    metrica: string;
    valor: string | number;
  }> = [
    { key: "1", metrica: "Inversión total", valor: `${currentStore.inversión}M€` },
    { key: "2", metrica: "ROI", valor: currentStore.ROI },
    { key: "3", metrica: "Total ahorrado", valor: `${currentStore.beneficioAnual}M€` },
    {
      key: "4",
      metrica: "Payback",
      valor: `${(currentStore.inversión / currentStore.beneficioAnual).toFixed(1)} años`,
    },
    { key: "5", metrica: "Riesgos totales", valor: currentStore.riesgosTotales },
    {
      key: "6",
      metrica: "Riesgos resueltos",
      valor: `${currentStore.riesgosResueltos} (${currentStore.pctRiesgosResueltos})`,
    },
    { key: "7", metrica: "Plan próximo año", valor: `${currentStore.planNextYear}M€` },
    { key: "8", metrica: "Plan 10 años", valor: `${currentStore.plan10y}M€` },
  ];

  // Adjust navigation and hierarchy for store -> country -> Europe
  const countrySlug = slugify(currentStore.país);

  function openRiskModal(risk: any) {
    setSelectedRisk(risk);
    setModalOpen(true);
  }

  function closeRiskModal() {
    setSelectedRisk(null);
    setModalOpen(false);
  }

  function markRiskResolved(id: number) {
    const updated = { ...currentStore } as any;
    const r = updated.riesgos.find((x: any) => x.id === id);
    if (r && r.estado !== "Resuelto") {
      r.estado = "Resuelto";
      // update counts
      updated.riesgosResueltos = Math.min(updated.riesgosTotales, (updated.riesgosResueltos || 0) + 1);
      updated.riesgosPendientes = Math.max(0, (updated.riesgosPendientes || 0) - 1);
      updated.pctRiesgosResueltos = `${((updated.riesgosResueltos / updated.riesgosTotales) * 100).toFixed(1)}%`;
      setCurrentStore(updated);
    }
    closeRiskModal();
  }

  // Move importanceOrder definition inside the component scope
  const importanceOrder: Record<string, number> = { Alta: 1, Media: 2, Baja: 3 };

  return (
    <PageContainer
      header={{
        title: `📊 ${currentStore.tienda} — Dashboard`,
        extra: [
          <button key="country" onClick={() => navigate(`/country/${countrySlug}`)}>
            Ver País
          </button>,
          <button key="all" onClick={() => navigate("/dashboards")}>Europa</button>,
        ],
      }}
    >
      <ProCard direction="column" gutter={[12, 12]} ghost>
        {/* Header Info: Localización */}
        <ProCard bordered size="small">
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>País</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{currentStore.país}</div>
            </div>
            <div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>Tienda</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{currentStore.tienda}</div>
            </div>
          </div>
        </ProCard>

        {/* KPIs + Gauge */}
        <ProCard split="vertical" ghost>
          <ProCard colSpan="70%" gutter={12} wrap ghost>
            <StatisticCard
              bordered
              statistic={{
                title: "Inversión (€M)",
                value: currentStore.inversión,
                precision: 1,
              }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "ROI",
                value: parseFloat(currentStore.ROI),
                precision: 1,
                suffix: "%",
              }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "Payback",
                value: (currentStore.inversión / currentStore.beneficioAnual).toFixed(1),
                suffix: "años",
              }}
              style={{ minWidth: 220 }}
            />
            <StatisticCard
              bordered
              statistic={{
                title: "Tiendas mejoradas",
                value: parseFloat(pctTiendasMejoradas),
                precision: 1,
                suffix: "%",
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
              {currentStore.riesgosResueltos} / {currentStore.riesgosTotales} riesgos resueltos
            </div>
          </ProCard>
        </ProCard>

        {/* Gráficos: Riesgos y Evolución */}
        <ProCard split="vertical" ghost style={{ minHeight: 420 }}>
          <ProCard
            colSpan="50%"
            bordered
            title="Inversión vs Beneficios (2026–2035)"
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
              title="Distribución de riesgos por tipo"
              size="small"
              style={{ flex: 1 }}
              bodyStyle={{ padding: 16, height: "100%" }}
            >
              <Pie {...riskTypeConfig} />
            </ProCard>
          </ProCard>
        </ProCard>

        {/* Tabla de métricas detalladas */}
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

        {/* Riesgos Pendientes de Solventar */}
        <ProCard bordered title="⚠️ Riesgos Pendientes de Solventar" size="small" style={{ marginTop: 12 }}>
          <ProTable
            rowKey="id"
            dataSource={currentStore.riesgos.filter((r) => r.estado === "Pendiente")}
            search={false}
            options={false}
            pagination={false}
            size="small"
            columns={[
              { title: "Tipo", dataIndex: "tipo", width: "20%" },
              { title: "Descripción", dataIndex: "descripcion", width: "50%" },
              {
                title: "Importancia",
                dataIndex: "importancia",
                width: "15%",
                render: (_, record) => (
                  <span
                    style={{
                      color:
                        record.importancia === "Alta"
                          ? "#ff4d4f"
                          : record.importancia === "Media"
                          ? "#faad14"
                          : "#52c41a",
                    }}
                  >
                    {record.importancia}
                  </span>
                ),
              },
            ]}
            toolBarRender={false}
          />
        </ProCard>

        {/* Análisis Completo de Riesgos */}
        <ProCard bordered title="📋 Análisis Completo de Riesgos" size="small" style={{ marginTop: 12 }}>
          <ProTable
            rowKey="id"
            dataSource={currentStore.riesgos}
            search={false}
            options={false}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              { title: "Tipo", dataIndex: "tipo", width: "20%", sorter: (a, b) => a.tipo.localeCompare(b.tipo) },
              { title: "Descripción", dataIndex: "descripcion", width: "50%" },
              {
                title: "Estado",
                dataIndex: "estado",
                width: "15%",
                sorter: (a, b) => a.estado.localeCompare(b.estado),
                render: (_, record) => (
                  <span
                    style={{
                      color: record.estado === "Resuelto" ? "#52c41a" : "#ff4d4f",
                      fontWeight: "bold",
                    }}
                  >
                    {record.estado}
                  </span>
                ),
              },
              {
                title: "Importancia",
                dataIndex: "importancia",
                width: "15%",
                sorter: (a, b) => importanceOrder[a.importancia] - importanceOrder[b.importancia],
                render: (_, record) => (
                  <span
                    style={{
                      color:
                        record.importancia === "Alta"
                          ? "#ff4d4f"
                          : record.importancia === "Media"
                          ? "#faad14"
                          : "#52c41a",
                    }}
                  >
                    {record.importancia}
                  </span>
                ),
              },
              {
                title: "Acciones",
                dataIndex: "actions",
                width: "15%",
                render: (_, record) => (
                  <Button type="link" onClick={() => openRiskModal(record)}>
                    Ver solución
                  </Button>
                ),
              },
            ]}
            toolBarRender={false}
          />
        </ProCard>
      </ProCard>

      <Modal
        title={selectedRisk ? `Solución: ${selectedRisk.tipo}` : "Solución"}
        open={modalOpen}
        onCancel={closeRiskModal}
        footer={null}
      >
        {selectedRisk ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{selectedRisk.descripcion}</div>
              <div style={{ marginTop: 6 }}>
                <Tag color={selectedRisk.importancia === "Alta" ? "red" : selectedRisk.importancia === "Media" ? "orange" : "green"}>
                  {selectedRisk.importancia}
                </Tag>
                <Tag>{selectedRisk.estado}</Tag>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Plan de acción</div>
              <ol style={{ marginLeft: 18 }}>
                {(selectedRisk.planSteps || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div>
              <div style={{ fontWeight: 600 }}>Recursos</div>
              <div>{selectedRisk.recursos || "—"}</div>
            </div>

            <div>
              <div style={{ fontWeight: 600 }}>Tiempo estimado</div>
              <div>{selectedRisk.tiempoEstimado || "—"}</div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              {selectedRisk.estado !== "Resuelto" && (
                <Button type="primary" onClick={() => markRiskResolved(selectedRisk.id)}>
                  Marcar Resuelto
                </Button>
              )}
              <Button onClick={closeRiskModal}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>

    </PageContainer>
  );
}