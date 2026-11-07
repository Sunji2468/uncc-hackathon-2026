import { describe, expect, it } from "vitest";
import { DEMO_IDS, loadDemoDish } from "./fixtures";

describe("demo fixtures", () => {
  it.each(DEMO_IDS)("%s is a valid analyze_dish result", (id) => {
    const d = loadDemoDish(id);
    expect(d.dish.is_food).toBe(true);
    expect(d.menuPriceCents).toBeGreaterThan(0);
  });
});
