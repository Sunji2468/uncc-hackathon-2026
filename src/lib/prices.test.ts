import { describe, expect, it } from "vitest";
import { homeCostCents, isWater } from "./prices";

describe("homeCostCents", () => {
  it("prices by category per 100 g and scales by servings", () => {
    // 100 g pasta = $0.45; 30 g cheese = $0.60 -> $1.05 per serving
    const ings = [
      { name: "Spaghetti", gramsPerServing: 100, category: "pasta" },
      { name: "Pecorino", gramsPerServing: 30, category: "cheese" },
    ];
    expect(homeCostCents(ings, 1)).toBe(105);
    expect(homeCostCents(ings, 2)).toBe(210);
  });

  it("rounds the sum once, not each item", () => {
    // 3 x 1 g spice = 3 x $0.03 = 9 cents; and 3 x 0.5 g = 4.5 -> 5 (not 3 x 2)
    const ings = Array.from({ length: 3 }, () => ({ name: "Salt", gramsPerServing: 0.5, category: "spice" }));
    expect(homeCostCents(ings, 1)).toBe(5);
  });

  it("treats water as free and unknown categories as other", () => {
    expect(homeCostCents([{ name: "Water", gramsPerServing: 500, category: "other" }], 2)).toBe(0);
    expect(homeCostCents([{ name: "Mystery", gramsPerServing: 100, category: "nope" }], 1)).toBe(60);
  });

  it("returns 0 for no ingredients", () => {
    expect(homeCostCents([], 3)).toBe(0);
  });
});

describe("isWater", () => {
  it.each(["water", "Cold water", "water, tap", "boiling water"])("%s is water", (n) => {
    expect(isWater(n)).toBe(true);
  });
  it.each(["watercress", "coconut water", "watermelon"])("%s is not water", (n) => {
    expect(isWater(n)).toBe(false);
  });
});
