import { test, expect } from "./fixtures/test";
import {
  createE2eContext,
  futureActivityStartsAt,
  getTeamOpsE2eCreds,
  signIn,
  waitForTrainerActivitiesReady,
} from "./fixtures/team-ops-auth";

/** Scenario 6 — guest trial → convert draft+invite (smoke). */
const creds = getTeamOpsE2eCreds();

test.describe("team-ops guests scenario 6", () => {
  test.skip(!creds, "Set E2E_TRAINER_* / E2E_PARENT_* / E2E_CHILD_DISPLAY_NAME.");

  test.setTimeout(180_000);

  test("trainer adds guest and starts draft+invite conversion", async ({ browser }) => {
    const title = `E2E Guest ${Date.now()}`;
    const guestEmail = `e2e-guest-${Date.now()}@example.com`;
    const startsAt = futureActivityStartsAt(6);
    const { context, page } = await createE2eContext(browser);

    try {
      await signIn(page, creds!.trainerEmail, creds!.trainerPassword);
      await waitForTrainerActivitiesReady(page);
      await page.getByTestId("activities-create-open").first().click();
      await page.getByPlaceholder(/Training|e\.g\.|z\. B\./i).fill(title);
      await page.getByPlaceholder(/YYYY-MM-DD|JJJJ-MM-TT/i).fill(startsAt);
      await page.getByRole("button", { name: /^Create$|^Erstellen$/i }).click();
      const card = page.getByTestId("activity-card").filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.getByRole("button", { name: /Guests|Gäste|trials/i }).click();
      const panel = card.getByTestId("activity-guests-panel");
      await panel.getByRole("button", { name: /Add guest|Gast hinzufügen/i }).click();
      await panel.getByPlaceholder(/Display name|Anzeigename/i).fill("E2E Guest");
      await panel.getByPlaceholder(/email/i).fill(guestEmail);
      await panel.getByRole("button", { name: /Add guest|Gast hinzufügen/i }).last().click();
      await expect(panel.getByText("E2E Guest")).toBeVisible({ timeout: 20_000 });
      await panel.getByRole("button", { name: /Draft \+ invite|Entwurf/i }).click();
      await expect(panel.getByText(/converted|invited|eingeladen/i)).toBeVisible({ timeout: 30_000 });
    } finally {
      await context.close();
    }
  });
});
