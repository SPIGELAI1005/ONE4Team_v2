import { test as base, expect } from "@playwright/test";
import { COOKIE_CONSENT_STORAGE, cookieConsentInitScript } from "./cookie-consent";

/** Suppress the cookie banner so it does not intercept clicks in smoke tests. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(cookieConsentInitScript, COOKIE_CONSENT_STORAGE);
    await use(page);
  },
});

export { expect };
export { attachCookieConsentInit, seedCookieConsent } from "./cookie-consent";
