import { describe, expect, it, vi } from "vitest";
import {
  extractPer100g,
  passesSanityCheck,
  pickMatch,
  resolveNutrition,
  type UsdaDeps,
  type UsdaMatch,
} from "./usda";

const n = (nutrientNumber: string, value: number, unitName = "G") => ({ nutrientNumber, value, unitName });

const spaghettiFoundation = {
  fdcId: 2758998,
  description: "Pasta, dry, enriched, spaghetti",
  foodNutrients: [n("957", 371, "KCAL"), n("203", 15.1), n("204", 1.85), n("205", 73.5)],
};

describe("extractPer100g", () => {
  it("reads SR Legacy energy (208)", () => {
    expect(extractPer100g({ fdcId: 1, description: "egg", foodNutrients: [n("208", 143, "KCAL"), n("203", 12.6)] }))
      .toEqual({ kcalPer100g: 143, proteinPer100g: 12.6 });
  });
  it("reads Foundation Atwater energy (957)", () => {
    expect(extractPer100g(spaghettiFoundation)).toEqual({ kcalPer100g: 371, proteinPer100g: 15.1 });
  });
  it("ignores kJ energy and computes from macros", () => {
    const food = { fdcId: 1, description: "x", foodNutrients: [n("208", 1000, "kJ"), n("203", 10), n("204", 10), n("205", 10)] };
    expect(extractPer100g(food)).toEqual({ kcalPer100g: 170, proteinPer100g: 10 });
  });
  it("returns null with no nutrients", () => {
    expect(extractPer100g({ fdcId: 1, description: "olive oil", foodNutrients: [] })).toBeNull();
  });
});

describe("pickMatch", () => {
  it("skips results without usable numbers", () => {
    const empty = { fdcId: 9, description: "empty", foodNutrients: [] };
    expect(pickMatch([empty, spaghettiFoundation])?.fdcId).toBe(2758998);
  });
});

describe("passesSanityCheck", () => {
  it("accepts close values", () => {
    expect(passesSanityCheck({ kcalPer100g: 371, proteinPer100g: 15 }, { kcalPer100g: 360, proteinPer100g: 13 })).toBe(true);
  });
  it("rejects raw vs cooked (more than 2.5x)", () => {
    // cooked rice 130 kcal vs dry rice estimate 365 kcal: 2.8x
    expect(passesSanityCheck({ kcalPer100g: 130, proteinPer100g: 2.7 }, { kcalPer100g: 365, proteinPer100g: 7 })).toBe(false);
  });
  it("rejects in the other direction too", () => {
    expect(passesSanityCheck({ kcalPer100g: 900, proteinPer100g: 0 }, { kcalPer100g: 300, proteinPer100g: 0 })).toBe(false);
  });
  it("accepts exactly 2.5x", () => {
    expect(passesSanityCheck({ kcalPer100g: 250, proteinPer100g: 10 }, { kcalPer100g: 100, proteinPer100g: 10 })).toBe(true);
  });
  it("rejects a protein mismatch even when kcal agrees", () => {
    expect(passesSanityCheck({ kcalPer100g: 200, proteinPer100g: 30 }, { kcalPer100g: 200, proteinPer100g: 5 })).toBe(false);
  });
  it("does not trip on near-zero foods", () => {
    expect(passesSanityCheck({ kcalPer100g: 0, proteinPer100g: 0 }, { kcalPer100g: 2, proteinPer100g: 0.1 })).toBe(true);
  });
});

function makeDeps(over: Partial<UsdaDeps> = {}): UsdaDeps & { store: Map<string, UsdaMatch> } {
  const store = new Map<string, UsdaMatch>();
  return {
    store,
    apiKey: "test",
    fetch: vi.fn(async () => new Response(JSON.stringify({ foods: [spaghettiFoundation] }))) as unknown as typeof fetch,
    cacheGet: async (q) => store.get(q) ?? null,
    cacheSet: async (q, m) => void store.set(q, m),
    ...over,
  };
}

const estimate = { kcalPer100g: 360, proteinPer100g: 13 };

describe("resolveNutrition", () => {
  it("uses USDA and caches under the normalized query", async () => {
    const deps = makeDeps();
    const r = await resolveNutrition("  Spaghetti  DRY enriched ", estimate, deps);
    expect(r).toEqual({ kcalPer100g: 371, proteinPer100g: 15.1, fdcId: 2758998, source: "USDA" });
    expect(deps.store.has("spaghetti dry enriched")).toBe(true);
  });

  it("serves from cache without fetching", async () => {
    const deps = makeDeps();
    deps.store.set("spaghetti dry enriched", { fdcId: 5, description: "c", kcalPer100g: 350, proteinPer100g: 12 });
    const r = await resolveNutrition("spaghetti dry enriched", estimate, deps);
    expect(r.fdcId).toBe(5);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("falls back to the model when USDA disagrees by more than 2.5x", async () => {
    const r = await resolveNutrition("spaghetti dry enriched", { kcalPer100g: 120, proteinPer100g: 4 }, makeDeps());
    expect(r).toEqual({ kcalPer100g: 120, proteinPer100g: 4, fdcId: null, source: "MODEL" });
  });

  it("falls back when the request fails or times out", async () => {
    const deps = makeDeps({ fetch: vi.fn(async () => { throw new DOMException("timeout", "TimeoutError"); }) as unknown as typeof fetch });
    expect((await resolveNutrition("spaghetti", estimate, deps)).source).toBe("MODEL");
  });

  it("falls back on a non-200 or empty result", async () => {
    const bad = makeDeps({ fetch: vi.fn(async () => new Response("no", { status: 500 })) as unknown as typeof fetch });
    expect((await resolveNutrition("spaghetti", estimate, bad)).source).toBe("MODEL");
    const empty = makeDeps({ fetch: vi.fn(async () => new Response(JSON.stringify({ foods: [] }))) as unknown as typeof fetch });
    expect((await resolveNutrition("spaghetti", estimate, empty)).source).toBe("MODEL");
  });

  it("falls back with no query or no API key", async () => {
    expect((await resolveNutrition("", estimate, makeDeps())).source).toBe("MODEL");
    expect((await resolveNutrition("spaghetti", estimate, makeDeps({ apiKey: undefined }))).source).toBe("MODEL");
  });
});
