import { test, expect } from "@playwright/test";

const protectedRoutes = [
  "/activities",
  "/matches",
  "/dues",
  "/partners",
  "/ai",
];

test.describe("protected routes", () => {
  for (const p of protectedRoutes) {
    test(`unauth blocks access: ${p}`, async ({ page }) => {
      await page.goto(p);

      // Some pages render a local prompt, others redirect to /auth.
      const prompt = page.locator("text=Please sign in.");
      if (await prompt.count()) {
        await expect(prompt, `Expected sign-in prompt on ${p}`).toBeVisible();
      } else {
        await expect(page, `Expected redirect to /auth from ${p}`).toHaveURL(/\/auth(\b|\/|\?|#)/);
      }
    });
  }
});
