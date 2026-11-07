import cacio from "@/fixtures/cacio-e-pepe.json";
import burger from "@/fixtures/smash-burger.json";
import padSeeEw from "@/fixtures/pad-see-ew.json";
import { analyzeDishSchema, validateAnalyzeDish, type AnalyzeDish } from "@/lib/ai/schemas";

export const DEMO_IDS = ["cacio-e-pepe", "smash-burger", "pad-see-ew"] as const;
export type DemoId = (typeof DEMO_IDS)[number];

export interface DemoDish {
  dish: AnalyzeDish;
  menuPriceCents: number;
  colors: [string, string];
}

const RAW: Record<DemoId, unknown> = {
  "cacio-e-pepe": cacio,
  "smash-burger": burger,
  "pad-see-ew": padSeeEw,
};

/** Loads and validates a fixture with the same rules as a live AI response. */
export function loadDemoDish(id: DemoId): DemoDish {
  const raw = RAW[id] as { menu_price_cents: number; thumbnail_colors: [string, string] };
  const dish = analyzeDishSchema.parse(raw);
  const problems = validateAnalyzeDish(dish);
  if (problems.length) throw new Error(`Fixture ${id} is invalid: ${problems.join("; ")}`);
  return { dish, menuPriceCents: raw.menu_price_cents, colors: raw.thumbnail_colors };
}
