import { useState, useEffect } from "react";
import { PageContainer, ProCard, ProTable } from "@ant-design/pro-components";
import { useNavigate } from "react-router-dom";
import { slugify } from "../utils/slugify";
import { Gauge, DualAxes, Column, Pie } from "@ant-design/plots";
import { shopService, dashboardService } from "../services";
import { Spin, Alert } from "antd";
import { computeSuggestedInvestment } from "../utils/suggestedInvestment";

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
  "Albania": "Albania",
  "Serbia": "Serbia",
  "Montenegro": "Montenegro",
  "North Macedonia": "Macedonia del Norte",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Kosovo": "Kosovo",
  "Andorra": "Andorra",
  "Monaco": "Mónaco",
  "San Marino": "San Marino",
  "Liechtenstein": "Liechtenstein",
  "Luxembourg": "Luxemburgo",
  "Malta": "Malta",
  "Cyprus": "Chipre",
};

// Función para traducir país de inglés a español
const translateCountry = (country: string): string => {
  return COUNTRY_EN_TO_ES[country] || country;
};

type Row = {
  key: number;
  país: string;
  riesgoMedio: number;
  tiendasTotales: number;
  tiendasAltoRiesgo: number;
  tiendasMejoradas: number;
  pctCobertura: number;
  inversion: number;
};

export default function DashBoards() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Row[]>([]);
  const [coverage, setCoverage] = useState<number>(0);
  const [statsTotals, setStatsTotals] = useState<{
    totalInvestment: number;
    totalShops: number;
    totalClusters: number;
    highRiskShops: number;
    averageRisk: number;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [shopsResponse, stats] = await Promise.all([
        // Backend valida page_size<=100, así evitamos 400.
        shopService.getShops({ page_size: 100 }),
        dashboardService.getStats(),
      ]);

      // Fuente de verdad para coherencia: risk-coverage por tienda
      const coverageResults = await Promise.all(
        shopsResponse.items.map(async (shop) => {
          try {
            const coverage = await shopService.getRiskCoverage(shop.id);
            const suggestedInvestment = computeSuggestedInvestment(coverage.risks || []);

            return {
              shopId: shop.id,
              totalRisks: coverage.total_risks,
              coveredRisks: coverage.covered_risks,
              uncoveredRisks: coverage.uncovered_risks,
              coveragePct: coverage.coverage_percentage,
              suggestedInvestment,
            };
          } catch {
            return null;
          }
        })
      );

      const coverageByShopId = new Map<number, NonNullable<(typeof coverageResults)[number]>>();
      let sumTotalRisks = 0;
      let sumCoveredRisks = 0;
      for (const r of coverageResults) {
        if (!r) continue;
        coverageByShopId.set(r.shopId, r);
        sumTotalRisks += r.totalRisks;
        sumCoveredRisks += r.coveredRisks;
      }

      const totalShops = shopsResponse.pagination.total_items || shopsResponse.items.length;
      const totalInvestment = stats?.total_investment ?? 0;
      const coveragePct = sumTotalRisks > 0 ? (sumCoveredRisks / sumTotalRisks) * 100 : (stats?.coverage_percentage ?? 0);

      setCoverage(coveragePct);
      setStatsTotals({
        totalInvestment,
        totalShops,
        totalClusters: stats?.total_clusters ?? 0,
        highRiskShops: stats?.high_risk_shops ?? 0,
        averageRisk: stats?.average_risk ?? 0,
      });

      // Group shops by country using the country field from database
      // Translate from English (DB) to Spanish (display)
      const countryMap = new Map<
        string,
        {
          shops: typeof shopsResponse.items;
          avgRisk: number;
          highRisk: number;
          totalRisks: number;
          coveredRisks: number;
          suggestedInvestment: number;
          improvedShops: number;
        }
      >();
      shopsResponse.items.forEach((shop) => {
        const country = translateCountry(shop.country || "Desconocido");
        const current =
          countryMap.get(country) ||
          ({ shops: [], avgRisk: 0, highRisk: 0, totalRisks: 0, coveredRisks: 0, suggestedInvestment: 0, improvedShops: 0 } as any);
        const risk = shop.totalRisk || 0;
        const newCount = current.shops.length + 1;
        const newAvg = (current.avgRisk * current.shops.length + risk) / newCount;
        const newHigh = current.highRisk + (risk > 0.7 ? 1 : 0);

        const cov = coverageByShopId.get(shop.id);
        const totalRisks = current.totalRisks + (cov?.totalRisks ?? 0);
        const coveredRisks = current.coveredRisks + (cov?.coveredRisks ?? 0);
        const suggestedInvestment = current.suggestedInvestment + (cov?.suggestedInvestment ?? 0);
        const improvedShops = current.improvedShops + (cov && cov.coveredRisks > 0 ? 1 : 0);
        countryMap.set(country, {
          shops: [...current.shops, shop],
          avgRisk: newAvg,
          highRisk: newHigh,
          totalRisks,
          coveredRisks,
          suggestedInvestment,
          improvedShops,
        });
      });

      // Mostrar todos los países del catálogo, aunque no haya tiendas.
      // Esto evita que solo aparezca España cuando la BD solo tiene tiendas de un país.
      // Catálogo base + países reales detectados en la respuesta.
      const allCountries = Array.from(
        new Set<string>([...Object.values(COUNTRY_EN_TO_ES), ...Array.from(countryMap.keys())])
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      const rows: Row[] = allCountries.map((country, index) => {
        const info =
          countryMap.get(country) ||
          ({ shops: [], avgRisk: 0, highRisk: 0, totalRisks: 0, coveredRisks: 0, suggestedInvestment: 0, improvedShops: 0 } as any);
        const pctCobertura = info.totalRisks > 0 ? (info.coveredRisks / info.totalRisks) * 100 : 0;
        const estimatedInvestment = Math.round(info.suggestedInvestment || 0);
        const improved = info.improvedShops || 0;
        return {
          key: index + 1,
          país: country,
          riesgoMedio: Number((info.avgRisk || 0).toFixed(2)),
          tiendasTotales: info.shops.length,
          tiendasAltoRiesgo: info.highRisk,
          tiendasMejoradas: improved,
          pctCobertura,
          inversion: estimatedInvestment,
        };
      });

      rows.sort((a, b) => b.inversion - a.inversion);
      setData(rows);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const inversionTotal = data.reduce((s, r) => s + r.inversion, 0);

  const euroM = (v: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);

  const gaugeConfig = {
    percent: coverage / 100,
    innerRadius: 0.9,
    range: { color: ["#00ff88", "#2b2b2b"] },
    indicator: undefined,
    statistic: {
      content: {
        formatter: () => `${coverage.toFixed(1)}%`,
        style: { fontSize: "18px", color: "#fff", fontWeight: 800 },
      },
    },
  };

  const years = Array.from({ length: 10 }).map((_, i) => 2026 + i);
  const capex10yTotal = inversionTotal;
  const beneficioAnualEstimado = inversionTotal * 0.12;

  const invSeries = years.map((y, i) => ({
    year: String(y),
    tipo: "Inversión (€)",
    valor: Math.round((capex10yTotal * (1 - i / years.length)) / years.length),
  }));

  const benSeries = years.map((y, i) => {
    const growth = 1 + (i / years.length) * 0.3;
    return {
      year: String(y),
      tipo: "Beneficio (€)",
      valor: Math.round(beneficioAnualEstimado * growth),
    };
  });

  const dualData = [...invSeries, ...benSeries];

  const dualConfig: any = {
    data: dualData,
    xField: "year",
    yField: "valor",
    seriesField: "tipo",
    legend: { position: "top" as const },
    smooth: true,
    color: ["#4B6BFD", "#00ff88"],
  };

  const riskPorPais = data
    .slice(0, 10)
    .map((r) => ({ país: r.país, riesgo: r.riesgoMedio }))
    .sort((a, b) => b.riesgo - a.riesgo);

  const columnConfig = {
    data: riskPorPais,
    xField: "país",
    yField: "riesgo",
    label: {
      position: "top" as const,
      formatter: (d: any) => d.riesgo.toFixed(2),
      style: { fill: "#fff", fontSize: 11 },
    },
    color: "#00ff88",
    xAxis: { label: { autoRotate: true } },
  };

  const invPorTipo = [
    { tipo: "Natural", valor: inversionTotal * 0.2 },
    { tipo: "Material", valor: inversionTotal * 0.6 },
    { tipo: "Inmaterial", valor: inversionTotal * 0.2 },
  ];

  const pieConfig = {
    data: invPorTipo,
    angleField: "valor",
    colorField: "tipo",
    radius: 0.9,
    innerRadius: 0.6,
    label: {
      type: "spider" as const,
      formatter: (d: any) => `${d.tipo}: ${euroM(d.valor)}M€`,
      style: { fill: "#fff" },
    },
    color: ["#00ff88", "#4B6BFD", "#FDB022"],
    legend: { position: "bottom" as const },
  };

  const columns: any[] = [
    {
      title: "País",
      dataIndex: "país",
      key: "país",
      width: 150,
      render: (text: string) => (
        <span style={{ fontWeight: 800, color: "#00ff88" }}>{text}</span>
      ),
    },
    {
      title: "Riesgo Medio",
      dataIndex: "riesgoMedio",
      key: "riesgoMedio",
      width: 120,
      sorter: (a: any, b: any) => a.riesgoMedio - b.riesgoMedio,
      render: (val: number) => <span style={{ color: "#fff" }}>{val.toFixed(2)}</span>,
    },
    {
      title: "Tiendas",
      dataIndex: "tiendasTotales",
      key: "tiendasTotales",
      width: 100,
      sorter: (a: any, b: any) => a.tiendasTotales - b.tiendasTotales,
    },
    {
      title: "Alto riesgo",
      dataIndex: "tiendasAltoRiesgo",
      key: "tiendasAltoRiesgo",
      width: 120,
      render: (val: number) => <span style={{ color: "#ff4d4f" }}>{val}</span>,
    },
    {
      title: "Cobertura %",
      dataIndex: "pctCobertura",
      key: "pctCobertura",
      width: 120,
      render: (val: number) => <span style={{ color: "#4B6BFD" }}>{val.toFixed(1)}%</span>,
    },
    {
      title: "Inversión estimada",
      dataIndex: "inversion",
      key: "inversion",
      width: 140,
      sorter: (a: any, b: any) => a.inversion - b.inversion,
      render: (val: number) => <span style={{ color: "#00ff88" }}>{euroM(val)} €</span>,
    },
  ];

  if (loading) {
    return (
      <PageContainer title="Dashboard Global">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard Global">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard Global – Optimización de Inversiones Climáticas">
      <ProCard gutter={[16, 16]} wrap>
        {/* Summary Cards */}
        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00ff88" }}>
              {euroM(inversionTotal)} €
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Inversión Total
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#4B6BFD" }}>
              {statsTotals?.totalClusters ?? 0}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Clusters
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
              {statsTotals?.highRiskShops ?? 0}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Tiendas alto riesgo
            </div>
          </div>
        </ProCard>

        <ProCard colSpan={6} bordered style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00ff88" }}>
              {(statsTotals?.averageRisk ?? 0).toFixed(2)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Riesgo medio
            </div>
          </div>
        </ProCard>

        {/* Gauge Chart */}
        <ProCard colSpan={12} title="Riesgos Resueltos" bordered style={cardStyle}>
          <div style={{ height: 240 }}>
            <Gauge {...gaugeConfig} />
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#999" }}>
            Cobertura de medidas basada en tiendas con alguna medida aplicada
          </div>
        </ProCard>

        {/* Column Chart */}
        <ProCard colSpan={12} title="Riesgo medio por país" bordered style={cardStyle}>
          <div style={{ height: 260 }}>
            <Column {...columnConfig} />
          </div>
        </ProCard>

        {/* Dual Axes Chart */}
        <ProCard colSpan={16} title="Proyección 10 años" bordered style={cardStyle}>
          <div style={{ height: 300 }}>
            <DualAxes {...dualConfig} />
          </div>
        </ProCard>

        {/* Pie Chart */}
        <ProCard colSpan={8} title="Inversión por Tipo de Medida" bordered style={cardStyle}>
          <div style={{ height: 300 }}>
            <Pie {...pieConfig} />
          </div>
        </ProCard>

        {/* Table */}
        <ProCard colSpan={24} bordered style={cardStyle}>
          <ProTable<Row>
            columns={columns}
            dataSource={data}
            search={false}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} países`,
            }}
            rowKey="key"
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/${slugify(record.país)}`),
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
