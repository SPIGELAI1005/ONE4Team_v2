import { test, expect } from "@playwright/test";

test.describe("phase12 continuity", () => {
  test("protected route redirects with returnTo", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/auth\?returnTo=/);
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe("/members");
  });

  test("invite deep-link keeps onboarding context", async ({ page }) => {
    await page.goto("/onboarding?invite=test-token&club=test-club");
    await expect(page).toHaveURL(/\/auth\?returnTo=/);
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe("/onboarding?invite=test-token&club=test-club");
  });

  test("protected route keeps query and hash in returnTo", async ({ page }) => {
    await page.goto("/members?tab=invites#alerts");
    await expect(page).toHaveURL(/\/auth\?returnTo=/);
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe("/members?tab=invites#alerts");
  });
});

