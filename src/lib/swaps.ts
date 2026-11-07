import { ingredientCostUsd } from "./prices";
import { formatCents } from "./money";

export interface SwapDelta {
  /** Per serving, at the same gram amount. Negative means less. */
  kcal: number;
  proteinG: number;
  costCents: number;
}

interface Side {
  name: string;
  category: string;
  gramsPerServing: number;
  kcalPer100g: number;
  proteinPer100g: number;
}

export function swapDelta(current: Side, candidate: Omit<Side, "gramsPerServing">): SwapDelta {
  const g = current.gramsPerServing;
  const costNow = ingredientCostUsd(current, 1);
  const costNew = ingredientCostUsd({ ...candidate, gramsPerServing: g }, 1);
  return {
    kcal: Math.round((g / 100) * (candidate.kcalPer100g - current.kcalPer100g)),
    proteinG: Math.round(((g / 100) * (candidate.proteinPer100g - current.proteinPer100g)) * 10) / 10,
    costCents: Math.round((costNew - costNow) * 100),
  };
}

/** "$0.60 cheaper, 15 kcal less" style summary, most useful facts first. */
export function describeDelta(d: SwapDelta): string {
  const parts: string[] = [];
  if (Math.abs(d.costCents) >= 5) {
    parts.push(`${formatCents(Math.abs(d.costCents))} ${d.costCents < 0 ? "cheaper" : "more"}`);
  } else {
    parts.push("same cost");
  }
  if (Math.abs(d.kcal) >= 5) parts.push(`${Math.abs(d.kcal)} kcal ${d.kcal < 0 ? "less" : "more"}`);
  if (Math.abs(d.proteinG) >= 2) {
    parts.push(`${Math.round(Math.abs(d.proteinG))} g protein ${d.proteinG < 0 ? "less" : "more"}`);
  }
  if (parts.length === 1 && parts[0] === "same cost") return "About the same";
  return parts.join(", ");
}
