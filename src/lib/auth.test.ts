import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { loginSchema, passwordScore, safeNext, signupSchema, usernameSchema } from "./auth-schemas";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const h = await hashPassword("correct horse 42");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword("correct horse 42", h)).toBe(true);
    expect(await verifyPassword("correct horse 43", h)).toBe(false);
  });
  it("salts every hash", async () => {
    expect(await hashPassword("same pass 1")).not.toBe(await hashPassword("same pass 1"));
  });
  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false);
  });
});

describe("sign-up rules", () => {
  const ok = { name: "Maya", username: "Maya_Cooks", email: " Maya@Example.com ", password: "tomato123" };
  it("normalizes username and email to lowercase", () => {
    const r = signupSchema.parse(ok);
    expect(r.username).toBe("maya_cooks");
    expect(r.email).toBe("maya@example.com");
  });
  it.each([
    ["short username", { username: "ab" }],
    ["spaces in username", { username: "maya cooks" }],
    ["leading dot", { username: ".maya" }],
    ["reserved prefix", { username: "u_admin" }],
    ["bad email", { email: "maya@" }],
    ["short password", { password: "tom123" }],
    ["password without a number", { password: "tomatoes!" }],
    ["empty name", { name: "  " }],
  ])("rejects %s", (_, patch) => {
    expect(signupSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
  it("accepts dots and underscores inside usernames", () => {
    expect(usernameSchema.parse("chef.maya_2")).toBe("chef.maya_2");
  });
});

describe("log-in and helpers", () => {
  it("lowercases the identifier", () => {
    expect(loginSchema.parse({ identifier: "Maya@Example.com", password: "x" }).identifier).toBe("maya@example.com");
  });
  it("scores password strength", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("tomato123")).toBe(1);
    expect(passwordScore("Tomato-Basil-2026")).toBe(4);
  });
  it("only allows same-site redirects", () => {
    expect(safeNext("/macros")).toBe("/macros");
    expect(safeNext("//evil.com")).toBe("/board");
    expect(safeNext("https://evil.com")).toBe("/board");
    expect(safeNext(null)).toBe("/board");
  });
});
