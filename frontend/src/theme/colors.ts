export const colors = {
  // Primarios
  primary: {
    green: "#00ff88",
    blue: "#4b6bfd",
    gradient:
      "linear-gradient(135deg, rgba(0,255,136,0.95), rgba(75,107,253,0.95))",
  },

  // Semánticos
  status: {
    success: "#52c41a",
    warning: "#faad14",
    error: "#ff4d4f",
    info: "#1890ff",
  },

  // Fondos
  background: {
    primary: "#0b0b0f",
    secondary: "#242424",
    card: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    overlay: "rgba(0,0,0,0.75)",
  },

  // Texto
  text: {
    primary: "rgba(255,255,255,0.92)",
    secondary: "rgba(255,255,255,0.72)",
    muted: "rgba(255,255,255,0.55)",
  },

  // Bordes
  border: {
    light: "rgba(255,255,255,0.12)",
    subtle: "rgba(255,255,255,0.08)",
  },
} as const;

// Funciones de color para riesgos
export const getRiskColor = (
  level: "Alta" | "Media" | "Baja" | "Alto" | "Medio" | "Bajo"
): string => {
  const map: Record<string, string> = {
    Alta: colors.status.error,
    Alto: colors.status.error,
    Media: colors.status.warning,
    Medio: colors.status.warning,
    Baja: colors.status.success,
    Bajo: colors.status.success,
  };
  return map[level] || colors.text.muted;
};

export const getStatusColor = (status: "Resuelto" | "Pendiente"): string =>
  status === "Resuelto" ? colors.primary.green : colors.status.error;

export const getScoreColor = (score: number): string =>
  score > 80
    ? colors.status.error
    : score > 50
      ? colors.status.warning
      : colors.status.success;

export const getPctColor = (pct: number): string =>
  pct >= 0.8
    ? colors.primary.green
    : pct >= 0.5
      ? colors.status.warning
      : colors.status.error;

// Picks a readable foreground color for a given background.
// Works best with hex colors like #RRGGBB.
export const getReadableTextColor = (
  background: string,
  opts: { light?: string; dark?: string } = {}
): string => {
  const light = opts.light ?? "#ffffff";
  const dark = opts.dark ?? colors.background.primary;

  const hex = (background || "").trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return light;

  const value = m[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  // YIQ perceived brightness
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? dark : light;
};
