export interface NutritionIngredient {
  gramsPerServing: number;
  kcalPer100g: number;
  proteinPer100g: number;
}

export interface Totals {
  perServing: { kcal: number; proteinG: number };
  total: { kcal: number; proteinG: number };
}

/** Unrounded kcal and protein. Round only for display. */
export function stickerTotals(ingredients: NutritionIngredient[], servings: number): Totals {
  let kcal = 0;
  let protein = 0;
  for (const ing of ingredients) {
    kcal += (ing.gramsPerServing / 100) * ing.kcalPer100g;
    protein += (ing.gramsPerServing / 100) * ing.proteinPer100g;
  }
  return {
    perServing: { kcal, proteinG: protein },
    total: { kcal: kcal * servings, proteinG: protein * servings },
  };
}

/** Uncertainty band that widens as confidence drops: 10% at 1.0, 50% at 0. */
export function range(value: number, confidence: number): [number, number] {
  const c = Math.min(1, Math.max(0, confidence));
  const u = 0.1 + 0.4 * (1 - c);
  return [Math.round(value * (1 - u)), Math.round(value * (1 + u))];
}
