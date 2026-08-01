import { test as base, expect } from "@playwright/test";

const COOKIE_CONSENT_STORAGE = JSON.stringify({
  v: 2,
  preferences: {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  },
  savedAt: "2026-01-01T00:00:00.000Z",
});

/** Suppress the cookie banner so it does not intercept clicks in smoke tests. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((value) => {
      localStorage.setItem("one4team.cookieConsent", value);
    }, COOKIE_CONSENT_STORAGE);
    await use(page);
  },
});

export { expect };
