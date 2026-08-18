import { test, expect } from "./fixtures/test";
import { createE2eContext, getTeamOpsE2eCreds, signIn } from "./fixtures/team-ops-auth";
import { dismissBlockingOverlays } from "./fixtures/sign-in";

/** Scenario 4 — poll create → vote (smoke). */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops polls scenario 4", () => {
  test.skip(!creds, "Set E2E_TRAINER_* / E2E_PARENT_* / E2E_CHILD_DISPLAY_NAME.");

  test.setTimeout(120_000);

  test("trainer creates poll; parent votes", async ({ browser }) => {
    const pollTitle = `E2E Poll ${Date.now()}`;
    const { context: trainerCtx, page: trainerPage } = await createE2eContext(browser);

    try {
      await signIn(trainerPage, creds!.trainerEmail, creds!.trainerPassword);
      await trainerPage.goto("/communication");
      await dismissBlockingOverlays(trainerPage);
      await trainerPage.getByRole("button", { name: /Polls|Umfragen/i }).click();
      await expect(trainerPage.getByTestId("club-polls-panel")).toBeVisible({ timeout: 30_000 });
      await trainerPage.getByTestId("polls-create-open").click();
      await trainerPage.getByPlaceholder(/Question|Frage/i).fill(pollTitle);
      await trainerPage.getByRole("button", { name: /New poll|Neue Umfrage|Create/i }).last().click();
      await expect(trainerPage.getByText(pollTitle)).toBeVisible({ timeout: 20_000 });

      const { context: parentCtx, page: parentPage } = await createE2eContext(browser);
      try {
        await signIn(parentPage, creds!.parentEmail, creds!.parentPassword);
        await parentPage.goto("/communication");
        await dismissBlockingOverlays(parentPage);
        await parentPage.getByRole("button", { name: /Polls|Umfragen/i }).click();
        const pollCard = parentPage.getByText(pollTitle);
        await expect(pollCard).toBeVisible({ timeout: 30_000 });
        await parentPage.getByText(/^Yes$|^Ja$/i).first().click();
        await parentPage.getByTestId("polls-vote-submit").first().click();
        await expect(parentPage.getByText(/saved|gespeichert|vote/i)).toBeVisible({ timeout: 15_000 });
      } finally {
        await parentCtx.close();
      }
    } finally {
      await trainerCtx.close();
    }
  });
});
