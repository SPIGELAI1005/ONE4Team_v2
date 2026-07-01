import { test, expect } from "@playwright/test";

test.describe("AI 4 T smoke", () => {
  test.skip(!process.env.E2E_AI4T_EMAIL, "Set E2E_AI4T_EMAIL (+ password) for authenticated AI 4 T smokes");

  test("co-trainer chat loads for signed-in trainer", async ({ page }) => {
    test.skip(true, "Enable when E2E auth fixture is wired");
    await page.goto("/co-trainer");
    await expect(page.getByRole("tab", { name: /chat/i })).toBeVisible();
  });

  test("agent propose path records run id (manual idempotency check)", async ({ page }) => {
    test.skip(true, "Enable when E2E auth + stable test club seed exist");
    await page.goto("/co-trainer?tab=agent");
    await expect(page.getByText(/plan training week|trainingswoche/i)).toBeVisible();
  });
});
