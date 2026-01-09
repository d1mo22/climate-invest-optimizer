import { Gauge } from "@ant-design/plots";
import { colors } from "../../theme/colors";

type RiskGaugeProps = {
  resolved: number;
  total: number;
  size?: number;
};

export function RiskGauge({ resolved, total, size = 190 }: RiskGaugeProps) {
  const percent = total > 0 ? resolved / total : 0;

  const config = {
    percent,
    innerRadius: 0.9,
    range: { color: ["#2b2b2b", colors.primary.green] },
    indicator: false as const,
    statistic: {
      content: {
        formatter: () => `${(percent * 100).toFixed(1)}%`,
        style: { fontSize: "18px", color: "#fff", fontWeight: 900 },
      },
    },
  };

  return (
    <div style={{ width: size, height: size }}>
      <Gauge {...config} />
    </div>
  );
}
