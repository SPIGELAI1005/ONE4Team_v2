/**
 * Shared Playwright auth for authenticated smokes.
 *
 * Required env (local + CI when running AI / protected smokes):
 *   E2E_AI4T_EMAIL
 *   E2E_AI4T_PASSWORD
 *
 * Seed: a stable trainer (or club admin) account with access to /co-trainer on the
 * linked Supabase project used by the preview server.
 */
import { expect, type Page } from "@playwright/test";

export function hasE2eAuthCredentials(): boolean {
  return Boolean(process.env.E2E_AI4T_EMAIL?.trim() && process.env.E2E_AI4T_PASSWORD?.trim());
}

export async function loginAsE2eUser(page: Page): Promise<void> {
  const email = process.env.E2E_AI4T_EMAIL?.trim();
  const password = process.env.E2E_AI4T_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set E2E_AI4T_EMAIL and E2E_AI4T_PASSWORD for authenticated E2E tests.");
  }

  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/, { timeout: 30_000 });
}
