/** Placeholder USD per 100 g by category. Shown in the UI as an estimate. */
export const PRICE_PER_100G = {
  pasta: 0.45,
  rice_grain: 0.35,
  bread: 0.6,
  beef: 1.4,
  pork: 0.9,
  chicken: 0.8,
  fish: 2.2,
  seafood: 2.5,
  eggs: 0.55,
  dairy_milk: 0.15,
  cheese: 2.0,
  butter_oil: 0.9,
  vegetable: 0.35,
  fruit: 0.45,
  legume: 0.3,
  nuts: 1.8,
  spice: 3.0,
  sauce: 0.5,
  sugar: 0.2,
  other: 0.6,
} as const;

export type PriceCategory = keyof typeof PRICE_PER_100G;

export const PRICE_CATEGORIES = Object.keys(PRICE_PER_100G) as [PriceCategory, ...PriceCategory[]];

export function isPriceCategory(c: string): c is PriceCategory {
  return Object.hasOwn(PRICE_PER_100G, c);
}

/** Water is free. Matches "water", "cold water", "water, tap" but not "watercress". */
export function isWater(name: string): boolean {
  return /^(?:(?:cold|warm|hot|boiling|tap|filtered|ice)\s+)?water(?:,\s*\w+)?$/i.test(name.trim());
}

export interface CostIngredient {
  name: string;
  gramsPerServing: number;
  category: string;
}

/** Cost in USD (unrounded) of one ingredient for the given servings. */
export function ingredientCostUsd(ing: CostIngredient, servings: number): number {
  if (isWater(ing.name)) return 0;
  const perHundred = isPriceCategory(ing.category) ? PRICE_PER_100G[ing.category] : PRICE_PER_100G.other;
  return (ing.gramsPerServing * servings * perHundred) / 100;
}

/** Total home cost in integer cents, rounded once at the end. */
export function homeCostCents(ingredients: CostIngredient[], servings: number): number {
  const usd = ingredients.reduce((sum, ing) => sum + ingredientCostUsd(ing, servings), 0);
  return Math.round(usd * 100);
}
