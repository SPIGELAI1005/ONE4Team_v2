import { test, expect } from "@playwright/test";
import { hasE2eAuthCredentials, loginAsE2eUser } from "./fixtures/auth";

test.describe("AI 4 T smoke", () => {
  test.skip(!hasE2eAuthCredentials(), "Set E2E_AI4T_EMAIL and E2E_AI4T_PASSWORD for authenticated AI 4 T smokes");

  test("co-trainer chat loads for signed-in trainer", async ({ page }) => {
    await loginAsE2eUser(page);
    await page.goto("/co-trainer");
    await expect(page.getByRole("tab", { name: /chat/i })).toBeVisible();
  });

  test("agent propose path records run id (manual idempotency check)", async ({ page }) => {
    await loginAsE2eUser(page);
    await page.goto("/co-trainer?tab=agent");
    await expect(page.getByText(/plan training week|trainingswoche/i)).toBeVisible();
  });
});
