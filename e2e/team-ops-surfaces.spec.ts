import { test, expect } from "./fixtures/test";

/**
 * Phase 22 — Team Ops route/surface smoke (unauthenticated).
 * JWT RSVP flow: e2e/team-ops-rsvp.spec.ts (env-gated; see docs/TEAM_OPS_E2E_FIXTURES.md).
 */
test.describe("team-ops surfaces", () => {
  for (const path of ["/team-ledger", "/activities", "/communication"]) {
    test(`unauth blocks access: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page, `Expected redirect to /auth from ${path}`).toHaveURL(/\/auth(\b|\/|\?|#)/, {
        timeout: 15_000,
      });
    });
  }
});
