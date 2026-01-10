import type { RiskCoverageItem } from "../services/shopService";

// Aproximación greedy al set cover ponderado por coste.
// Idea: elegir repetidamente la medida que cubre más riesgos pendientes por euro.
export function computeSuggestedInvestment(risks: RiskCoverageItem[]): number {
  const uncovered = new Set<number>();
  const measures = new Map<string, { cost: number; covers: Set<number> }>();

  for (const risk of risks || []) {
    if (risk.is_covered) continue;
    uncovered.add(risk.risk_id);

    for (const m of risk.available_measures || []) {
      const name = m.name;
      const cost = Math.max(0, m.estimatedCost ?? 0);
      const entry = measures.get(name);
      if (!entry) {
        measures.set(name, { cost, covers: new Set([risk.risk_id]) });
      } else {
        entry.covers.add(risk.risk_id);
        // Si por algún motivo el coste difiere, nos quedamos con el menor.
        entry.cost = Math.min(entry.cost, cost);
      }
    }
  }

  let totalCost = 0;
  const selected = new Set<string>();

  while (uncovered.size > 0) {
    let bestName: string | null = null;
    let bestNewlyCovered = 0;
    let bestCost = 0;
    let bestScore = -1;

    for (const [name, m] of measures) {
      if (selected.has(name)) continue;

      let newlyCovered = 0;
      for (const rId of m.covers) {
        if (uncovered.has(rId)) newlyCovered += 1;
      }
      if (newlyCovered === 0) continue;

      const cost = Math.max(0, m.cost);
      const score = cost === 0 ? Number.POSITIVE_INFINITY : newlyCovered / cost;

      if (
        score > bestScore ||
        (score === bestScore && cost < bestCost) ||
        (score === bestScore && cost === bestCost && newlyCovered > bestNewlyCovered)
      ) {
        bestName = name;
        bestNewlyCovered = newlyCovered;
        bestCost = cost;
        bestScore = score;
      }
    }

    if (!bestName) break;

    selected.add(bestName);
    totalCost += bestCost;

    const chosen = measures.get(bestName);
    if (chosen) {
      for (const rId of chosen.covers) {
        uncovered.delete(rId);
      }
    }
  }

  return totalCost;
}
