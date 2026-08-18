import { expect, test } from "./fixtures/test";
import { dismissBlockingOverlays } from "./fixtures/sign-in";
import {
  createE2eContext,
  getTeamOpsE2eCreds,
  getTeamOpsFamilyE2eCreds,
  signIn,
} from "./fixtures/team-ops-auth";

const coreCreds = getTeamOpsE2eCreds();
const familyCreds = getTeamOpsFamilyE2eCreds();

test.describe("team-ops ledger approval", () => {
  test.skip(
    !coreCreds || !familyCreds,
    "Set core Team Ops credentials plus trainer-parent reviewer credentials.",
  );
  test.setTimeout(150_000);

  test("one trainer submits an entry and another trainer approves it", async ({ browser }) => {
    const description = `E2E Ledger ${Date.now()}`;
    const { context: submitterContext, page: submitterPage } = await createE2eContext(browser);
    try {
      await signIn(submitterPage, coreCreds!.trainerEmail, coreCreds!.trainerPassword);
      await submitterPage.goto("/team-ledger");
      await dismissBlockingOverlays(submitterPage);
      await expect(submitterPage.getByTestId("ledger-amount")).toBeVisible({ timeout: 30_000 });
      await submitterPage.getByTestId("ledger-amount").fill("12.34");
      await submitterPage.getByTestId("ledger-description").fill(description);
      await submitterPage.getByTestId("ledger-save").click();
      await expect(
        submitterPage.getByTestId("ledger-entry").filter({ hasText: description }),
      ).toBeVisible({ timeout: 30_000 });

      const { context: reviewerContext, page: reviewerPage } = await createE2eContext(browser);
      try {
        await signIn(
          reviewerPage,
          familyCreds!.trainerParentEmail,
          familyCreds!.trainerParentPassword,
        );
        await reviewerPage.goto("/team-ledger");
        await dismissBlockingOverlays(reviewerPage);
        const entry = reviewerPage.getByTestId("ledger-entry").filter({ hasText: description });
        await expect(entry).toBeVisible({ timeout: 30_000 });
        await entry.getByTestId("ledger-approve").click();
        await expect(entry.getByText(/approved|genehmigt/i)).toBeVisible({ timeout: 20_000 });
      } finally {
        await reviewerContext.close();
      }
    } finally {
      await submitterContext.close();
    }
  });
});
