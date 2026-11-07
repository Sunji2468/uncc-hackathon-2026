import { z } from "zod";
import { DIETS, type Diet, type UserSettings } from "@/types";

export const CALORIE_GOAL = { min: 1000, max: 5000, step: 50 } as const;
export const PROTEIN_GOAL = { min: 20, max: 300, step: 5 } as const;

export const settingsSchema = z.object({
  calorieGoal: z.number().int().min(CALORIE_GOAL.min).max(CALORIE_GOAL.max),
  proteinGoal: z.number().int().min(PROTEIN_GOAL.min).max(PROTEIN_GOAL.max),
  units: z.enum(["metric", "us"]),
  diets: z.array(z.enum(DIETS)).max(DIETS.length),
  allergies: z.array(z.string().trim().min(1).max(40)).max(20),
  displayName: z.string().trim().min(1, "Enter a name.").max(24).optional(),
});

/** Lowercases, trims and de-duplicates allergies and diets. */
export function normalizeSettings(input: UserSettings): UserSettings {
  const allergies = Array.from(
    new Set(input.allergies.map((a) => a.trim().toLowerCase()).filter(Boolean)),
  );
  const diets = Array.from(new Set(input.diets));
  return { ...input, allergies, diets };
}

/** Narrows the loose `String[]` columns from Prisma to typed settings. */
export function settingsFromUser(user: {
  displayName?: string;
  calorieGoal: number;
  proteinGoal: number;
  units: string;
  diets: string[];
  allergies: string[];
}): UserSettings {
  return {
    calorieGoal: user.calorieGoal,
    proteinGoal: user.proteinGoal,
    units: user.units === "us" ? "us" : "metric",
    diets: user.diets.filter((d): d is Diet => (DIETS as readonly string[]).includes(d)),
    allergies: user.allergies,
    ...(user.displayName !== undefined ? { displayName: user.displayName } : {}),
  };
}

export function clampStep(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}
