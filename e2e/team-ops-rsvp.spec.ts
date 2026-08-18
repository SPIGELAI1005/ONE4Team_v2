import { test, expect } from "./fixtures/test";
import {
  createE2eContext,
  futureActivityStartsAt,
  getTeamOpsE2eCreds,
  selectGuardianChild,
  signIn,
  waitForActivitiesPage,
  waitForTrainerActivitiesReady,
} from "./fixtures/team-ops-auth";

/**
 * Phase 22 — Team Ops JWT Playwright (Prompt 22 Scenario 1).
 *
 * Trainer creates training → parent RSVPs YES for linked child → trainer sees coming.
 *
 * Required env (staging / linked Supabase used by Vite):
 *   E2E_TRAINER_EMAIL / E2E_TRAINER_PASSWORD
 *   E2E_PARENT_EMAIL / E2E_PARENT_PASSWORD
 *   E2E_CHILD_DISPLAY_NAME
 *
 * Setup: docs/TEAM_OPS_E2E_FIXTURES.md
 */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops RSVP scenario 1", () => {
  test.skip(
    !creds,
    "Set E2E_TRAINER_*, E2E_PARENT_*, and E2E_CHILD_DISPLAY_NAME for authenticated Team Ops E2E.",
  );

  // Dual browser contexts + two logins need more than the default 60s.
  test.setTimeout(180_000);

  test("trainer creates training, parent RSVPs for child, trainer sees response", async ({ browser }) => {
    const activityTitle = `E2E RSVP ${Date.now()}`;
    const startsAt = futureActivityStartsAt(3);

    const { context: trainerContext, page: trainerPage } = await createE2eContext(browser);

    try {
      await signIn(trainerPage, creds!.trainerEmail, creds!.trainerPassword);
      await waitForTrainerActivitiesReady(trainerPage);

      await trainerPage.getByTestId("activities-create-open").first().click();
      await trainerPage.getByPlaceholder(/Training|e\.g\.|z\. B\./i).fill(activityTitle);
      await trainerPage.getByPlaceholder(/YYYY-MM-DD|JJJJ-MM-TT/i).fill(startsAt);
      await trainerPage.getByRole("button", { name: /^Create$|^Erstellen$/i }).click();

      const trainerCard = trainerPage.getByTestId("activity-card").filter({ hasText: activityTitle });
      await expect(trainerCard).toBeVisible({ timeout: 30_000 });

      const { context: parentContext, page: parentPage } = await createE2eContext(browser);

      try {
        await signIn(parentPage, creds!.parentEmail, creds!.parentPassword);
        await waitForActivitiesPage(parentPage);
        await selectGuardianChild(parentPage, creds!.childDisplayName);

        const parentCard = parentPage.getByTestId("activity-card").filter({ hasText: activityTitle });
        await expect(parentCard).toBeVisible({ timeout: 30_000 });
        await parentCard.getByTestId("attendance-rsvp-coming").click();

        await expect(parentPage.getByText(/RSVP confirmed|Zu-\/Absage bestätigt/i)).toBeVisible({
          timeout: 20_000,
        });
        await expect(parentCard.getByText(/You're in|Du bist dabei|coming/i)).toBeVisible({
          timeout: 10_000,
        });
      } finally {
        await parentContext.close();
      }

      await trainerPage.goto("/activities");
      await expect(trainerPage.getByTestId("activities-page")).toBeVisible({ timeout: 45_000 });

      const refreshedCard = trainerPage.getByTestId("activity-card").filter({ hasText: activityTitle });
      await expect(refreshedCard.getByText(/Team response|Team-Antworten/i)).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        refreshedCard.getByText(new RegExp(creds!.childDisplayName, "i")),
        `Expected "${creds!.childDisplayName}" under Coming after parent RSVP`,
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await trainerContext.close().catch(() => undefined);
    }
  });
});
