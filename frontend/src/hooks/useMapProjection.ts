import { useMemo } from "react";
import { affineFromN, UTM_ANCHORS, SVG_ANCHORS } from "../utils/geo";
import type { Point } from "../types";

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Hook que retorna una función de proyección UTM -> SVG
 * Usa transformación afín si hay puntos de anclaje válidos,
 * o una proyección lineal como fallback
 */
export function useMapProjection(viewBox: ViewBox) {
  return useMemo(() => {
    const hasValidAnchors =
      UTM_ANCHORS.every(([e, n]) => !(e === 0 && n === 0)) &&
      SVG_ANCHORS.every(([x, y]) => !(x === 0 && y === 0));

    if (hasValidAnchors) {
      try {
        const toSvg = affineFromN(UTM_ANCHORS, SVG_ANCHORS);
        return (E: number, N: number): Point => toSvg(E, N);
      } catch {
        // fallback si falla la transformación
      }
    }

    // Proyección lineal de fallback
    return (E: number, N: number): Point => ({
      x: viewBox.x + (E / 3000000) * viewBox.width,
      y: viewBox.y + (1 - N / 9000000) * viewBox.height,
    });
  }, [viewBox.x, viewBox.y, viewBox.width, viewBox.height]);
}
