import "server-only";
import type { UserSettings } from "@/types";
import { TWIST_MAX_MINUTES } from "@/lib/twist";
import { dietProblems } from "@/lib/diet";
import { callStructured } from "./client";
import { smartTwistSystem } from "./prompts";
import { smartTwistSchema, validateRecipe, type SmartTwist } from "./schemas";

export async function smartTwist(
  targetKcal: number,
  targetProteinG: number,
  avoidTitles: string[],
  settings: UserSettings,
): Promise<SmartTwist> {
  const avoid = avoidTitles.length ? ` Suggest something different from: ${avoidTitles.join(", ")}.` : "";
  return callStructured({
    name: "smart_twist",
    schema: smartTwistSchema,
    system: smartTwistSystem(targetKcal, targetProteinG, settings),
    user: `I have ${targetKcal} kcal and ${targetProteinG} g protein left today. Suggest one meal for one serving.${avoid}`,
    validate: (r) => {
      const errs = validateRecipe(r);
      if (!r.title.trim()) errs.unshift("title is empty");
      if (r.total_minutes > TWIST_MAX_MINUTES) errs.push(`total_minutes must be at most ${TWIST_MAX_MINUTES}`);
      return [...errs, ...dietProblems(r.ingredients, settings.diets, settings.allergies)];
    },
  });
}
