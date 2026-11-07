import { describe, expect, it, vi } from "vitest";
import { isPantryStaple, matchesListed, normalizeItems, validateMysteryRules } from "./mystery";
import { runWithRetry, type Outcome } from "./ai/retry";
import { AiError } from "./ai/errors";

const listed = ["eggs", "cooked rice", "scallions", "tomatoes"];
const ing = (name: string, from_list: string) => ({ name, from_list });

describe("isPantryStaple", () => {
  it.each(["Olive oil", "vegetable oil", "extra virgin olive oil", "Salt", "kosher salt", "Black pepper", "freshly ground black pepper", "Water"])(
    "%s is allowed",
    (n) => expect(isPantryStaple(n)).toBe(true),
  );
  it.each(["Bell pepper", "red pepper flakes", "chili oil", "garlic salt", "Butter", "Soy sauce", "coconut water"])(
    "%s is not",
    (n) => expect(isPantryStaple(n)).toBe(false),
  );
});

describe("matchesListed", () => {
  it.each([
    ["Large eggs", "eggs"],
    ["Egg", "eggs"],
    ["Cooked white rice", "cooked rice"],
    ["Cherry tomatoes", "tomatoes"],
    ["Scallions, sliced", "scallions"],
  ])("%s ~ %s", (a, b) => expect(matchesListed(a, b)).toBe(true));
  it.each([
    ["Chicken breast", "eggs"],
    ["Soy sauce", "cooked rice"],
    ["Garlic", "scallions"],
  ])("%s !~ %s", (a, b) => expect(matchesListed(a, b)).toBe(false));
});

describe("validateMysteryRules", () => {
  it("accepts listed items plus pantry staples within the time limit", () => {
    const r = {
      total_minutes: 15,
      ingredients: [ing("Eggs", "eggs"), ing("Cooked rice", "cooked rice"), ing("Vegetable oil", "pantry"), ing("Salt", "pantry")],
    };
    expect(validateMysteryRules(r, listed, 15)).toEqual([]);
  });

  it("rejects an unlisted ingredient", () => {
    const r = { total_minutes: 10, ingredients: [ing("Eggs", "eggs"), ing("Soy sauce", "soy sauce")] };
    const errs = validateMysteryRules(r, listed, 15);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("Soy sauce");
  });

  it("rejects a non-staple smuggled in as pantry", () => {
    const errs = validateMysteryRules({ total_minutes: 10, ingredients: [ing("Butter", "pantry")] }, listed, 15);
    expect(errs[0]).toContain("Butter");
  });

  it("rejects an ingredient mislabeled as a listed one", () => {
    const errs = validateMysteryRules({ total_minutes: 10, ingredients: [ing("Chicken thighs", "eggs")] }, listed, 15);
    expect(errs[0]).toContain("Chicken thighs");
  });

  it("rejects going over the time limit", () => {
    const errs = validateMysteryRules({ total_minutes: 40, ingredients: [ing("Eggs", "eggs")] }, listed, 30);
    expect(errs[0]).toContain("at most 30");
  });

  it("matches listed items case-insensitively", () => {
    expect(validateMysteryRules({ total_minutes: 5, ingredients: [ing("Eggs", "EGGS")] }, listed, 15)).toEqual([]);
  });
});

describe("normalizeItems", () => {
  it("trims, de-duplicates case-insensitively and caps the list", () => {
    expect(normalizeItems([" Eggs ", "eggs", "Rice", "", "  "])).toEqual(["Eggs", "Rice"]);
    expect(normalizeItems(Array.from({ length: 30 }, (_, i) => `item ${i}`))).toHaveLength(20);
  });
});

describe("runWithRetry", () => {
  type R = { total_minutes: number; ingredients: { name: string; from_list: string }[] };
  const bad: R = { total_minutes: 10, ingredients: [ing("Eggs", "eggs"), ing("Soy sauce", "soy sauce")] };
  const good: R = { total_minutes: 10, ingredients: [ing("Eggs", "eggs"), ing("Salt", "pantry")] };
  const validate = (r: R) => validateMysteryRules(r, listed, 15);

  it("rejects a recipe with an unlisted ingredient, retries with the reason, and accepts the fix", async () => {
    const attempt = vi
      .fn<(m: unknown[]) => Promise<Outcome<R>>>()
      .mockResolvedValueOnce({ ok: true, value: bad })
      .mockResolvedValueOnce({ ok: true, value: good });

    const result = await runWithRetry({ name: "mystery_recipe", messages: [{ role: "user", content: "go" }], attempt, validate });

    expect(result).toEqual(good);
    expect(attempt).toHaveBeenCalledTimes(2);
    const secondCallMessages = attempt.mock.calls[1][0] as { role: string; content: string }[];
    const correction = secondCallMessages.at(-1)!;
    expect(correction.role).toBe("user");
    expect(correction.content).toContain("Soy sauce");
    expect(secondCallMessages.at(-2)!.role).toBe("assistant");
  });

  it("gives up after the retry with a typed error", async () => {
    const attempt = vi.fn(async (): Promise<Outcome<R>> => ({ ok: true, value: bad }));
    await expect(runWithRetry({ name: "x", messages: [], attempt, validate })).rejects.toBeInstanceOf(AiError);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("retries a refusal and reports it if it repeats", async () => {
    const attempt = vi.fn(async (): Promise<Outcome<R>> => ({ ok: false, code: "refused", problems: ["no"] }));
    await expect(runWithRetry({ name: "x", messages: [], attempt })).rejects.toMatchObject({ code: "refused" });
  });

  it("does not retry a good first answer", async () => {
    const attempt = vi.fn(async (): Promise<Outcome<R>> => ({ ok: true, value: good }));
    await runWithRetry({ name: "x", messages: [], attempt, validate });
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
