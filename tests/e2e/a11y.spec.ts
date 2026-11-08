import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated WCAG 2.1 AA scan of every screen (axe-core). */
test("every screen passes an axe WCAG 2.1 AA scan", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: /Cacio e Pepe/ }).click();
  await page.waitForURL(/\/stickers\/[^/]+$/, { timeout: 30_000 });
  await expect(page.locator("#servings")).toBeVisible();
  const sticker = new URL(page.url()).pathname;

  const report: string[] = [];
  for (const path of ["/", "/login", "/signup", "/board", "/new", sticker, `${sticker}/cook`, "/mystery", "/macros", "/fridge", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of violations) {
      report.push(`${path} [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary ?? "").split("\n").slice(1, 2).join("")).join("\n    ")}`);
    }
  }
  console.log(report.length ? report.join("\n") : "No violations");
  expect(report).toEqual([]);
});
