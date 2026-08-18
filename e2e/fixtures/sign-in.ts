import { expect, type Page } from "@playwright/test";
import { seedCookieConsent } from "./cookie-consent";

async function dismissBlockingOverlays(page: Page): Promise<void> {
  const gotIt = page.getByRole("button", { name: /^Got it$|^Verstanden$/i });
  if (await gotIt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await gotIt.click();
  }
}

export { dismissBlockingOverlays };

/** Auth labels are visual-only (no htmlFor) — use typed inputs inside the login form. */
export async function assertAuthLoginForm(page: Page): Promise<void> {
  const configError = page.getByRole("heading", { name: /configuration error/i });
  if (await configError.isVisible({ timeout: 2_000 }).catch(() => false)) {
    throw new Error(
      "Supabase configuration error screen — ensure project .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (Playwright loads .env for the dev server).",
    );
  }

  const emailInput = page.locator("form input[type='email']").first();
  await expect(
    emailInput,
    "Login email field not found on /auth — check dev server URL (127.0.0.1:5173) and Supabase .env.",
  ).toBeVisible({ timeout: 30_000 });
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await seedCookieConsent(page);
  await dismissBlockingOverlays(page);
  await assertAuthLoginForm(page);

  await page.locator("form input[type='email']").first().fill(email);
  await page.locator("form input[type='password']").first().fill(password);
  await page.locator("form").getByRole("button", { name: /sign in|anmelden/i }).click();

  try {
    await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/, { timeout: 45_000 });
  } catch {
    if (await page.getByRole("heading", { name: /configuration error/i }).isVisible({ timeout: 1_000 }).catch(() => false)) {
      throw new Error(
        "Supabase configuration error screen — ensure project .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      );
    }
    throw new Error(
      "Login failed — still on /auth after Sign in. Check E2E credentials and that Playwright uses your linked Supabase project (not e2e-placeholder).",
    );
  }

  await expect(page).toHaveURL(/\/(dashboard|onboarding|club\/|activities|members|settings|teams)/, {
    timeout: 45_000,
  });
  await dismissBlockingOverlays(page);
  await page
    .waitForFunction(
      () => {
        const keys = Object.keys(localStorage).filter((key) => key.startsWith("one4team.activeClubId:"));
        return keys.some((key) => {
          const value = localStorage.getItem(key);
          return Boolean(value && value.length > 8);
        });
      },
      { timeout: 30_000 },
    )
    .catch(() => undefined);
}
