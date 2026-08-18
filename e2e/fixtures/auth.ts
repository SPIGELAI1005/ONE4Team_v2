/**
 * Shared Playwright auth for authenticated smokes.
 *
 * Required env (local + CI when running AI / protected smokes):
 *   E2E_AI4T_EMAIL
 *   E2E_AI4T_PASSWORD
 */
import { type Page } from "@playwright/test";
import { signIn } from "./sign-in";

export function hasE2eAuthCredentials(): boolean {
  return Boolean(process.env.E2E_AI4T_EMAIL?.trim() && process.env.E2E_AI4T_PASSWORD?.trim());
}

export async function loginAsE2eUser(page: Page): Promise<void> {
  const email = process.env.E2E_AI4T_EMAIL?.trim();
  const password = process.env.E2E_AI4T_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set E2E_AI4T_EMAIL and E2E_AI4T_PASSWORD for authenticated E2E tests.");
  }

  await signIn(page, email, password);
}
