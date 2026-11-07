import { describe, expect, it } from "vitest";
import { heistMath } from "./heist";
import { densityFor, formatAmount } from "./scale";
import { buildStickerView, confidenceLevel, type StickerRow } from "./sticker-view";
import { describeDelta, swapDelta } from "./swaps";

describe("heistMath", () => {
  it("multiplies the plate price by servings and subtracts home cost", () => {
    expect(heistMath(2500, 780, 2)).toEqual({ restaurantTotalCents: 5000, homeTotalCents: 780, keepCents: 4220 });
  });
  it("returns null without a menu price (Mystery, Twist)", () => {
    expect(heistMath(null, 500, 2)).toBeNull();
  });
});

describe("formatAmount (metric)", () => {
  it.each([
    [1.5, "Yeast", "1.5 g"],
    [2.2, "Salt", "2 g"],
    [37.4, "Pecorino", "37 g"],
    [123, "Spaghetti", "125 g"],
    [1250, "Flour", "1.25 kg"],
    [240, "Water", "240 ml"],
    [13.8, "Olive oil", "15 ml"],
  ])("%d g of %s -> %s", (g, name, out) => {
    expect(formatAmount(g, name, "metric")).toBe(out);
  });
});

describe("formatAmount (US)", () => {
  it.each([
    [236.6, "Milk", "1 cup"], // milk is 1.03 g/ml, 236.6 g -> 0.97 cups, snaps to 1
    [355, "Water", "1 1/2 cups"],
    [13.8, "Olive oil", "1 tbsp"],
    [5, "Soy sauce", "0.75 tsp"],
    [200, "Spaghetti", "7 oz"],
    [56.7, "Butter", "2 oz"],
    [907, "Beef", "2 lb"],
    [3, "Black pepper", "3 g"],
  ])("%d g of %s -> %s", (g, name, out) => {
    expect(formatAmount(g, name, "us")).toBe(out);
  });
});

describe("densityFor", () => {
  it("does not treat watercress or milk powder as liquids", () => {
    expect(densityFor("Watercress")).toBeNull();
    expect(densityFor("Milk powder")).toBeNull();
    expect(densityFor("Whole milk")).toBe(1.03);
  });
});

describe("confidenceLevel", () => {
  it("uses the spec's thresholds", () => {
    expect(confidenceLevel(0.49)).toBe("low");
    expect(confidenceLevel(0.5)).toBe("good");
    expect(confidenceLevel(0.8)).toBe("good");
    expect(confidenceLevel(0.81)).toBe("high");
  });
});

const sticker: StickerRow = {
  id: "s1",
  kind: "DISH",
  title: "Cacio e Pepe",
  thumbnail: "data:image/png;base64,AAAA",
  menuPriceCents: 2500,
  timeLimitMin: null,
  totalMinutes: 20,
  servings: 2,
  confidence: 0.7,
  assumptions: "",
  steps: ["Boil."],
  createdAt: new Date("2026-11-07T12:00:00Z"),
  ingredients: [
    // deliberately out of order to check sorting
    { id: "b", position: 1, name: "Pecorino", gramsPerServing: 40, category: "cheese", source: "USDA", fdcId: 2, kcalPer100g: 387, proteinPer100g: 32 },
    { id: "a", position: 0, name: "Spaghetti", gramsPerServing: 100, category: "pasta", source: "USDA", fdcId: 1, kcalPer100g: 371, proteinPer100g: 13 },
  ],
};

describe("buildStickerView", () => {
  it("computes totals, cost and heist from ingredients", () => {
    const v = buildStickerView(sticker);
    expect(v.ingredients.map((i) => i.id)).toEqual(["a", "b"]);
    expect(v.perServing.kcal).toBeCloseTo(371 + 154.8);
    expect(v.homeCostPerServingCents).toBe(125); // 45 + 80
    expect(v.homeCostCents).toBe(250);
    expect(v.heist?.keepCents).toBe(5000 - 250);
    expect(v.ingredients[0].grams).toBe(200);
    expect(v.ingredients[1].costCents).toBe(160);
  });

  it("rescales with a servings override and clamps to 1..6", () => {
    expect(buildStickerView(sticker, 4).homeCostCents).toBe(500);
    expect(buildStickerView(sticker, 4).perServing.kcal).toBeCloseTo(525.8);
    expect(buildStickerView(sticker, 99).servings).toBe(6);
    expect(buildStickerView(sticker, 0).servings).toBe(1);
  });

  it("reflects an ingredient edit immediately", () => {
    const edited = {
      ...sticker,
      ingredients: sticker.ingredients.map((i) => (i.id === "b" ? { ...i, gramsPerServing: 20 } : i)),
    };
    const v = buildStickerView(edited);
    expect(v.perServing.kcal).toBeCloseTo(371 + 77.4);
    expect(v.homeCostCents).toBe(2 * (45 + 40));
  });
});

describe("swaps", () => {
  const pecorino = { name: "Pecorino", category: "cheese", gramsPerServing: 40, kcalPer100g: 387, proteinPer100g: 32 };

  it("computes per-serving deltas at the same grams", () => {
    const d = swapDelta(pecorino, { name: "Nutritional yeast", category: "other", kcalPer100g: 325, proteinPer100g: 50 });
    expect(d).toEqual({ kcal: -25, proteinG: 7.2, costCents: -56 });
  });

  it("describes deltas in plain words", () => {
    expect(describeDelta({ kcal: -15, proteinG: 0.5, costCents: -60 })).toBe("$0.60 cheaper, 15 kcal less");
    expect(describeDelta({ kcal: 30, proteinG: 4, costCents: 20 })).toBe("$0.20 more, 30 kcal more, 4 g protein more");
    expect(describeDelta({ kcal: 2, proteinG: 0, costCents: 1 })).toBe("About the same");
  });
});
