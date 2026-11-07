/** "$25.00" from 2500. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/**
 * Parses what a person types into a price box ("25", "$25.5", "25,00") into
 * integer cents. Returns null for empty input and NaN for garbage.
 */
export function parsePriceToCents(input: string): number | null {
  const s = input.trim().replace(/^\$/, "").replace(",", ".");
  if (!s) return null;
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(s)) return Number.NaN;
  return Math.round(Number.parseFloat(s) * 100);
}
