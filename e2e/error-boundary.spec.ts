import { test, expect } from "@playwright/test";

test.describe("error boundary", () => {
  test("renders fallback UI on crash route", async ({ page }) => {
    await page.goto("/__crash");
    await expect(page.locator("text=Something went wrong")).toBeVisible();
    await expect(page.locator("text=Intentional crash test route")).toBeVisible();
  });
});
