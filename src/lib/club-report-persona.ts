import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import { canAccessClubFinance } from "@/lib/activity-attendance-access";
import {
  isClubGeneralAdminFromAssignments,
  isTrainerCapability,
} from "@/lib/permissions";
import { normalizeDashboardRole, resolveDashboardRole } from "@/lib/rbac-config";

export type ClubReportPersona = "admin" | "trainer" | "player" | "sponsor" | "member";

export function resolveClubReportPersona(input: {
  legacyRole: string | null | undefined;
  assignments?: ClubRoleAssignmentRow[] | null;
  isClubAdminRpc?: boolean | null;
}): ClubReportPersona {
  const role = (input.legacyRole ?? "").toLowerCase();
  if (role === "sponsor") return "sponsor";

  const resolved = resolveDashboardRole(input.legacyRole, input.assignments);
  // Team Management is ops-admin for widgets but never club-finance admin.
  if (resolved === "team_management") return "trainer";

  if (isClubGeneralAdminFromAssignments(input.legacyRole, input.assignments) || input.isClubAdminRpc === true) {
    return "admin";
  }
  if (isTrainerCapability(input.legacyRole, input.assignments)) return "trainer";
  if (role === "player" || resolved === "player") return "player";
  return "member";
}

/**
 * Financial reports are dashboard-only and require club finance (payments:full).
 * Team Management / trainers / parents must not unlock this via URL `?section=financial`.
 */
export function canAccessFinancialReports(
  persona: ClubReportPersona,
  surface: "public" | "dashboard",
  authorizedRole?: string | null,
): boolean {
  if (surface !== "dashboard") return false;
  if (authorizedRole != null) {
    return canAccessClubFinance(normalizeDashboardRole(authorizedRole) ?? authorizedRole);
  }
  return persona === "admin";
}
