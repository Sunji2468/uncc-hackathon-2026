import type { Units } from "@/types";

/** Grams per millilitre for liquids we recognise by name. Order matters: first match wins. */
const DENSITIES: [RegExp, number][] = [
  [/\bhoney\b/i, 1.42],
  [/\b(maple )?syrup\b/i, 1.32],
  [/\bsoy sauce\b|\btamari\b/i, 1.2],
  [/\b(fish|oyster) sauce\b/i, 1.2],
  [/\b(olive |vegetable |canola |sesame |sunflower |coconut )?oil\b/i, 0.92],
  [/\bcream\b/i, 1.0],
  [/\bmilk\b/i, 1.03],
  [/\b(stock|broth)\b/i, 1.0],
  [/\bvinegar\b/i, 1.01],
  [/\bjuice\b/i, 1.04],
  [/\bwine\b/i, 0.99],
  [/\bwater\b/i, 1.0],
];

export function densityFor(name: string): number | null {
  if (/\bwatercress|watermelon|water chestnut|coconut milk powder|milk powder|powdered milk\b/i.test(name)) return null;
  for (const [re, d] of DENSITIES) if (re.test(name)) return d;
  return null;
}

function roundMetric(v: number): number {
  if (v < 10) return Math.round(v * 2) / 2; // nearest 0.5
  if (v <= 50) return Math.round(v); // nearest 1
  return Math.round(v / 5) * 5; // nearest 5
}

function trim(n: number, digits: number): string {
  return Number(n.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}

const ML_PER_CUP = 236.6;
const ML_PER_TBSP = 14.79;
const ML_PER_TSP = 4.93;
const G_PER_OZ = 28.3495;

const FRACTIONS: [number, string][] = [
  [0, ""],
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.5, "1/2"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
  [1, ""],
];

/** 1.5 -> "1 1/2", 0.33 -> "1/3", snapping to the nearest common fraction. */
function cupFraction(cups: number): string {
  let whole = Math.floor(cups);
  const rest = cups - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) whole += 1;
  const frac = best[0] === 1 ? "" : best[1];
  if (whole === 0) return frac || "0";
  return frac ? `${whole} ${frac}` : String(whole);
}

function formatUsVolume(ml: number): string {
  if (ml >= ML_PER_CUP / 4 - 1) {
    const cups = cupFraction(ml / ML_PER_CUP);
    return `${cups} ${cups === "1" ? "cup" : "cups"}`;
  }
  if (ml >= ML_PER_TBSP - 0.5) return `${trim(Math.round((ml / ML_PER_TBSP) * 2) / 2, 1)} tbsp`;
  return `${trim(Math.max(0.25, Math.round((ml / ML_PER_TSP) * 4) / 4), 2)} tsp`;
}

/** Formats a weight for display in the user's units. */
export function formatAmount(grams: number, name: string, units: Units): string {
  if (!(grams > 0)) return "0 g";
  const density = densityFor(name);

  if (units === "metric") {
    if (density) {
      const ml = roundMetric(grams / density);
      return `${ml.toLocaleString("en-US")} ml`;
    }
    if (grams >= 1000) return `${trim(grams / 1000, 2)} kg`;
    return `${roundMetric(grams).toLocaleString("en-US")} g`;
  }

  if (density) return formatUsVolume(grams / density);
  // Tiny solid amounts read better in grams than as "0.1 oz".
  if (grams < 14) return `${roundMetric(grams)} g`;
  const oz = grams / G_PER_OZ;
  if (oz >= 16) return `${trim(oz / 16, 2)} lb`;
  return `${trim(oz < 4 ? Math.round(oz * 10) / 10 : Math.round(oz * 2) / 2, 1)} oz`;
}
