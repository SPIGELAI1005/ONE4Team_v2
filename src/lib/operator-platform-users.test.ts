import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import {
  createPlatformUser,
  formatPlatformUserStatus,
  getPlatformUsers,
  invitePlatformUser,
  localizeSettingsError,
  PLATFORM_USER_ROLES,
  setPlatformUserStatus,
  updatePlatformUserRole,
} from "@/lib/operator-platform-users";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801170000_operator_settings_and_club_controls.sql",
);

describe("operator platform users migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines protected platform user directory and OWNER-only mutations", () => {
    expect(migration).toContain("create or replace function public.get_platform_users()");
    expect(migration).toContain("create or replace function public.create_platform_user(");
    expect(migration).toContain("create or replace function public.update_platform_user_role(");
    expect(migration).toContain("create or replace function public.set_platform_user_status(");
    expect(migration).toContain("require_platform_owner()");
    expect(migration).toContain("Reason is required.");
  });

  it("audits platform user lifecycle changes", () => {
    expect(migration).toContain("PLATFORM_USER_ROLE_CHANGED");
    expect(migration).toContain("PLATFORM_USER_ENABLED");
    expect(migration).toContain("PLATFORM_USER_DISABLED");
    expect(migration).toContain("PLATFORM_USER_CREATED");
  });

  it("supports service-role invite grants", () => {
    expect(migration).toContain("grant_platform_user_from_invite");
    expect(migration).toContain("grant execute on function public.grant_platform_user_from_invite");
  });
});

describe("operator platform users helpers", () => {
  it("exports platform user access helpers", () => {
    expect(typeof getPlatformUsers).toBe("function");
    expect(typeof createPlatformUser).toBe("function");
    expect(typeof updatePlatformUserRole).toBe("function");
    expect(typeof setPlatformUserStatus).toBe("function");
    expect(typeof invitePlatformUser).toBe("function");
    expect(PLATFORM_USER_ROLES).toContain("VIEWER");
  });

  it("localizes platform user status and settings errors", () => {
    expect(formatPlatformUserStatus("ACTIVE", en)).toBe("Active");
    expect(formatPlatformUserStatus("DISABLED", de)).toBe("Deaktiviert");
    expect(localizeSettingsError("Reason is required.", de)).toBe("Grund ist erforderlich.");
  });
});
