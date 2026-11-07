import { describe, expect, it } from "vitest";
import { filterStickers, summarize, totalKept, type StickerSummary } from "./sticker-summary";
import { isValidDay, localDay } from "./day";
import type { StickerRow } from "./sticker-view";

const row = (over: Partial<StickerRow>): StickerRow => ({
  id: "x",
  kind: "DISH",
  title: "T",
  thumbnail: "",
  menuPriceCents: 2500,
  timeLimitMin: null,
  totalMinutes: 20,
  servings: 3,
  confidence: 0.8,
  assumptions: "",
  steps: [],
  createdAt: "2026-11-07T12:00:00.000Z",
  ingredients: [
    { id: "a", position: 0, name: "Spaghetti", gramsPerServing: 100, category: "pasta", source: "USDA", fdcId: 1, kcalPer100g: 371, proteinPer100g: 13 },
  ],
  ...over,
});

describe("summarize", () => {
  it("reports per-plate keep regardless of the slider", () => {
    const s = summarize(row({}));
    expect(s.homeCostPerServingCents).toBe(45);
    expect(s.keepPerPlateCents).toBe(2455);
    expect(s.kcalPerServing).toBe(371);
    expect(s.ingredientCount).toBe(1);
  });
  it("has no keep without a menu price", () => {
    expect(summarize(row({ kind: "MYSTERY", menuPriceCents: null })).keepPerPlateCents).toBeNull();
  });
});

describe("totalKept and filters", () => {
  const list: StickerSummary[] = [
    summarize(row({ id: "1" })),
    summarize(row({ id: "2", menuPriceCents: 10 })), // home costs more: counts as 0
    summarize(row({ id: "3", kind: "MYSTERY", menuPriceCents: null })),
    summarize(row({ id: "4", kind: "TWIST", menuPriceCents: null })),
    summarize(row({ id: "5", menuPriceCents: null })), // dish without a price
  ];
  it("sums restaurant heists only, never negative", () => {
    expect(totalKept(list)).toEqual({ cents: 2455, dishes: 2 });
  });
  it("filters by kind", () => {
    expect(filterStickers(list, "all")).toHaveLength(5);
    expect(filterStickers(list, "heists").map((s) => s.id)).toEqual(["1", "2", "5"]);
    expect(filterStickers(list, "mystery").map((s) => s.id)).toEqual(["3"]);
  });
});

describe("days", () => {
  it("validates real dates only", () => {
    expect(isValidDay("2026-11-07")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-1-7")).toBe(false);
  });
  it("formats local dates", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
