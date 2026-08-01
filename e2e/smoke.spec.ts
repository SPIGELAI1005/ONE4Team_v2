import { test, expect } from "./fixtures/test";

test.describe("smoke", () => {
  test("app loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
