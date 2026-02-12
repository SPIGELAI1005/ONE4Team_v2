import { test, expect } from "@playwright/test";

const protectedRoutes = [
  "/activities",
  "/matches",
  "/dues",
  "/partners",
  "/ai",
  "/members",
];

test.describe("protected routes", () => {
  for (const p of protectedRoutes) {
    test(`unauth blocks access: ${p}`, async ({ page }) => {
      await page.goto(p);

      // Some pages render a local prompt, others redirect to /auth.
      const prompt = page.locator("text=Please sign in.");
      const redirected = /\/auth(\b|\/|\?|#)/;

      try {
        await expect(prompt).toBeVisible({ timeout: 8000 });
      } catch {
        await expect(page, `Expected redirect to /auth from ${p}`).toHaveURL(redirected);
      }
    });
  }
});
