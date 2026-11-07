export const DIETS = ["vegetarian", "gluten-free", "nut-free", "dairy-free"] as const;
export type Diet = (typeof DIETS)[number];

export type Units = "metric" | "us";

export interface UserSettings {
  calorieGoal: number;
  proteinGoal: number;
  units: Units;
  diets: Diet[];
  allergies: string[];
  /** Shown on Community Fridge posts and notes. */
  displayName?: string;
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface TwistIngredient {
  name: string;
  gramsPerServing: number;
  category: string;
  usdaQuery: string | null;
  fdcId: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  source: "USDA" | "MODEL";
}

/** Signed into the twist token; the only thing /api/twist/accept trusts. */
export interface TwistTokenPayload {
  title: string;
  totalMinutes: number;
  confidence: number;
  assumptions: string;
  steps: string[];
  ingredients: TwistIngredient[];
  targetKcal: number;
}

export interface TwistDraft extends TwistTokenPayload {
  targetProteinG: number;
  /** Server-computed from USDA/model nutrition after rescaling. */
  kcal: number;
  proteinG: number;
  homeCostCents: number;
  rescaled: boolean;
  token: string;
}

export interface Meal {
  id: string;
  stickerId: string | null;
  name: string;
  kcal: number;
  proteinG: number;
  day: string;
  createdAt: string;
}
