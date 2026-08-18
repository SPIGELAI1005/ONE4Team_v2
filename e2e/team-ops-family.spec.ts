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

test.describe("team-ops family scope and personas", () => {
  test.skip(
    !coreCreds || !familyCreds,
    "Set core Team Ops credentials plus E2E family/persona credentials.",
  );
  test.setTimeout(120_000);

  test("parent Members shows self and linked child but not an unrelated member", async ({ browser }) => {
    const { context, page } = await createE2eContext(browser);
    try {
      await signIn(page, coreCreds!.parentEmail, coreCreds!.parentPassword);
      await page.goto("/members");
      await dismissBlockingOverlays(page);
      await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/);
      await expect(page.getByText(familyCreds!.parentDisplayName, { exact: false }).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(coreCreds!.childDisplayName, { exact: false }).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(
        page.getByText(familyCreds!.excludedMemberDisplayName, { exact: false }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("ordinary player is not offered Parent persona", async ({ browser }) => {
    const { context, page } = await createE2eContext(browser);
    try {
      await signIn(page, familyCreds!.playerEmail, familyCreds!.playerPassword);
      await page.goto("/settings");
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("persona-switch-player")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("persona-switch-parent_supporter")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  for (const account of [
    {
      label: "player + parent",
      email: () => familyCreds!.playerParentEmail,
      password: () => familyCreds!.playerParentPassword,
    },
    {
      label: "trainer + parent",
      email: () => familyCreds!.trainerParentEmail,
      password: () => familyCreds!.trainerParentPassword,
    },
  ]) {
    test(`${account.label} is offered Parent persona`, async ({ browser }) => {
      const { context, page } = await createE2eContext(browser);
      try {
        await signIn(page, account.email(), account.password());
        await page.goto("/settings");
        await dismissBlockingOverlays(page);
        await expect(page.getByTestId("persona-switch-parent_supporter")).toBeVisible({
          timeout: 30_000,
        });
      } finally {
        await context.close();
      }
    });
  }
});
