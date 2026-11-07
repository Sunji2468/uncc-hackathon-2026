import { describe, expect, it } from "vitest";
import { isValidUserId, newUserId } from "./user-id";

describe("user ids", () => {
  it("mints valid, unique ids", () => {
    const a = newUserId();
    const b = newUserId();
    expect(isValidUserId(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("rejects tampered cookie values", () => {
    expect(isValidUserId("")).toBe(false);
    expect(isValidUserId("u_short")).toBe(false);
    expect(isValidUserId("u_abcdefabcdefabcdef'; DROP")).toBe(false);
  });
});
