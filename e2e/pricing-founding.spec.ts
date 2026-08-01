import { test, expect } from "@playwright/test";

test.describe("pricing founding club", () => {
  test("pricing page shows packages and founding CTA", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });

    const kickoffCta = page.getByRole("button", { name: /start your free season|kostenlose saison/i }).first();
    await expect(kickoffCta).toBeVisible({ timeout: 20_000 });

    await kickoffCta.click();
    await expect(page).toHaveURL(/onboarding.*plan=kickoff/i, { timeout: 15_000 });
    await expect(page.url()).toMatch(/offer=ONE4Team-Founding-Club-12M/);
  });

  test("offer terms dialog opens from banner", async ({ page }) => {
    await page.goto("/pricing");
    const terms = page.getByRole("button", { name: /offer terms|angebotsbedingungen/i }).first();
    await expect(terms).toBeVisible({ timeout: 20_000 });
    await terms.click();
    await expect(
      page.getByText(/your first season is on us|die erste saison geht auf uns/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("ONE4Team-Founding-Club-12M").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /claim your free season|kostenlose saison sichern/i }),
    ).toBeVisible();
  });
});
