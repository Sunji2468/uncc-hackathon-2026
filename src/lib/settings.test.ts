import { describe, expect, it } from "vitest";
import { clampStep, normalizeSettings, settingsFromUser, settingsSchema } from "./settings";

const valid = {
  calorieGoal: 2000,
  proteinGoal: 120,
  units: "metric",
  diets: ["nut-free"],
  allergies: ["peanuts"],
};

describe("settingsSchema", () => {
  it("accepts valid settings", () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["calorie goal too low", { calorieGoal: 200 }],
    ["fractional protein", { proteinGoal: 12.5 }],
    ["unknown unit", { units: "imperial" }],
    ["unknown diet", { diets: ["keto"] }],
    ["empty allergy", { allergies: ["  "] }],
  ])("rejects %s", (_, patch) => {
    expect(settingsSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("normalizeSettings", () => {
  it("lowercases, trims and de-duplicates allergies", () => {
    const out = normalizeSettings({
      calorieGoal: 2000,
      proteinGoal: 120,
      units: "us",
      diets: ["vegetarian", "vegetarian"],
      allergies: [" Peanuts", "peanuts", "Shellfish "],
    });
    expect(out.allergies).toEqual(["peanuts", "shellfish"]);
    expect(out.diets).toEqual(["vegetarian"]);
  });
});

describe("settingsFromUser", () => {
  it("drops unknown diets and defaults bad units to metric", () => {
    const out = settingsFromUser({
      calorieGoal: 1800,
      proteinGoal: 100,
      units: "weird",
      diets: ["dairy-free", "paleo"],
      allergies: [],
    });
    expect(out.units).toBe("metric");
    expect(out.diets).toEqual(["dairy-free"]);
  });
});

describe("clampStep", () => {
  it("clamps into range", () => {
    expect(clampStep(50, { min: 1000, max: 5000 })).toBe(1000);
    expect(clampStep(9000, { min: 1000, max: 5000 })).toBe(5000);
    expect(clampStep(2050, { min: 1000, max: 5000 })).toBe(2050);
  });
});
