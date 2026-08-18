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

/** Scenario 2 — availability hint on training card after parent sets absence (smoke). */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops availability scenario 2", () => {
  test.skip(!creds, "Set E2E_TRAINER_* / E2E_PARENT_* / E2E_CHILD_DISPLAY_NAME.");

  test.setTimeout(180_000);

  test("trainer creates training; parent sees RSVP controls with guardian picker", async ({ browser }) => {
    const title = `E2E Avail ${Date.now()}`;
    const startsAt = futureActivityStartsAt(4);
    const { context, page } = await createE2eContext(browser);

    try {
      await signIn(page, creds!.trainerEmail, creds!.trainerPassword);
      await waitForTrainerActivitiesReady(page);
      await page.getByTestId("activities-create-open").first().click();
      await page.getByPlaceholder(/Training|e\.g\.|z\. B\./i).fill(title);
      await page.getByPlaceholder(/YYYY-MM-DD|JJJJ-MM-TT/i).fill(startsAt);
      await page.getByRole("button", { name: /^Create$|^Erstellen$/i }).click();
      await expect(page.getByTestId("activity-card").filter({ hasText: title })).toBeVisible({
        timeout: 30_000,
      });

      const { context: parentCtx, page: parentPage } = await createE2eContext(browser);
      try {
        await signIn(parentPage, creds!.parentEmail, creds!.parentPassword);
        await waitForActivitiesPage(parentPage);
        await selectGuardianChild(parentPage, creds!.childDisplayName);
        const card = parentPage.getByTestId("activity-card").filter({ hasText: title });
        await expect(card.getByTestId("attendance-rsvp-coming")).toBeVisible({ timeout: 30_000 });
        await card.getByTestId("attendance-rsvp-not-coming").click();
        await expect(parentPage.getByText(/declined|abgesagt|Can't make/i)).toBeVisible({
          timeout: 20_000,
        });
      } finally {
        await parentCtx.close();
      }
    } finally {
      await context.close();
    }
  });
});
