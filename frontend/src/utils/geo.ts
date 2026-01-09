import type { Point, UTMCoord } from "../types";

// Constantes de proyección (puntos de anclaje para transformación UTM -> SVG)
export const UTM_ANCHORS: UTMCoord[] = [
  [-411926.644, 4926301.901], // Madrid
  [295006.669, 4804084.443], // Baleares
  [-14221.956, 6711542.476], // Londres
  [1492237.774, 6894699.801], // Berlín
  [2776129.989, 8437661.782], // Helsinki
  [1391092.885, 5146430.457], // Roma
  [2220267.244, 6457488.29], // Varsovia
];

export const SVG_ANCHORS: UTMCoord[] = [
  [354.050537109375, 564.7141723632812],
  [440.8133239746094, 573.8910522460938],
  [399.1004638671875, 392.0228576660156],
  [559.2778930664062, 371.16644287109375],
  [686.9193115234375, 257.7073974609375],
  [565.9519653320312, 540.520751953125],
  [645.2064208984375, 403.7024841308594],
];

/**
 * Calcula una transformación afín a partir de N puntos de anclaje
 * usando mínimos cuadrados (requiere al menos 3 puntos)
 */
export function affineFromN(
  src: UTMCoord[],
  dst: UTMCoord[]
): (E: number, N: number) => Point {
  if (src.length !== dst.length) {
    throw new Error("src y dst deben tener la misma longitud");
  }
  const n = src.length;
  if (n < 3) {
    throw new Error("Se necesitan al menos 3 puntos para una afinidad");
  }

  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const AtbX = [0, 0, 0];
  const AtbY = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    const [E, N] = src[i];
    const [x, y] = dst[i];
    const row = [E, N, 1];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        AtA[r][c] += row[r] * row[c];
      }
    }
    for (let r = 0; r < 3; r++) {
      AtbX[r] += row[r] * x;
      AtbY[r] += row[r] * y;
    }
  }

  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const solve3 = (A: number[][], b: number[]) => {
    const dA = det(A);
    if (Math.abs(dA) < 1e-9) {
      throw new Error(
        "Sistema casi singular; puntos de ancla mal condicionados"
      );
    }
    const repl = (col: number, vec: number[]) =>
      A.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));

    const dx = det(repl(0, b)) / dA;
    const dy = det(repl(1, b)) / dA;
    const dz = det(repl(2, b)) / dA;
    return [dx, dy, dz];
  };

  const [a11, a12, a13] = solve3(AtA, AtbX);
  const [a21, a22, a23] = solve3(AtA, AtbY);

  return (E: number, N: number) => ({
    x: a11 * E + a12 * N + a13,
    y: a21 * E + a22 * N + a23,
  });
}

/**
 * Transforma un punto usando una DOMMatrix
 */
export const transformPoint = (m: DOMMatrix, p: DOMPoint): DOMPoint =>
  new DOMPoint(p.x * m.a + p.y * m.c + m.e, p.x * m.b + p.y * m.d + m.f);
