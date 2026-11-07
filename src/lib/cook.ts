import { tokens } from "./mystery";

export const DEFAULT_TIMER_SECONDS = 5 * 60;

/**
 * A sensible starting timer from the step text: "simmer for 8 to 10 minutes"
 * gives 10 min, "1 hour" 60 min, "30 seconds" 30 s. Falls back to 5 min.
 */
export function stepTimerSeconds(step: string): { seconds: number; fromText: boolean } {
  const m = step
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*(?:(?:to|-|–|or)\s*(\d+(?:\.\d+)?)\s*)?(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/);
  if (!m) return { seconds: DEFAULT_TIMER_SECONDS, fromText: false };
  const n = Number(m[2] ?? m[1]);
  const unit = m[3];
  const factor = unit.startsWith("h") ? 3600 : unit.startsWith("s") ? 1 : 60;
  const seconds = Math.round(n * factor);
  return seconds > 0 && seconds <= 6 * 3600 ? { seconds, fromText: true } : { seconds: DEFAULT_TIMER_SECONDS, fromText: false };
}

/** Ingredients the step mentions, matched by word ("the pecorino" -> Pecorino Romano). */
export function ingredientsForStep<T extends { name: string }>(step: string, ingredients: T[]): T[] {
  const stepWords = new Set(tokens(step));
  return ingredients.filter((ing) => tokens(ing.name).some((w) => w.length >= 3 && stepWords.has(w)));
}

/** A few words for the step list: "Boil the spaghetti until just shy of al dente" -> "Boil the spaghetti until just". */
export function shortStep(step: string, words = 5): string {
  const parts = step.replace(/[.,;:]+$/, "").split(/\s+/);
  return parts.length <= words ? parts.join(" ") : `${parts.slice(0, words).join(" ")}...`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
