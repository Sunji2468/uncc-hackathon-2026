import { expect, test } from "@playwright/test";

/** The full TasteHeist flow, end to end, on a fresh anonymous user. */
test("main flow: sample dish, sticker, mystery, macros, twist, fridge, cook", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const nav = async (label: RegExp, url: RegExp) => {
    if (isMobile) await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
    else await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).first().click();
    await page.waitForURL(url);
    await expect(page.locator("main h1")).toBeVisible(); // past the loading skeleton
  };
  const noSideScroll = async (where: string) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(w, `horizontal scroll on ${where}`).toBeLessThanOrEqual(0);
  };

  // 1. Empty board
  await page.goto("/");
  await expect(page.getByText("No stickers yet")).toBeVisible();
  await noSideScroll("board");

  // 2. New sticker from a sample dish
  if (isMobile) await page.getByRole("link", { name: /New sticker: snap a photo/ }).click();
  else await page.getByRole("link", { name: "New sticker" }).first().click();
  await page.waitForURL(/\/new$/);
  await expect(page.getByRole("button", { name: /Smash burger/ })).toBeEnabled();
  await noSideScroll("new");
  await page.getByRole("button", { name: /Smash burger/ }).click();
  await expect(page.getByText("Reading your plate")).toBeVisible();
  await page.waitForURL(/\/stickers\/[^/]+$/, { timeout: 30_000 });
  await expect(page.locator("#servings")).toBeVisible();

  // 3. Sticker detail: slider is instant, flip works, shopping list totals
  const home = async () => (await page.locator("main").innerText()).match(/At home, estimated\s+(\$[\d.]+)/)![1];
  const before = await home();
  await page.locator("#servings").fill("4");
  expect(await home()).not.toBe(before);
  await page.getByRole("button", { name: "Flip to the recipe side" }).click();
  await expect(page.getByText("Recipe side")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shopping list" })).toBeVisible();
  await noSideScroll("sticker");
  const stickerUrl = page.url();

  // 4. Mystery Box with typed ingredients
  await nav(/^Mystery/, /\/mystery$/);
  for (const item of ["Eggs", "Cooked rice", "Tomatoes"]) {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Add an ingredient").fill(item);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Open the box" }).click();
  await expect(page.locator("article h2")).toBeVisible({ timeout: 60_000 });
  await noSideScroll("mystery");

  // 5. Macro budget: eat one, then a smart twist added to the day
  await nav(/^Macro/, /\/macros$/);
  await page.getByRole("button", { name: /^Eat one serving of Smash Burger/ }).click();
  await expect(page.getByRole("button", { name: "Remove Smash Burger" })).toBeVisible();
  await page.getByRole("button", { name: "Size a meal for me" }).click();
  await expect(page.getByRole("button", { name: "Add to my day" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Add to my day" }).click();
  await expect(page.locator("section[aria-labelledby=consumed-h] li")).toHaveCount(2);
  await noSideScroll("macros");

  // 6. Share to the Fridge and react
  await page.goto(stickerUrl);
  await expect(page.locator("#servings")).toBeVisible();
  await page.getByRole("button", { name: "Share to Fridge" }).click();
  await page.getByRole("link", { name: /On the Fridge/ }).click();
  await page.waitForURL(/\/fridge/);
  const mine = page.locator("li", { has: page.locator("article", { hasText: "by you" }) });
  await mine.getByRole("button", { name: /^Fire: 0/ }).click();
  await expect(mine.getByRole("button", { name: /^Fire: 1/ })).toBeVisible();
  await noSideScroll("fridge");

  // 7. Cook mode to the end
  await page.goto(`${stickerUrl}/cook`);
  await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible();
  const total = Number((await page.getByText(/^Step 1 of \d+$/).innerText()).match(/of (\d+)/)![1]);
  for (let i = 1; i < total; i++) await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: /Done\. Enjoy/ })).toBeVisible();
  await noSideScroll("cook");

  expect(errors, "uncaught page errors").toEqual([]);
});

