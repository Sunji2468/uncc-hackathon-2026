import { describe, expect, it } from "vitest";
import { oneServing, rescaleToTarget, twistTarget } from "./twist";

const salmon = (g: number) => ({ name: "Salmon", gramsPerServing: g, kcalPer100g: 200, proteinPer100g: 20 });
const potato = (g: number) => ({ name: "Potato", gramsPerServing: g, kcalPer100g: 80, proteinPer100g: 2 });

describe("twistTarget", () => {
  it("clamps to 250..900 kcal", () => {
    expect(twistTarget(530)).toBe(530);
    expect(twistTarget(120)).toBe(250);
    expect(twistTarget(1600)).toBe(900);
  });
});

describe("rescaleToTarget", () => {
  it("leaves a recipe alone within 15% of the target", () => {
    // 150 g salmon (300) + 250 g potato (200) = 500 kcal vs 530 target: 5.7% off
    const r = rescaleToTarget([salmon(150), potato(250)], 530);
    expect(r.factor).toBe(1);
    expect(r.kcal).toBeCloseTo(500);
  });

  it("scales every amount when more than 15% off, landing on target", () => {
    // 400 kcal vs 530 target: 24.5% off -> factor 1.325
    const r = rescaleToTarget([salmon(100), potato(250)], 530);
    expect(r.factor).toBeCloseTo(1.325);
    expect(r.ingredients[0].gramsPerServing).toBeCloseTo(132.5);
    expect(Math.abs(r.kcal - 530) / 530).toBeLessThan(0.01);
    expect(r.proteinG).toBeCloseTo((132.5 * 20 + 331.3 * 2) / 100, 0);
  });

  it("scales down too", () => {
    const r = rescaleToTarget([salmon(300), potato(500)], 530); // 1000 kcal
    expect(r.factor).toBeCloseTo(0.53);
    expect(Math.abs(r.kcal - 530) / 530).toBeLessThan(0.01);
  });

  it("clamps the factor to 0.5..1.5", () => {
    expect(rescaleToTarget([salmon(50)], 900).factor).toBe(1.5); // 100 kcal -> wants 9x
    expect(rescaleToTarget([salmon(1000)], 250).factor).toBe(0.5); // 2000 kcal -> wants 0.125x
  });

  it("does not divide by zero for a zero-kcal recipe", () => {
    const r = rescaleToTarget([{ name: "Water", gramsPerServing: 200, kcalPer100g: 0, proteinPer100g: 0 }], 500);
    expect(r.factor).toBe(1);
  });

  it("keeps extra fields on ingredients", () => {
    const r = rescaleToTarget([{ ...salmon(100), category: "fish" }], 530);
    expect(r.ingredients[0].category).toBe("fish");
  });
});

describe("oneServing", () => {
  it("rounds one serving's macros", () => {
    expect(oneServing([salmon(130), potato(195)])).toEqual({ kcal: 416, proteinG: 30 });
  });
});
