import { test, expect } from "@playwright/test";

test.describe("pricing founding club", () => {
  test("pricing page shows four packages and founding CTA", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15000 });

    const kickoffCta = page.getByRole("button", { name: /free season|kostenlose|start/i }).first();
    await expect(kickoffCta).toBeVisible({ timeout: 15000 });

    await kickoffCta.click();
    await expect(page).toHaveURL(/onboarding.*plan=kickoff/i, { timeout: 10000 });
    await expect(page.url()).toMatch(/offer=ONE4Team-Founding-Club-12M/);
  });

  test("offer terms dialog opens from banner", async ({ page }) => {
    await page.goto("/pricing");
    const terms = page.getByRole("button", { name: /offer terms|angebotsbedingungen/i }).first();
    await expect(terms).toBeVisible({ timeout: 15000 });
    await terms.click();
    await expect(
      page.getByText(/your first season is on us|die erste saison geht auf uns/i).first(),
    ).toBeVisible();
    await expect(page.getByText("ONE4Team-Founding-Club-12M").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /claim your free season|kostenlose saison sichern/i }),
    ).toBeVisible();
  });
});
