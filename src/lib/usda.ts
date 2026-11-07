import type { NutritionSource } from "@prisma/client";

export interface Per100g {
  kcalPer100g: number;
  proteinPer100g: number;
}

export interface UsdaMatch extends Per100g {
  fdcId: number;
  description: string;
}

export interface ResolvedNutrition extends Per100g {
  fdcId: number | null;
  source: NutritionSource;
}

interface SearchNutrient {
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
}

interface SearchFood {
  fdcId: number;
  description: string;
  foodNutrients?: SearchNutrient[];
}

/** USDA disagreeing with the model by more than this factor means a bad match. */
export const SANITY_FACTOR = 2.5;
export const USDA_TIMEOUT_MS = 4000;

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pulls kcal and protein per 100 g from a search hit. Energy is "208" in SR Legacy;
 * Foundation foods use the Atwater variants "958"/"957" instead. Falls back to
 * 4/9/4 from protein, fat and carbs when only macros are present.
 */
export function extractPer100g(food: SearchFood): Per100g | null {
  const byNumber = new Map<string, SearchNutrient>();
  for (const n of food.foodNutrients ?? []) {
    if (n.nutrientNumber && typeof n.value === "number") byNumber.set(n.nutrientNumber, n);
  }
  const protein = byNumber.get("203")?.value;
  if (protein === undefined) return null;

  let kcal: number | undefined;
  for (const num of ["208", "958", "957"]) {
    const n = byNumber.get(num);
    if (n && n.unitName?.toUpperCase() === "KCAL") {
      kcal = n.value;
      break;
    }
  }
  if (kcal === undefined) {
    const fat = byNumber.get("204")?.value;
    const carbs = byNumber.get("205")?.value;
    if (fat === undefined || carbs === undefined) return null;
    kcal = protein * 4 + fat * 9 + carbs * 4;
  }
  return { kcalPer100g: kcal, proteinPer100g: protein };
}

/** The first of the results that has usable numbers. */
export function pickMatch(foods: SearchFood[]): UsdaMatch | null {
  for (const f of foods) {
    const per = extractPer100g(f);
    if (per) return { fdcId: f.fdcId, description: f.description, ...per };
  }
  return null;
}

function tooFar(a: number, b: number, floor: number): boolean {
  // The floor keeps near-zero foods (salt, water, oil protein) from tripping the ratio.
  const x = Math.max(a, floor);
  const y = Math.max(b, floor);
  return x / y > SANITY_FACTOR || y / x > SANITY_FACTOR;
}

/** True when USDA looks plausible next to the model's estimate. */
export function passesSanityCheck(usda: Per100g, estimate: Per100g): boolean {
  return (
    !tooFar(usda.kcalPer100g, estimate.kcalPer100g, 20) &&
    !tooFar(usda.proteinPer100g, estimate.proteinPer100g, 3)
  );
}

export interface UsdaDeps {
  apiKey: string | undefined;
  fetch: typeof fetch;
  cacheGet: (query: string) => Promise<UsdaMatch | null>;
  cacheSet: (query: string, match: UsdaMatch) => Promise<void>;
}

export async function searchUsda(query: string, deps: UsdaDeps): Promise<UsdaMatch | null> {
  if (!deps.apiKey) return null;
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("pageSize", "3");
  url.searchParams.set("api_key", deps.apiKey);
  const res = await deps.fetch(url, { signal: AbortSignal.timeout(USDA_TIMEOUT_MS) });
  if (!res.ok) return null;
  const body = (await res.json()) as { foods?: SearchFood[] };
  return pickMatch(body.foods ?? []);
}

/**
 * The model names the food; USDA supplies the numbers. Falls back to the model's
 * own estimate when USDA fails, times out, finds nothing, or disagrees wildly.
 */
export async function resolveNutrition(
  usdaQuery: string | null | undefined,
  estimate: Per100g,
  deps: UsdaDeps,
): Promise<ResolvedNutrition> {
  const fallback: ResolvedNutrition = { ...estimate, fdcId: null, source: "MODEL" };
  const query = usdaQuery ? normalizeQuery(usdaQuery) : "";
  if (!query) return fallback;

  let match: UsdaMatch | null = null;
  try {
    match = await deps.cacheGet(query);
    if (!match) {
      match = await searchUsda(query, deps);
      if (match) await deps.cacheSet(query, match);
    }
  } catch (err) {
    console.warn(`USDA lookup failed for "${query}":`, err instanceof Error ? err.message : err);
    return fallback;
  }

  if (!match || !passesSanityCheck(match, estimate)) return fallback;
  return {
    kcalPer100g: match.kcalPer100g,
    proteinPer100g: match.proteinPer100g,
    fdcId: match.fdcId,
    source: "USDA",
  };
}
