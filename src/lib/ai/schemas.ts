import { z } from "zod";
import { PRICE_CATEGORIES } from "@/lib/prices";

/**
 * Output schemas sent to OpenAI as strict JSON schemas. They stay loose (no
 * min/max) so every model accepts them; the real rules live in the
 * validate* functions below, which drive the single retry.
 */
export const aiIngredient = z.object({
  name: z.string(),
  grams_per_serving: z.number(),
  category: z.enum(PRICE_CATEGORIES),
  usda_query: z.string(),
  kcal_per_100g_estimate: z.number(),
  protein_per_100g_estimate: z.number(),
});
export type AiIngredient = z.infer<typeof aiIngredient>;

const recipeFields = {
  confidence: z.number(),
  assumptions: z.string(),
  total_minutes: z.number(),
  ingredients: z.array(aiIngredient),
  steps: z.array(z.string()),
};

export const analyzeDishSchema = z.object({
  is_food: z.boolean(),
  dish_name: z.string(),
  ...recipeFields,
});
export type AnalyzeDish = z.infer<typeof analyzeDishSchema>;

export interface AiRecipe {
  confidence: number;
  assumptions: string;
  total_minutes: number;
  ingredients: AiIngredient[];
  steps: string[];
}

export const LIMITS = { maxIngredients: 12, maxSteps: 8, maxGrams: 1500 } as const;

/** Returns a list of problems, empty when the recipe is usable. */
export function validateRecipe(r: AiRecipe): string[] {
  const errs: string[] = [];
  if (r.ingredients.length < 1) errs.push("ingredients must not be empty");
  if (r.ingredients.length > LIMITS.maxIngredients) errs.push(`at most ${LIMITS.maxIngredients} ingredients`);
  if (r.steps.length < 1) errs.push("steps must not be empty");
  if (r.steps.length > LIMITS.maxSteps) errs.push(`at most ${LIMITS.maxSteps} steps`);
  if (!(r.confidence >= 0 && r.confidence <= 1)) errs.push("confidence must be between 0 and 1");
  if (!(r.total_minutes >= 1 && r.total_minutes <= 600)) errs.push("total_minutes must be 1 to 600");
  r.ingredients.forEach((ing, i) => {
    const at = `ingredients[${i}] (${ing.name || "unnamed"})`;
    if (!ing.name.trim()) errs.push(`${at}: name is empty`);
    if (!(ing.grams_per_serving > 0 && ing.grams_per_serving <= LIMITS.maxGrams))
      errs.push(`${at}: grams_per_serving must be > 0 and <= ${LIMITS.maxGrams}`);
    if (!(ing.kcal_per_100g_estimate >= 0 && ing.kcal_per_100g_estimate <= 900))
      errs.push(`${at}: kcal_per_100g_estimate must be 0 to 900`);
    if (!(ing.protein_per_100g_estimate >= 0 && ing.protein_per_100g_estimate <= 100))
      errs.push(`${at}: protein_per_100g_estimate must be 0 to 100`);
  });
  if (r.steps.some((s) => !s.trim())) errs.push("steps must not contain empty strings");
  return errs;
}

export function validateAnalyzeDish(d: AnalyzeDish): string[] {
  if (!d.is_food) return [];
  const errs = validateRecipe(d);
  if (!d.dish_name.trim()) errs.unshift("dish_name is empty");
  return errs;
}

export const suggestSwapsSchema = z.object({
  swaps: z.array(
    z.object({
      name: z.string(),
      category: z.enum(PRICE_CATEGORIES),
      usda_query: z.string(),
      kcal_per_100g_estimate: z.number(),
      protein_per_100g_estimate: z.number(),
    }),
  ),
});
export type SuggestSwaps = z.infer<typeof suggestSwapsSchema>;

export function validateSwaps(s: SuggestSwaps, currentName: string): string[] {
  const errs: string[] = [];
  if (s.swaps.length !== 3) errs.push(`return exactly 3 swaps, not ${s.swaps.length}`);
  const seen = new Set<string>();
  s.swaps.forEach((w, i) => {
    const key = w.name.trim().toLowerCase();
    if (!key) errs.push(`swaps[${i}]: name is empty`);
    if (key === currentName.trim().toLowerCase()) errs.push(`swaps[${i}]: must differ from the current ingredient`);
    if (seen.has(key)) errs.push(`swaps[${i}]: duplicate of another swap`);
    seen.add(key);
    if (!(w.kcal_per_100g_estimate >= 0 && w.kcal_per_100g_estimate <= 900)) errs.push(`swaps[${i}]: kcal estimate must be 0 to 900`);
    if (!(w.protein_per_100g_estimate >= 0 && w.protein_per_100g_estimate <= 100)) errs.push(`swaps[${i}]: protein estimate must be 0 to 100`);
  });
  return errs;
}

export const detectIngredientsSchema = z.object({ ingredients: z.array(z.string()) });

export const mysteryRecipeSchema = z.object({
  title: z.string(),
  ...recipeFields,
  ingredients: z.array(
    aiIngredient.extend({
      /** Exactly one of the user's listed items, or "pantry" for oil, salt, black pepper, water. */
      from_list: z.string(),
    }),
  ),
});
export type MysteryRecipe = z.infer<typeof mysteryRecipeSchema>;

export const smartTwistSchema = z.object({ title: z.string(), ...recipeFields });
export type SmartTwist = z.infer<typeof smartTwistSchema>;
