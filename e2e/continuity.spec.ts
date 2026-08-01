import { test, expect } from "./fixtures/test";

const INVITE_TOKEN = "test-invite-token-abc";
const INVITE_CLUB = "test-club";
const INVITE_PATH = `/onboarding?invite=${INVITE_TOKEN}&club=${INVITE_CLUB}`;

test.describe("phase12 continuity", () => {
  test("protected route redirects with returnTo", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/auth\?returnTo=/, { timeout: 15_000 });
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe("/members");
  });

  test("invite deep-link keeps onboarding context", async ({ page }) => {
    await page.goto(INVITE_PATH);
    await expect(page).toHaveURL(new RegExp(`/onboarding\\?invite=${INVITE_TOKEN}`));
    const joinButton = page.getByRole("button", { name: /join club|verein beitreten/i });
    await expect(joinButton).toBeEnabled({ timeout: 15_000 });
    await joinButton.click();
    await expect(page).toHaveURL(/\/auth\?returnTo=/, { timeout: 15_000 });
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe(INVITE_PATH);
  });

  test("protected route keeps query and hash in returnTo", async ({ page }) => {
    await page.goto("/members?tab=invites#alerts");
    await expect(page).toHaveURL(/\/auth\?returnTo=/, { timeout: 15_000 });
    const current = new URL(page.url());
    const returnTo = current.searchParams.get("returnTo");
    expect(returnTo).toBe("/members?tab=invites#alerts");
  });
});
