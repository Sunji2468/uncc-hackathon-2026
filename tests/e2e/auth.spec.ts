import { expect, test, type Browser, type Page } from "@playwright/test";

/** Accounts: sign up keeps guest work, data follows the account to another device, guests merge on log-in. */
test("sign up, log out, log in on another device, and merge a guest board", async ({ browser, isMobile }) => {
  const tag = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const u = { name: "Smoke Tester", username: `smoke_${tag}`, email: `smoke_${tag}@example.com`, password: "tomato2026" };

  const device = async (b: Browser) => (await b.newContext(isMobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {})).newPage();
  const sample = async (page: Page, name: RegExp) => {
    await page.goto("/new");
    await page.getByRole("button", { name }).click();
    await page.waitForURL(/\/stickers\/[^/]+$/, { timeout: 30_000 });
    await expect(page.locator("#servings")).toBeVisible();
  };
  const titles = async (page: Page) => {
    await page.goto("/board");
    await expect(page.locator("main h1")).toBeVisible();
    return page.locator("main ul > li p.font-display").allInnerTexts();
  };
  const fill = async (page: Page, fields: [string, string][]) => {
    for (const [label, value] of fields) await page.getByLabel(label, { exact: true }).fill(value);
  };

  // Guest work survives sign-up
  const a = await device(browser);
  await sample(a, /Cacio e Pepe/);
  await a.goto("/signup");
  await fill(a, [["Name", u.name], ["Username", u.username], ["Email", u.email], ["Password", u.password], ["Confirm password", u.password]]);
  await a.getByRole("button", { name: "Create account" }).click();
  await a.waitForURL(/\/board$/);
  expect(await titles(a)).toEqual(["Cacio e Pepe"]);

  // Log out (sidebar on desktop; on phones via the avatar, which opens the Account section): an empty guest board
  if (isMobile) {
    await a.getByRole("link", { name: `Account: ${u.name}` }).click();
    await a.waitForURL(/\/settings/);
  }
  await a.getByRole("button", { name: "Log out" }).filter({ visible: true }).first().click();
  await a.waitForURL(/\/$/);
  expect(await titles(a)).toEqual([]);

  // Wrong password is refused; the right one restores the board
  await a.goto("/login");
  await fill(a, [["Username or email", u.email], ["Password", "nottheone1"]]);
  await a.getByRole("button", { name: "Log in" }).click();
  await expect(a.getByText("That username or password is not right.")).toBeVisible();
  await fill(a, [["Password", u.password]]);
  await a.getByRole("button", { name: "Log in" }).click();
  await a.waitForURL(/\/board$/);
  expect(await titles(a)).toEqual(["Cacio e Pepe"]);

  // Another device: a guest with its own sticker logs in, and the boards merge
  const b = await device(browser);
  await sample(b, /Pad see ew/);
  await b.goto("/login");
  await fill(b, [["Username or email", u.username], ["Password", u.password]]);
  await b.getByRole("button", { name: "Log in" }).click();
  await b.waitForURL(/\/board$/);
  expect((await titles(b)).sort()).toEqual(["Cacio e Pepe", "Pad See Ew"]);
  expect((await titles(a)).sort()).toEqual(["Cacio e Pepe", "Pad See Ew"]);

  // A taken username is reported on the field
  const c = await device(browser);
  await c.goto("/signup");
  await fill(c, [["Name", "Copy"], ["Username", u.username], ["Email", `other_${tag}@example.com`], ["Password", "copycat123"], ["Confirm password", "copycat123"]]);
  await c.getByRole("button", { name: "Create account" }).click();
  await expect(c.getByText("That username is taken. Try another.")).toBeVisible();
});
