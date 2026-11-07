import { describe, expect, it } from "vitest";
import { formatCents, parsePriceToCents } from "./money";

describe("formatCents", () => {
  it("formats dollars and cents", () => {
    expect(formatCents(2500)).toBe("$25.00");
    expect(formatCents(390)).toBe("$3.90");
    expect(formatCents(-125)).toBe("-$1.25");
  });
});

describe("parsePriceToCents", () => {
  it.each([
    ["25", 2500],
    ["$25.5", 2550],
    ["25,00", 2500],
    ["0.99", 99],
    ["19.", 1900],
  ])("%s -> %d", (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });

  it("returns null for empty input", () => {
    expect(parsePriceToCents("  ")).toBeNull();
  });

  it.each(["abc", "-5", "1.234", "12345"])("rejects %s", (input) => {
    expect(parsePriceToCents(input)).toBeNaN();
  });
});
