import { pillStyles } from "../../theme/styles";
import { getRiskColor, getStatusColor } from "../../theme/colors";
import type { RiskLevel, RiskImpact, RiskStatus } from "../../types";

type StatusBadgeProps = {
  value: string;
  type: "risk" | "status";
};

export function StatusBadge({ value, type }: StatusBadgeProps) {
  const color =
    type === "risk"
      ? getRiskColor(value as RiskLevel | RiskImpact)
      : getStatusColor(value as RiskStatus);

  return (
    <span style={pillStyles(color)}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: color,
        }}
      />
      {value}
    </span>
  );
}
