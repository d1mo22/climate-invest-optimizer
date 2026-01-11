import React, { useMemo, useState } from "react";
import { Alert, Button, Collapse, Divider, Form, InputNumber, Modal, Radio, Select, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CrownOutlined, RocketOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { optimizationService } from "../services/optimizationService";
import type { ShopWithCluster } from "../services/shopService";
import { shopService } from "../services/shopService";
import { ApiError } from "../services/apiClient";
import { colors, getReadableTextColor } from "../theme/colors";
import { buttonStyles, cardStyles } from "../theme/styles";

export type OptimizationAlgorithm = "basic" | "plus" | "premium";

export type RiskOption = { id: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;

  title: string;

  // Shops available for optimization
  shops: ShopWithCluster[];

  // If provided, optimization runs only for these shops. When set, the shop selector is hidden.
  fixedShopIds?: number[];

  // Risk IDs you can prioritize (optional)
  riskOptions?: RiskOption[];

  // Called after user accepts and changes are applied
  onApplied?: () => Promise<void> | void;
};

const algoToStrategy: Record<OptimizationAlgorithm, "greedy" | "knapsack" | "weighted"> = {
  basic: "greedy",
  plus: "knapsack",
  premium: "weighted",
};

type PreviewItem = {
  shopId: number;
  shopLocation: string;
  measures: Array<{ name: string; cost: number; type: string; riskReductionPct: number; priority: number }>;
  totalCost: number;
};

export const OptimizeBudgetModal: React.FC<Props> = ({
  open,
  onClose,
  title,
  shops,
  fixedShopIds,
  riskOptions,
  onApplied,
}) => {
  const [form] = Form.useForm();

  const selectedAlgo = Form.useWatch("algorithm", form) as OptimizationAlgorithm | undefined;

  const [selectedShopIds, setSelectedShopIds] = useState<number[]>(fixedShopIds ?? []);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ items: PreviewItem[]; usedStrategy: string; totalCost: number; remainingBudget: number } | null>(null);

  const canSelectShops = !fixedShopIds?.length;

  const shopRows = useMemo(
    () =>
      shops.map((s) => ({
        key: s.id,
        id: s.id,
        location: s.location,
        country: s.country,
        totalRisk: s.totalRisk ?? 0,
      })),
    [shops]
  );

  const shopColumns: ColumnsType<any> = [
    { title: "ID", dataIndex: "id", width: 70, render: (v) => <span style={{ color: colors.text.primary, fontWeight: 800 }}>{v}</span> },
    { title: "Tienda", dataIndex: "location", ellipsis: true, render: (v) => <span style={{ color: colors.text.primary, fontWeight: 800 }}>{v}</span> },
    { title: "Riesgo", dataIndex: "totalRisk", width: 110, render: (v) => <span style={{ color: colors.primary.green, fontWeight: 900 }}>{Number(v || 0).toFixed(2)}</span> },
  ];

  const algoHint = useMemo(() => {
    const algo = selectedAlgo ?? "basic";
    if (algo === "plus") {
      return {
        title: "Plus (Knapsack)",
        desc: "Más preciso con presupuesto limitado; puede tardar más.",
        icon: <RocketOutlined />,
      };
    }
    if (algo === "premium") {
      return {
        title: "Premium (Weighted)",
        desc: "Optimiza ponderando prioridades; ideal si marcas riesgos prioritarios.",
        icon: <CrownOutlined />,
      };
    }
    return {
      title: "Basic (Greedy)",
      desc: "Rápido y simple; buena opción para una primera propuesta.",
      icon: <ThunderboltOutlined />,
    };
  }, [selectedAlgo]);

  const buildPreviewItems = (result: any): PreviewItem[] => {
    const recs = Array.isArray(result?.shop_recommendations) ? result.shop_recommendations : [];

    return recs.map((r: any) => {
      const measures = Array.isArray(r?.measures) ? r.measures : [];
      const mappedMeasures = measures.map((m: any) => ({
        name: m?.measure?.name ?? m?.name ?? "",
        cost: Number(m?.measure?.estimatedCost ?? m?.measure?.estimated_cost ?? m?.cost ?? 0),
        type: String(m?.measure?.type ?? m?.type ?? ""),
        riskReductionPct: Number(m?.risk_reduction_percentage ?? m?.expectedRiskReduction ?? 0),
        priority: Number(m?.priority ?? 0),
      })).filter((mm: any) => !!mm.name);

      const totalCost = Number(r?.estimated_investment ?? 0);

      return {
        shopId: Number(r?.shop_id ?? 0),
        shopLocation: String(r?.shop_location ?? ""),
        measures: mappedMeasures,
        totalCost,
      };
    }).filter((x: PreviewItem) => x.shopId > 0);
  };

  const resetState = () => {
    setRunning(false);
    setApplying(false);
    setPreviewOpen(false);
    setPreview(null);
    if (fixedShopIds?.length) {
      setSelectedShopIds(fixedShopIds);
    } else {
      setSelectedShopIds([]);
    }
    form.resetFields();
  };

  const closeAll = () => {
    resetState();
    onClose();
  };

  const runOptimization = async () => {
    const values = await form.validateFields();

    const algo: OptimizationAlgorithm = values.algorithm;
    const budget: number = values.budget;
    const priorityRiskIds: number[] = values.priorityRiskIds ?? [];

    const shopIds = fixedShopIds?.length ? fixedShopIds : selectedShopIds;

    if (!shopIds.length) {
      message.warning("Selecciona al menos una tienda");
      return;
    }

    try {
      setRunning(true);
      const result = await optimizationService.optimizeBudget({
        shop_ids: shopIds,
        max_budget: budget,
        strategy: algoToStrategy[algo],
        risk_priorities: priorityRiskIds,
      });

      const items = buildPreviewItems(result);
      setPreview({
        items,
        usedStrategy: result?.strategy_used ?? algoToStrategy[algo],
        totalCost: Number(result?.total_cost ?? 0),
        remainingBudget: Number(result?.remaining_budget ?? 0),
      });

      setPreviewOpen(true);
    } catch (e) {
      console.error("Optimization failed", e);
      if (e instanceof ApiError) {
        message.error(`No se pudo optimizar (${e.status}): ${e.message}`);
      } else {
        message.error("No se pudo optimizar");
      }
    } finally {
      setRunning(false);
    }
  };

  const applyChanges = async () => {
    if (!preview) return;

    // group measures by shop
    const byShop = new Map<number, string[]>();
    for (const item of preview.items) {
      const names = item.measures.map((m) => m.name);
      if (!names.length) continue;
      byShop.set(item.shopId, names);
    }

    if (byShop.size === 0) {
      message.info("No hay medidas nuevas para aplicar");
      setPreviewOpen(false);
      return;
    }

    try {
      setApplying(true);

      for (const [shopId, measureNames] of byShop.entries()) {
        await shopService.applyMeasures(shopId, measureNames);
      }

      message.success("Cambios aplicados y guardados");
      setPreviewOpen(false);
      closeAll();

      await onApplied?.();
    } catch (e) {
      console.error("Apply optimization changes failed", e);
      if (e instanceof ApiError) {
        message.error(`No se pudieron aplicar cambios (${e.status}): ${e.message}`);
      } else {
        message.error("No se pudieron aplicar cambios");
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Modal
        title={title}
        open={open}
        onCancel={closeAll}
        maskStyle={{ backgroundColor: colors.background.overlay }}
        styles={{
          content: {
            background: colors.background.primary,
            borderRadius: 18,
            border: `1px solid ${colors.border.light}`,
            boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
          },
          header: { background: "transparent", borderBottom: `1px solid ${colors.border.subtle}` },
          body: { background: "transparent" },
          footer: { background: "transparent", borderTop: `1px solid ${colors.border.subtle}` },
        }}
        footer={
          <>
            <Button style={buttonStyles.subtle} onClick={closeAll}>
              Cancelar
            </Button>
            <Button type="primary" style={buttonStyles.primary} loading={running} onClick={runOptimization} icon={<ThunderboltOutlined />}>
              Optimizar
            </Button>
          </>
        }
        width={900}
      >
        <div style={cardStyles}>
          <div style={{ padding: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ algorithm: "basic", budget: 10000, priorityRiskIds: [] }}
        >
          <Form.Item label="Algoritmo" name="algorithm" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="basic">
                <ThunderboltOutlined /> Basic
              </Radio.Button>
              <Radio.Button value="plus">
                <RocketOutlined /> Plus
              </Radio.Button>
              <Radio.Button value="premium">
                <CrownOutlined /> Premium
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Alert
            showIcon
            type="info"
            message={
              <span style={{ fontWeight: 900, color: colors.text.primary }}>
                {algoHint.icon} {algoHint.title}
              </span>
            }
            description={<span style={{ color: colors.text.secondary }}>{algoHint.desc}</span>}
            style={{ marginBottom: 12, border: `1px solid ${colors.border.subtle}`, background: "rgba(255,255,255,0.04)" }}
          />

          <Form.Item label="Presupuesto máximo (€)" name="budget" rules={[{ required: true, message: "Presupuesto requerido" }]}>
            <InputNumber min={1} style={{ width: 260 }} />
          </Form.Item>

          <Form.Item label="Riesgos prioritarios (opcional)" name="priorityRiskIds">
            <Select
              mode="multiple"
              allowClear
              placeholder="Selecciona riesgos prioritarios"
              options={(riskOptions ?? []).map((r) => ({ value: r.id, label: r.label }))}
            />
          </Form.Item>

          {canSelectShops && (
            <>
              <Divider />
              <Typography.Text strong>Selecciona tiendas del país</Typography.Text>
              <Table
                style={{ marginTop: 8 }}
                size="small"
                columns={shopColumns}
                dataSource={shopRows}
                pagination={{ pageSize: 8 }}
                rowSelection={{
                  selectedRowKeys: selectedShopIds,
                  onChange: (keys) => setSelectedShopIds(keys as number[]),
                }}
              />
            </>
          )}

          {!canSelectShops && fixedShopIds?.length ? (
            <Alert
              type="info"
              showIcon
              message={`Optimización para ${fixedShopIds.length} tienda(s)`}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Form>
          </div>
        </div>
      </Modal>

      <Modal
        title="Resultado de la optimización"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        maskStyle={{ backgroundColor: colors.background.overlay }}
        styles={{
          content: {
            background: colors.background.primary,
            borderRadius: 18,
            border: `1px solid ${colors.border.light}`,
            boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
          },
          header: { background: "transparent", borderBottom: `1px solid ${colors.border.subtle}` },
          body: { background: "transparent" },
          footer: { background: "transparent", borderTop: `1px solid ${colors.border.subtle}` },
        }}
        width={900}
        footer={
          <>
            <Button style={buttonStyles.subtle} onClick={() => setPreviewOpen(false)}>
              Rechazar
            </Button>
            <Button type="primary" style={buttonStyles.primary} loading={applying} onClick={applyChanges} icon={<ThunderboltOutlined />}>
              Aceptar y aplicar
            </Button>
          </>
        }
      >
        {!preview ? (
          <Alert type="warning" showIcon message="No hay datos de resultado" />
        ) : (
          <>
            <Typography.Paragraph>
              <strong>Estrategia:</strong> {preview.usedStrategy} — <strong>Coste total:</strong> {preview.totalCost.toLocaleString("es-ES")} € — <strong>Presupuesto restante:</strong> {preview.remainingBudget.toLocaleString("es-ES")} €
            </Typography.Paragraph>

            {preview.items.length === 0 ? (
              <Alert type="info" showIcon message="No hay medidas recomendadas (quizá ya están aplicadas o el presupuesto es bajo)." />
            ) : (
              <Collapse accordion>
                {preview.items.map((item) => (
                  <Collapse.Panel
                    key={item.shopId}
                    header={`${item.shopLocation || "Tienda"} (ID ${item.shopId}) — ${item.totalCost.toLocaleString("es-ES")} €`}
                  >
                    <Table
                      size="small"
                      pagination={false}
                      rowKey={(r) => r.name}
                      dataSource={item.measures}
                      columns={[
                        { title: "Medida", dataIndex: "name", key: "name", ellipsis: true },
                        {
                          title: "Tipo",
                          dataIndex: "type",
                          key: "type",
                          width: 120,
                          render: (t) => {
                            const v = String(t || "").toLowerCase();
                            const tagColor = v === "natural" ? colors.primary.green : v === "material" ? colors.primary.blue : "gold";
                            const fg = typeof tagColor === "string" && tagColor.startsWith("#")
                              ? getReadableTextColor(tagColor)
                              : colors.text.primary;
                            return (
                              <Tag
                                color={tagColor}
                                style={{
                                  fontWeight: 900,
                                  color: fg,
                                  borderColor: "transparent",
                                }}
                              >
                                {t}
                              </Tag>
                            );
                          },
                        },
                        { title: "Coste", dataIndex: "cost", key: "cost", width: 120, render: (v) => `${Number(v || 0).toLocaleString("es-ES")} €` },
                        { title: "Reducción %", dataIndex: "riskReductionPct", key: "riskReductionPct", width: 120, render: (v) => `${Number(v || 0).toFixed(1)}%` },
                        { title: "Prioridad", dataIndex: "priority", key: "priority", width: 110 },
                      ]}
                    />
                  </Collapse.Panel>
                ))}
              </Collapse>
            )}
          </>
        )}
      </Modal>
    </>
  );
};
