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

      // Protected routes should redirect to /auth.
      await expect(page, `Expected redirect to /auth from ${p}`).toHaveURL(/\/auth(\b|\/|\?|#)/);
    });
  }
});
