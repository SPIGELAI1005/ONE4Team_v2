import { test, expect } from "./fixtures/test";
import {
  createE2eContext,
  futureActivityStartsAt,
  getTeamOpsE2eCreds,
  signIn,
  waitForActivitiesPage,
  waitForTrainerActivitiesReady,
} from "./fixtures/team-ops-auth";

/** Scenario 5 — carpool offer → request seat (smoke). */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops transport scenario 5", () => {
  test.skip(!creds, "Set E2E_TRAINER_* / E2E_PARENT_* / E2E_CHILD_DISPLAY_NAME.");

  test.setTimeout(180_000);

  test("driver offers seats; rider requests", async ({ browser }) => {
    const title = `E2E Transport ${Date.now()}`;
    const startsAt = futureActivityStartsAt(5);
    const { context: driverCtx, page: driverPage } = await createE2eContext(browser);

    try {
      await signIn(driverPage, creds!.trainerEmail, creds!.trainerPassword);
      await waitForTrainerActivitiesReady(driverPage);
      await driverPage.getByTestId("activities-create-open").first().click();
      await driverPage.getByPlaceholder(/Training|e\.g\.|z\. B\./i).fill(title);
      await driverPage.getByPlaceholder(/YYYY-MM-DD|JJJJ-MM-TT/i).fill(startsAt);
      await driverPage.getByRole("button", { name: /^Create$|^Erstellen$/i }).click();
      const card = driverPage.getByTestId("activity-card").filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.getByRole("button", { name: /Transport|Fahrgemeinschaft|Carpool/i }).click();
      const panel = card.getByTestId("activity-transport-panel");
      await panel.getByTestId("transport-offer-open").click();
      await panel.getByTestId("transport-offer-submit").click();
      await expect(panel.getByTestId("transport-summary")).toBeVisible({ timeout: 20_000 });

      const { context: riderCtx, page: riderPage } = await createE2eContext(browser);
      try {
        await signIn(riderPage, creds!.parentEmail, creds!.parentPassword);
        await waitForActivitiesPage(riderPage);
        const riderCard = riderPage.getByTestId("activity-card").filter({ hasText: title });
        await expect(riderCard).toBeVisible({ timeout: 30_000 });
        await riderCard.getByRole("button", { name: /Transport|Fahrgemeinschaft|Carpool/i }).click();
        await riderCard.getByTestId("transport-request-seat").click();
        await expect(riderCard.getByText(/pending|ausstehend|Request/i)).toBeVisible({ timeout: 20_000 });
      } finally {
        await riderCtx.close();
      }
    } finally {
      await driverCtx.close();
    }
  });
});
