import { describe, expect, it } from "vitest";
import { range, stickerTotals } from "./nutrition";

describe("stickerTotals", () => {
  const ings = [
    { gramsPerServing: 100, kcalPer100g: 371, proteinPer100g: 13 }, // spaghetti
    { gramsPerServing: 30, kcalPer100g: 387, proteinPer100g: 32 }, // pecorino
  ];

  it("sums grams / 100 * per100g for one serving", () => {
    const t = stickerTotals(ings, 1);
    expect(t.perServing.kcal).toBeCloseTo(371 + 116.1);
    expect(t.perServing.proteinG).toBeCloseTo(13 + 9.6);
  });

  it("multiplies totals by servings, per-serving unchanged", () => {
    const t = stickerTotals(ings, 3);
    expect(t.total.kcal).toBeCloseTo(3 * 487.1);
    expect(t.perServing.kcal).toBeCloseTo(487.1);
  });

  it("handles an empty list", () => {
    expect(stickerTotals([], 2).total).toEqual({ kcal: 0, proteinG: 0 });
  });
});

describe("range", () => {
  it("is +/-10% at full confidence", () => {
    expect(range(500, 1)).toEqual([450, 550]);
  });
  it("is +/-50% at zero confidence", () => {
    expect(range(500, 0)).toEqual([250, 750]);
  });
  it("is +/-30% at 0.5", () => {
    expect(range(600, 0.5)).toEqual([420, 780]);
  });
  it("clamps confidence outside 0..1", () => {
    expect(range(500, 1.7)).toEqual([450, 550]);
    expect(range(500, -1)).toEqual([250, 750]);
  });
});
