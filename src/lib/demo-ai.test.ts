import { describe, expect, it } from "vitest";
import { demoMysteryRecipe, demoSwaps, demoTwist } from "./demo-ai";
import { validateMysteryRules } from "./mystery";
import { validateRecipe, validateSwaps } from "./ai/schemas";
import { dietProblems } from "./diet";
import { TIME_LIMITS } from "./mystery";

const none = { diets: [], allergies: [] };

describe("demoMysteryRecipe", () => {
  it("makes the design's tomato-egg fried rice for the sample counter", () => {
    const listed = ["Eggs", "Cooked rice", "Scallions", "Tomatoes"];
    const r = demoMysteryRecipe(listed, 15, none);
    expect(r.title).toBe("Tomato-egg fried rice");
    expect(validateMysteryRules(r, listed, 15)).toEqual([]);
    expect(validateRecipe(r)).toEqual([]);
  });

  it.each(TIME_LIMITS)("obeys the Mystery Box rules for any list at %i min", (t) => {
    const listed = ["chicken thighs", "potatoes", "lemons", "spinach", "feta"];
    const r = demoMysteryRecipe(listed, t, none);
    expect(validateMysteryRules(r, listed, t)).toEqual([]);
    expect(validateRecipe(r)).toEqual([]);
  });

  it("leaves out listed items that conflict with the user's diet", () => {
    const listed = ["peanuts", "rice noodles", "eggs"];
    const r = demoMysteryRecipe(listed, 15, { diets: ["nut-free"], allergies: [] });
    expect(dietProblems(r.ingredients, ["nut-free"], [])).toEqual([]);
    expect(validateMysteryRules(r, listed, 15)).toEqual([]);
  });
});

describe("demoTwist", () => {
  it("rotates with Show another", () => {
    const a = demoTwist([], none);
    expect(demoTwist([a.title], none).title).not.toBe(a.title);
  });
  it("respects diets", () => {
    const t = demoTwist([], { diets: ["vegetarian"], allergies: [] });
    expect(dietProblems(t.ingredients, ["vegetarian"], [])).toEqual([]);
    expect(validateRecipe(t)).toEqual([]);
  });
});

describe("demoSwaps", () => {
  it("returns exactly 3 valid, diet-safe swaps", () => {
    const s = demoSwaps({ name: "Pecorino Romano", category: "cheese" }, { diets: ["dairy-free"], allergies: [] });
    expect(validateSwaps({ swaps: s }, "Pecorino Romano")).toEqual([]);
    expect(dietProblems(s, ["dairy-free"], [])).toEqual([]);
  });
  it("falls back to generic swaps for any category", () => {
    expect(demoSwaps({ name: "Onion", category: "vegetable" }, none)).toHaveLength(3);
  });
});
