import React, { useMemo, useState } from "react";
import { Alert, Button, Collapse, Divider, Form, InputNumber, Modal, Radio, Select, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { optimizationService } from "../services/optimizationService";
import type { ShopWithCluster } from "../services/shopService";
import { shopService } from "../services/shopService";
import { ApiError } from "../services/apiClient";

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
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Tienda", dataIndex: "location", ellipsis: true },
    { title: "Riesgo", dataIndex: "totalRisk", width: 110, render: (v) => Number(v || 0).toFixed(2) },
  ];

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
        footer={
          <>
            <Button onClick={closeAll}>Cancelar</Button>
            <Button type="primary" loading={running} onClick={runOptimization}>
              Optimizar
            </Button>
          </>
        }
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ algorithm: "basic", budget: 10000, priorityRiskIds: [] }}
        >
          <Form.Item label="Algoritmo" name="algorithm" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="basic">Basic</Radio.Button>
              <Radio.Button value="plus">Plus</Radio.Button>
              <Radio.Button value="premium">Premium</Radio.Button>
            </Radio.Group>
          </Form.Item>

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
      </Modal>

      <Modal
        title="Resultado de la optimización"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={900}
        footer={
          <>
            <Button onClick={() => setPreviewOpen(false)}>Rechazar</Button>
            <Button type="primary" loading={applying} onClick={applyChanges}>
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
                        { title: "Tipo", dataIndex: "type", key: "type", width: 120 },
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
