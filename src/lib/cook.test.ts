import { describe, expect, it } from "vitest";
import { formatClock, ingredientsForStep, shortStep, stepTimerSeconds } from "./cook";

describe("stepTimerSeconds", () => {
  it.each([
    ["Simmer for 8 to 10 minutes.", 600],
    ["Flip after 2 minutes and top with cheese.", 120],
    ["Roast for 1 hour.", 3600],
    ["Rest 30 seconds.", 30],
    ["Bake 25-30 mins until golden.", 1800],
    ["Toast the pepper in the oil for 1 minute.", 60],
  ])("%s -> %d s", (step, s) => {
    expect(stepTimerSeconds(step)).toEqual({ seconds: s, fromText: true });
  });
  it("falls back to 5 minutes", () => {
    expect(stepTimerSeconds("Serve at once.")).toEqual({ seconds: 300, fromText: false });
  });
});

describe("ingredientsForStep", () => {
  const ings = [{ name: "Spaghetti" }, { name: "Pecorino Romano" }, { name: "Black pepper" }, { name: "Butter" }, { name: "Eggs" }];
  it("matches mentioned ingredients by word", () => {
    expect(ingredientsForStep("Off the heat, add the pecorino and toss until glossy.", ings).map((i) => i.name)).toEqual([
      "Pecorino Romano",
    ]);
    expect(ingredientsForStep("Toast the cracked pepper in butter.", ings).map((i) => i.name)).toEqual(["Black pepper", "Butter"]);
    expect(ingredientsForStep("Scramble the egg.", ings).map((i) => i.name)).toEqual(["Eggs"]);
  });
  it("returns nothing for generic steps", () => {
    expect(ingredientsForStep("Serve at once.", ings)).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats clocks", () => {
    expect(formatClock(120)).toBe("02:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("00:00");
  });
  it("shortens steps", () => {
    expect(shortStep("Boil the spaghetti until just shy of al dente.")).toBe("Boil the spaghetti until just...");
    expect(shortStep("Serve hot.")).toBe("Serve hot");
  });
});
