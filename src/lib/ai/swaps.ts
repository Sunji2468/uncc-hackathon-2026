import "server-only";
import type { UserSettings } from "@/types";
import { callStructured } from "./client";
import { suggestSwapsSystem } from "./prompts";
import { suggestSwapsSchema, validateSwaps, type SuggestSwaps } from "./schemas";
import { dietProblems } from "@/lib/diet";

export async function suggestSwaps(
  title: string,
  ingredient: { name: string; gramsPerServing: number },
  otherIngredients: string[],
  settings: UserSettings,
): Promise<SuggestSwaps["swaps"]> {
  const result = await callStructured({
    name: "suggest_swaps",
    schema: suggestSwapsSchema,
    system: suggestSwapsSystem(settings),
    user: JSON.stringify({
      dish: title,
      ingredient_to_swap: ingredient.name,
      grams_per_serving: Math.round(ingredient.gramsPerServing),
      other_ingredients: otherIngredients,
    }),
    validate: (s) => [...validateSwaps(s, ingredient.name), ...dietProblems(s.swaps, settings.diets, settings.allergies)],
  });
  return result.swaps;
}
