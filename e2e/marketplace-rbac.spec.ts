import { test, expect } from "@playwright/test";

const moduleRoutes = [
  "/marketplace",
  "/partner-marketplace",
  "/partner-messages",
  "/partner-tasks",
  "/partner-reports",
  "/partner-ai",
  "/partners",
  "/members",
  "/matches",
  "/events",
  "/communication",
  "/tasks",
  "/reports",
  "/co-trainer",
  "/shop",
  "/settings",
  "/support",
];

test.describe("module route auth gate", () => {
  for (const path of moduleRoutes) {
    test(`unauthenticated user is redirected from ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth(\b|\/|\?|#)/);
    });
  }
});

test.describe("marketplace route shell", () => {
  for (const path of ["/marketplace", "/partner-marketplace", "/partnermarketplace"]) {
    test(`${path} resolves without crash for anonymous users`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
