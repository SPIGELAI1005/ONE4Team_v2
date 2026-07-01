import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  isClubGeneralAdminFromAssignments,
  isTrainerCapability,
} from "@/lib/permissions";

export type ClubReportPersona = "admin" | "trainer" | "player" | "sponsor" | "member";

export function resolveClubReportPersona(input: {
  legacyRole: string | null | undefined;
  assignments?: ClubRoleAssignmentRow[] | null;
  isClubAdminRpc?: boolean | null;
}): ClubReportPersona {
  const role = (input.legacyRole ?? "").toLowerCase();
  if (role === "sponsor") return "sponsor";
  if (isClubGeneralAdminFromAssignments(input.legacyRole, input.assignments) || input.isClubAdminRpc === true) {
    return "admin";
  }
  if (isTrainerCapability(input.legacyRole, input.assignments)) return "trainer";
  if (role === "player") return "player";
  return "member";
}

/** Financial reports are dashboard-only - never on the public club microsite. */
export function canAccessFinancialReports(persona: ClubReportPersona, surface: "public" | "dashboard"): boolean {
  return surface === "dashboard" && persona === "admin";
}
