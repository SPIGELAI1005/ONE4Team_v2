/**
 * Wave 1 hardening — gap-analysis §12 proofs that run in CI without staging JWTs.
 * Live JWT probes live in `src/test/rls.integration.test.ts` (env-gated).
 *
 * Rule: dashboard persona / activeRole is never authorization — use module gates + RLS/RPC.
 */
import { describe, expect, it } from "vitest";
import {
  canAccessClubFinance,
  canManageAttendance,
  canRespondAttendanceGuardian,
  canRespondAttendanceSelf,
} from "@/lib/activity-attendance-access";
import { canAccessFinancialReports } from "@/lib/club-report-persona";
import { canAccessModule, getModuleAccess } from "@/lib/rbac-config";

describe("Wave 1 RLS / permission proofs (gap §12)", () => {
  it("finance routes stay behind payments:full — team_management and trainers denied", () => {
    expect(canAccessClubFinance("team_management")).toBe(false);
    expect(canAccessClubFinance("trainer")).toBe(false);
    expect(canAccessClubFinance("player")).toBe(false);
    expect(canAccessClubFinance("parent_supporter")).toBe(false);
    expect(getModuleAccess("team_management", "payments")).not.toBe("full");
    expect(canAccessClubFinance("club_admin")).toBe(true);
    expect(canAccessClubFinance("admin")).toBe(true);
  });

  it("financial reports URL persona cannot unlock finance for team_management", () => {
    expect(canAccessFinancialReports("trainer", "dashboard", "team_management")).toBe(false);
    expect(canAccessFinancialReports("admin", "dashboard", "team_management")).toBe(false);
    expect(canAccessFinancialReports("admin", "dashboard", "club_admin")).toBe(true);
    expect(canAccessFinancialReports("admin", "public", "club_admin")).toBe(false);
  });

  it("payments module gate: only club admins get full write for Payments page", () => {
    expect(canAccessModule("club_admin", "payments")).toBe(true);
    expect(canAccessModule("admin", "payments")).toBe(true);
    expect(canAccessModule("team_management", "payments")).toBe(false);
    expect(canAccessModule("trainer", "payments")).toBe(false);
  });

  it("attendance manage is trainer/ops — players cannot manage others' rows in UX gates", () => {
    expect(canManageAttendance("trainer")).toBe(true);
    expect(canManageAttendance("team_management")).toBe(true);
    expect(canManageAttendance("club_admin")).toBe(true);
    expect(canManageAttendance("player")).toBe(false);
    expect(canManageAttendance("member")).toBe(false);
    expect(canManageAttendance("parent_supporter")).toBe(false);
  });

  it("guardian RSVP UX is allowed for parents/household roles, not plain players", () => {
    expect(canRespondAttendanceGuardian("parent_supporter")).toBe(true);
    expect(canRespondAttendanceGuardian("member")).toBe(true);
    expect(canRespondAttendanceGuardian("player")).toBe(false);
    expect(canRespondAttendanceSelf("player")).toBe(true);
  });

  it("documents: persona ≠ authorization (finance helper ignores report persona when role passed)", () => {
    // Even if UI persona were "admin", authorizedRole team_management must lose.
    expect(canAccessFinancialReports("admin", "dashboard", "team_management")).toBe(false);
  });

  it("documents: operator Control Center is a separate portal (not club membership)", () => {
    // Unknown / platform strings do not map to club roles → no club module access.
    expect(canAccessModule("operator_platform", "payments")).toBe(false);
    expect(canAccessModule("platform_admin", "payments")).toBe(false);
    expect(canAccessModule("club_admin", "payments")).toBe(true);
  });
});