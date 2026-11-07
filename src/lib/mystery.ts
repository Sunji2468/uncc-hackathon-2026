import { isWater } from "./prices";

export const TIME_LIMITS = [15, 30, 60] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

export const MAX_MYSTERY_ITEMS = 20;
export const PANTRY_SOURCE = "pantry";

/** The only things a Mystery recipe may add: any cooking oil, salt, black pepper, water. */
export function isPantryStaple(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (isWater(n)) return true;
  if (/^(?:[a-z-]+ ){0,3}oil$/.test(n) && !/\b(truffle|chili|chilli)\b/.test(n)) return true; // olive oil, extra virgin olive oil
  if (/^(?:fine |coarse |sea |kosher |table |flaky )?salt$/.test(n)) return true;
  if (/^(?:freshly |coarsely )?(?:ground |cracked )?(?:black )?pepper(?:corns)?$/.test(n)) return true;
  return false;
}

const STOPWORDS = new Set([
  "fresh", "chopped", "cooked", "leftover", "large", "small", "medium", "raw", "dried", "whole",
  "sliced", "diced", "minced", "ripe", "of", "and", "the", "a", "some", "frozen", "canned", "baby",
]);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`; // berries -> berry
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

/** True when a recipe ingredient name plausibly is the listed item ("Large eggs" ~ "eggs"). */
export function matchesListed(name: string, listed: string): boolean {
  const a = tokens(name);
  const b = tokens(listed);
  return a.some((x) => b.some((y) => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x)))));
}

export function normalizeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = v.toLowerCase();
    if (v && !seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out.slice(0, MAX_MYSTERY_ITEMS);
}

export interface MysteryIngredient {
  name: string;
  from_list: string;
}

/**
 * The Mystery Box contract: only the listed ingredients plus pantry staples,
 * and no longer than the time limit. Returns problems for the retry message.
 */
export function validateMysteryRules(
  recipe: { total_minutes: number; ingredients: MysteryIngredient[] },
  listed: string[],
  timeLimitMin: number,
): string[] {
  const errs: string[] = [];
  const allowed = new Map(listed.map((l) => [l.trim().toLowerCase(), l]));

  if (recipe.total_minutes > timeLimitMin) {
    errs.push(`total_minutes is ${recipe.total_minutes} but must be at most ${timeLimitMin}`);
  }

  for (const ing of recipe.ingredients) {
    const source = ing.from_list.trim().toLowerCase();
    if (source === PANTRY_SOURCE) {
      if (!isPantryStaple(ing.name)) {
        errs.push(`"${ing.name}" is not an allowed pantry staple (only oil, salt, black pepper, water)`);
      }
      continue;
    }
    const listedItem = allowed.get(source);
    if (!listedItem) {
      errs.push(`"${ing.name}" uses "${ing.from_list}", which is not one of the user's ingredients: ${listed.join(", ")}`);
    } else if (!matchesListed(ing.name, listedItem)) {
      errs.push(`"${ing.name}" does not look like the listed ingredient "${listedItem}"; name it after the listed item`);
    }
  }
  return errs;
}
