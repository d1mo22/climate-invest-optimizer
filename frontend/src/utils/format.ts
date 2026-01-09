/**
 * Formatea un número como euros en millones
 */
export const formatEuroM = (v: number): string =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);

/**
 * Formatea un número como moneda EUR
 */
export const formatCurrency = (v: number): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

/**
 * Parsea un string de ROI a número
 */
export const parseRoi = (roi: string): number => parseFloat(roi);

/**
 * Limita un valor entre min y max
 */
export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * Clamp entre 0 y 1
 */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Interpolación lineal
 */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Convierte RGB a hex
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) =>
    Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Genera un color de rojo a verde basado en t (0=rojo, 1=verde)
 */
export const redToGreen = (t: number): string => {
  t = clamp01(t);
  const r = lerp(220, 0, t);
  const g = lerp(40, 200, t);
  const b = lerp(60, 80, t);
  return rgbToHex(r, g, b);
};
