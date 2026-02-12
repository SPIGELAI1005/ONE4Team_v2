import { test, expect } from "@playwright/test";

const paths = [
  "/",
  "/events",
  "/activities",
  "/matches",
  "/dues",
  "/partners",
  "/ai",
];

test.describe("nav", () => {
  for (const p of paths) {
    test(`route loads: ${p}`, async ({ page }) => {
      await page.goto(p);
      await expect(page.locator("body")).toBeVisible();
      // No hard assertions: many pages depend on auth/club; we just ensure route renders without a crash.
    });
  }
});
