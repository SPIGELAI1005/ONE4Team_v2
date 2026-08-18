import { test, expect } from "./fixtures/test";
import { createE2eContext, getTeamOpsE2eCreds, signIn } from "./fixtures/team-ops-auth";
import { dismissBlockingOverlays } from "./fixtures/sign-in";

/** Scenario 3 — trainer creates an open duty and parent claims it. */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops duties scenario 3", () => {
  test.skip(!creds, "Set E2E_TRAINER_* / E2E_PARENT_* / E2E_CHILD_DISPLAY_NAME.");

  test.setTimeout(120_000);

  test("trainer creates a claimable duty; parent claims it", async ({ browser }) => {
    const taskTitle = `E2E Duty ${Date.now()}`;
    const { context: trainerContext, page: trainerPage } = await createE2eContext(browser);
    try {
      await signIn(trainerPage, creds!.trainerEmail, creds!.trainerPassword);
      await trainerPage.goto("/tasks");
      await dismissBlockingOverlays(trainerPage);
      await expect(trainerPage.getByTestId("tasks-create-open")).toBeVisible({ timeout: 30_000 });
      await trainerPage.getByTestId("tasks-create-open").click();
      await trainerPage.getByTestId("tasks-title").fill(taskTitle);
      await trainerPage.getByTestId("tasks-claimable").click();
      await trainerPage.getByTestId("tasks-save").click();
      await expect(trainerPage.getByTestId("tasks-task-row").filter({ hasText: taskTitle })).toBeVisible({
        timeout: 30_000,
      });

      const { context: parentContext, page: parentPage } = await createE2eContext(browser);
      try {
        await signIn(parentPage, creds!.parentEmail, creds!.parentPassword);
        await parentPage.goto("/tasks");
        await dismissBlockingOverlays(parentPage);
        const taskRow = parentPage.getByTestId("tasks-task-row").filter({ hasText: taskTitle });
        await expect(taskRow).toBeVisible({ timeout: 30_000 });
        await taskRow.click();
        await parentPage.getByTestId("tasks-claim-duty").click();
        await expect(parentPage.getByText(/claimed|Claimed|übernommen/i)).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await parentContext.close();
      }
    } finally {
      await trainerContext.close();
    }
  });
});
