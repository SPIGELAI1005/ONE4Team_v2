import { test, expect } from "@playwright/test";

/**
 * Dual-role supplier ↔ club marketplace smoke.
 * Skips cleanly when E2E_SUPPLIER_EMAIL / E2E_CLUB_ADMIN_EMAIL (and passwords) are unset.
 *
 * Seed helper (optional): supabase/scripts/sprint_20260701_marketplace_smoke_seed.sql
 */
const supplierEmail = process.env.E2E_SUPPLIER_EMAIL?.trim() || "";
const supplierPassword = process.env.E2E_SUPPLIER_PASSWORD?.trim() || "";
const clubAdminEmail = process.env.E2E_CLUB_ADMIN_EMAIL?.trim() || "";
const clubAdminPassword = process.env.E2E_CLUB_ADMIN_PASSWORD?.trim() || "";

const hasCreds = Boolean(
  supplierEmail && supplierPassword && clubAdminEmail && clubAdminPassword,
);

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|anmelden/i }).click();
  await page.waitForURL(/\/(dashboard|partner|marketplace|members|settings)/, { timeout: 45_000 });
}

test.describe("marketplace dual-role smoke", () => {
  test.skip(!hasCreds, "Set E2E_SUPPLIER_* and E2E_CLUB_ADMIN_* env vars to run authenticated marketplace smoke.");

  test("supplier can open partner marketplace shell", async ({ page }) => {
    await signIn(page, supplierEmail, supplierPassword);
    await page.goto("/partner-marketplace");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/);
    const status = await page.evaluate(() => document.title);
    expect(status.length).toBeGreaterThan(0);
  });

  test("club admin can open club marketplace and partners hub", async ({ page }) => {
    await signIn(page, clubAdminEmail, clubAdminPassword);
    await page.goto("/marketplace");
    await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/);
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/partners");
    await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/);
    await expect(page.locator("body")).toBeVisible();
  });
});
