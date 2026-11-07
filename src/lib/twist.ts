import { stickerTotals, type NutritionIngredient } from "./nutrition";

export const TWIST_MIN_KCAL = 250;
export const TWIST_MAX_KCAL = 900;
export const TWIST_MAX_MINUTES = 30;
export const RESCALE_TOLERANCE = 0.15;
export const RESCALE_MIN = 0.5;
export const RESCALE_MAX = 1.5;

/** What we aim the twist at: the remaining kcal, kept to a sensible meal size. */
export function twistTarget(remainingKcal: number): number {
  return Math.round(Math.min(TWIST_MAX_KCAL, Math.max(TWIST_MIN_KCAL, remainingKcal)));
}

export interface Rescaled<T> {
  ingredients: T[];
  factor: number;
  kcal: number;
  proteinG: number;
}

/**
 * Recomputes the model's recipe from database nutrition. If it misses the
 * target by more than 15%, scales every amount by target/computed (clamped
 * 0.5 to 1.5) and recomputes. The model's own macro claims are never used.
 */
export function rescaleToTarget<T extends NutritionIngredient>(ingredients: T[], targetKcal: number): Rescaled<T> {
  const before = stickerTotals(ingredients, 1).perServing;
  if (before.kcal <= 0 || Math.abs(before.kcal - targetKcal) / targetKcal <= RESCALE_TOLERANCE) {
    return { ingredients, factor: 1, kcal: before.kcal, proteinG: before.proteinG };
  }
  const factor = Math.min(RESCALE_MAX, Math.max(RESCALE_MIN, targetKcal / before.kcal));
  const scaled = ingredients.map((i) => ({ ...i, gramsPerServing: Math.round(i.gramsPerServing * factor * 10) / 10 }));
  const after = stickerTotals(scaled, 1).perServing;
  return { ingredients: scaled, factor, kcal: after.kcal, proteinG: after.proteinG };
}

/** One serving, rounded for a MealLog row. */
export function oneServing(ingredients: NutritionIngredient[]): { kcal: number; proteinG: number } {
  const t = stickerTotals(ingredients, 1).perServing;
  return { kcal: Math.round(t.kcal), proteinG: Math.round(t.proteinG) };
}

export function remaining(goal: number, consumed: number): number {
  return goal - consumed;
}
