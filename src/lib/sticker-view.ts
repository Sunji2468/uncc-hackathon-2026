import { stickerTotals, range } from "./nutrition";
import { homeCostCents, ingredientCostUsd } from "./prices";
import { heistMath, type Heist } from "./heist";

/** The stored fields the view needs; matches Prisma rows but stays decoupled. */
export interface IngredientRow {
  id: string;
  position: number;
  name: string;
  gramsPerServing: number;
  category: string;
  source: "USDA" | "MODEL";
  fdcId: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
}

export interface StickerRow {
  id: string;
  kind: "DISH" | "MYSTERY" | "TWIST";
  title: string;
  thumbnail: string;
  menuPriceCents: number | null;
  timeLimitMin: number | null;
  totalMinutes: number;
  servings: number;
  confidence: number;
  assumptions: string;
  steps: string[];
  createdAt: Date | string;
  ingredients: IngredientRow[];
}

export interface IngredientView extends IngredientRow {
  /** For the current servings. */
  grams: number;
  costCents: number;
  kcalPerServing: number;
  proteinPerServing: number;
}

export type ConfidenceLevel = "low" | "good" | "high";

export interface StickerView extends Omit<StickerRow, "ingredients" | "createdAt"> {
  createdAt: string;
  ingredients: IngredientView[];
  perServing: { kcal: number; proteinG: number };
  total: { kcal: number; proteinG: number };
  kcalRange: [number, number];
  proteinRange: [number, number];
  confidenceLevel: ConfidenceLevel;
  homeCostCents: number;
  homeCostPerServingCents: number;
  heist: Heist | null;
}

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 6;

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c < 0.5) return "low";
  if (c <= 0.8) return "good";
  return "high";
}

/**
 * Every derived number is computed here from ingredient rows, never stored.
 * Pure, so the browser runs the same code for instant slider updates.
 */
export function buildStickerView(s: StickerRow, servingsOverride?: number): StickerView {
  const servings = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, servingsOverride ?? s.servings));
  const ings = [...s.ingredients].sort((a, b) => a.position - b.position);
  const totals = stickerTotals(ings, servings);
  const home = homeCostCents(ings, servings);

  return {
    ...s,
    servings,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : s.createdAt.toISOString(),
    ingredients: ings.map((ing) => ({
      ...ing,
      grams: ing.gramsPerServing * servings,
      costCents: Math.round(ingredientCostUsd(ing, servings) * 100),
      kcalPerServing: (ing.gramsPerServing / 100) * ing.kcalPer100g,
      proteinPerServing: (ing.gramsPerServing / 100) * ing.proteinPer100g,
    })),
    perServing: totals.perServing,
    total: totals.total,
    kcalRange: range(totals.perServing.kcal, s.confidence),
    proteinRange: range(totals.perServing.proteinG, s.confidence),
    confidenceLevel: confidenceLevel(s.confidence),
    homeCostCents: home,
    homeCostPerServingCents: homeCostCents(ings, 1),
    heist: heistMath(s.menuPriceCents, home, servings),
  };
}
