import "server-only";
import type { UserSettings } from "@/types";
import { validateMysteryRules } from "@/lib/mystery";
import { dietProblems } from "@/lib/diet";
import { callStructured, imagePart } from "./client";
import { DETECT_SYSTEM, mysteryRecipeSystem } from "./prompts";
import { detectIngredientsSchema, mysteryRecipeSchema, validateRecipe, type MysteryRecipe } from "./schemas";

export async function detectIngredients(base64: string, mediaType: "image/jpeg" | "image/png"): Promise<string[]> {
  const result = await callStructured({
    name: "detect_ingredients",
    schema: detectIngredientsSchema,
    system: DETECT_SYSTEM,
    user: [{ type: "text", text: "List the ingredients you can see." }, imagePart(base64, mediaType)],
    validate: (r) => (r.ingredients.length > 20 ? ["at most 20 ingredients"] : []),
  });
  return result.ingredients;
}

export async function mysteryRecipe(listed: string[], timeLimitMin: number, settings: UserSettings): Promise<MysteryRecipe> {
  return callStructured({
    name: "mystery_recipe",
    schema: mysteryRecipeSchema,
    system: mysteryRecipeSystem(listed, timeLimitMin, settings),
    user: `Write the recipe for one serving using my ingredients, in ${timeLimitMin} minutes or less.`,
    validate: (r) => {
      const errs = validateRecipe(r);
      if (!r.title.trim()) errs.unshift("title is empty");
      return [
        ...errs,
        ...validateMysteryRules(r, listed, timeLimitMin),
        ...dietProblems(r.ingredients, settings.diets, settings.allergies),
      ];
    },
  });
}
