import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import {
  formatOperatorInvitationStatus,
  formatOperatorUserClubsSummary,
  formatOperatorUserStatus,
  getOperatorUserDetailLevel,
  getOperatorUserDetail,
  getOperatorUsers,
} from "@/lib/operator-users";
const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801140000_operator_users.sql",
);

describe("operator users migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines protected platform user directory RPCs", () => {
    expect(migration).toContain("create or replace function public.get_operator_users");
    expect(migration).toContain("create or replace function public.get_operator_user_detail");
    expect(migration).toContain("require_platform_permission('operator.users.read')");
  });

  it("supports operator filters and privacy-aware email masking", () => {
    expect(migration).toContain("_search text");
    expect(migration).toContain("_club_id uuid");
    expect(migration).toContain("_club_role text");
    expect(migration).toContain("_platform_role text");
    expect(migration).toContain("_last_active_from timestamptz");
    expect(migration).toContain("mask_operator_email");
    expect(migration).toContain("invitation_status");
  });

  it("returns club memberships and recent activity without unnecessary PII", () => {
    expect(migration).toContain("recent_activity");
    expect(migration).toContain("recent_audit");
    expect(migration).toContain("club_memberships");
    const recentActivityBlock = migration.match(/'recent_activity',[\s\S]*?'recent_audit'/)?.[0] ?? "";
    expect(recentActivityBlock).not.toContain("metadata_json");
    expect(recentActivityBlock).not.toContain("phone");
  });
});

describe("operator users helpers", () => {
  it("maps detail levels by platform role", () => {
    expect(getOperatorUserDetailLevel("OWNER")).toBe("full");
    expect(getOperatorUserDetailLevel("OPERATOR")).toBe("full");
    expect(getOperatorUserDetailLevel("SUPPORT")).toBe("support");
    expect(getOperatorUserDetailLevel("VIEWER")).toBe("summary");
  });

  it("formats list summaries for the users table", () => {
    expect(formatOperatorUserStatus("active", en)).toBe("Active");
    expect(formatOperatorInvitationStatus("pending", en)).toBe("Pending invite");
    expect(
      formatOperatorUserClubsSummary(
        [
          { club_id: "1", club_name: "Club A", club_slug: "a", role: "admin", status: "active", membership_id: "m1" },
          { club_id: "2", club_name: "Club B", club_slug: "b", role: "member", status: "active", membership_id: "m2" },
          { club_id: "3", club_name: "Club C", club_slug: "c", role: "member", status: "active", membership_id: "m3" },
        ],
        en,
      ),
    ).toBe("Club A, Club B +1");
  });
  it("exports operator users data access helpers", () => {
    expect(typeof getOperatorUsers).toBe("function");
    expect(typeof getOperatorUserDetail).toBe("function");
  });
});
