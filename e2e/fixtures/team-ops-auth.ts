import { expect, type Browser, type Page } from "@playwright/test";
import { attachCookieConsentInit } from "./cookie-consent";
import { dismissBlockingOverlays, signIn } from "./sign-in";

export interface TeamOpsE2eCreds {
  trainerEmail: string;
  trainerPassword: string;
  parentEmail: string;
  parentPassword: string;
  /** Substring match for guardian picker + trainer coming list (child display name). */
  childDisplayName: string;
}

export interface TeamOpsFamilyE2eCreds {
  parentDisplayName: string;
  excludedMemberDisplayName: string;
  playerEmail: string;
  playerPassword: string;
  playerParentEmail: string;
  playerParentPassword: string;
  trainerParentEmail: string;
  trainerParentPassword: string;
}

export function getTeamOpsE2eCreds(): TeamOpsE2eCreds | null {
  const trainerEmail = process.env.E2E_TRAINER_EMAIL?.trim() || "";
  const trainerPassword = process.env.E2E_TRAINER_PASSWORD?.trim() || "";
  const parentEmail = process.env.E2E_PARENT_EMAIL?.trim() || "";
  const parentPassword = process.env.E2E_PARENT_PASSWORD?.trim() || "";
  const childDisplayName = process.env.E2E_CHILD_DISPLAY_NAME?.trim() || "";

  if (!trainerEmail || !trainerPassword || !parentEmail || !parentPassword || !childDisplayName) {
    return null;
  }

  return {
    trainerEmail,
    trainerPassword,
    parentEmail,
    parentPassword,
    childDisplayName,
  };
}

export function getTeamOpsFamilyE2eCreds(): TeamOpsFamilyE2eCreds | null {
  const values = {
    parentDisplayName: process.env.E2E_PARENT_DISPLAY_NAME?.trim() || "",
    excludedMemberDisplayName: process.env.E2E_EXCLUDED_MEMBER_DISPLAY_NAME?.trim() || "",
    playerEmail: process.env.E2E_PLAYER_EMAIL?.trim() || "",
    playerPassword: process.env.E2E_PLAYER_PASSWORD?.trim() || "",
    playerParentEmail: process.env.E2E_PLAYER_PARENT_EMAIL?.trim() || "",
    playerParentPassword: process.env.E2E_PLAYER_PARENT_PASSWORD?.trim() || "",
    trainerParentEmail: process.env.E2E_TRAINER_PARENT_EMAIL?.trim() || "",
    trainerParentPassword: process.env.E2E_TRAINER_PARENT_PASSWORD?.trim() || "",
  };
  if (Object.values(values).some((value) => !value)) return null;
  return values;
}

export function futureActivityStartsAt(daysAhead = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(18, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export { signIn };

export async function createE2eContext(browser: Browser) {
  const context = await browser.newContext();
  await attachCookieConsentInit(context);
  const page = await context.newPage();
  return { context, page };
}

export async function waitForActivitiesPage(page: Page): Promise<void> {
  await page.goto("/activities");
  await expect(page).not.toHaveURL(/\/auth(\b|\/|\?|#)/);
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("activities-page")).toBeVisible({ timeout: 45_000 });

  const noClubHeading = page.getByRole("heading", { name: /No club selected|Kein Verein ausgewählt/i });
  if (await noClubHeading.isVisible({ timeout: 3_000 }).catch(() => false)) {
    throw new Error("No active club for E2E user — assign an active club membership in Supabase.");
  }

  await expect(page.getByTestId("activities-page").locator(".animate-spin")).toHaveCount(0, {
    timeout: 90_000,
  });
}

/** Trainer/admin create flow — waits until club context loaded and New button is available. */
export async function waitForTrainerActivitiesReady(page: Page): Promise<void> {
  await waitForActivitiesPage(page);
  await expect(
    page.getByTestId("activities-create-open").first(),
    "Missing New activity button — E2E trainer account needs trainer/admin role on an active club.",
  ).toBeVisible({ timeout: 30_000 });
}

export async function selectGuardianChild(page: Page, childDisplayName: string): Promise<void> {
  const picker = page.getByTestId("attendance-rsvp-responding-for");
  const hasPicker = await picker.isVisible({ timeout: 20_000 }).catch(() => false);

  if (!hasPicker) {
    throw new Error(
      `Guardian picker ("Responding for") not shown for ${childDisplayName}. Checklist:\n` +
        `1. E2E_PARENT_EMAIL must be an active member of the same club as the child.\n` +
        `2. The child must be on the active roster (club_memberships.status = active), not only on the saved draft list.\n` +
        `3. Link the parent in Members → open the child on the roster → Safety → Linked guardians (creates club_member_guardian_links).\n` +
        `   Draft-only guardian links (saved member list) do not enable RSVP until the child has joined the roster.\n` +
        `4. The linked guardian must be the E2E_PARENT_EMAIL account (not a different admin account).`,
    );
  }

  await picker.getByRole("combobox").click();
  const childOption = page.getByRole("option", { name: new RegExp(childDisplayName, "i") });
  await expect(childOption, `No child matching "${childDisplayName}" in Responding for`).toBeVisible({
    timeout: 10_000,
  });
  await childOption.click();
}
