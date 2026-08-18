import type { BrowserContext, Page } from "@playwright/test";

export const COOKIE_CONSENT_STORAGE = JSON.stringify({
  v: 2,
  preferences: {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  },
  savedAt: "2026-01-01T00:00:00.000Z",
});

/** Init script safe on about:blank / restricted iframes (Playwright runs it on every navigation). */
export function cookieConsentInitScript(value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("one4team.cookieConsent", value);
    }
  } catch {
    // SecurityError on sandboxed or cross-origin documents — ignore.
  }
}

export async function attachCookieConsentInit(context: BrowserContext): Promise<void> {
  await context.addInitScript(cookieConsentInitScript, COOKIE_CONSENT_STORAGE);
}

/** Fallback after first same-origin navigation if init script could not write storage. */
export async function seedCookieConsent(page: Page): Promise<void> {
  await page.evaluate(cookieConsentInitScript, COOKIE_CONSENT_STORAGE);
}
