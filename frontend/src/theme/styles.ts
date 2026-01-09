import { colors } from "./colors";
import type { CSSProperties } from "react";

export const cardStyles: CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  background: colors.background.card,
  border: `1px solid ${colors.border.light}`,
};

export const buttonStyles = {
  primary: {
    cursor: "pointer",
    borderRadius: 12,
    padding: "10px 12px",
    border: `1px solid ${colors.border.light}`,
    background: colors.primary.gradient,
    color: "#0b0b0f",
    fontWeight: 900,
    boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
  } as CSSProperties,

  subtle: {
    cursor: "pointer",
    borderRadius: 12,
    padding: "10px 12px",
    border: `1px solid ${colors.border.subtle}`,
    background: "rgba(255,255,255,0.06)",
    color: colors.text.primary,
    fontWeight: 800,
  } as CSSProperties,
};

export const pillStyles = (color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${colors.border.subtle}`,
  background: "rgba(255,255,255,0.06)",
  color,
  fontWeight: 900,
  fontSize: 12,
});

export const pageBackground: CSSProperties = {
  minHeight: "100%",
  padding: 8,
  borderRadius: 18,
  background: `
    radial-gradient(900px 520px at 15% 5%, rgba(0,255,136,0.10), transparent 60%),
    radial-gradient(820px 520px at 85% 25%, rgba(75,107,253,0.12), transparent 55%)
  `,
};
