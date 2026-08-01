import { test, expect } from "./fixtures/test";

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
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByText(/your first season is on us|die erste saison geht auf uns/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("ONE4Team-Founding-Club-12M")).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /claim your free season|kostenlose saison sichern/i }),
    ).toBeVisible();
  });
});
