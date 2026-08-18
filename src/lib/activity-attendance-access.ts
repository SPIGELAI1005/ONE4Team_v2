/**
 * Team Operations Wave 1 — attendance capability helpers.
 *
 * Derived from `rbac-config` module access (trainings/matches/payments).
 * Dashboard persona / `one4team.activeRole` must never be used as authorization.
 */

import {
  canAccessModule,
  getModuleAccess,
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";

export type AttendanceResponseCapability =
  | "respond_self"
  | "respond_guardian"
  | "manage"
  | "analytics";

/** Club financial reports / Payments write — not Team Management. */
export function canAccessClubFinance(role: DashboardRole | string | null | undefined): boolean {
  return getModuleAccess(role, "payments") === "full";
}

/** Self RSVP on trainings/matches the role can see. */
export function canRespondAttendanceSelf(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return false;
  if (normalized === "fan") return false;
  return (
    canAccessModule(normalized, "trainings") ||
    canAccessModule(normalized, "matches") ||
    canAccessModule(normalized, "events")
  );
}

/**
 * Guardians / parents may respond for linked wards (enforced in RPC via guardian links).
 * Client helper only gates UX affordances.
 */
export function canRespondAttendanceGuardian(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return false;
  return (
    normalized === "parent_supporter" ||
    normalized === "club_admin" ||
    normalized === "admin" ||
    normalized === "team_management" ||
    normalized === "member" // shared-login household often uses member/parent mix
  );
}

/** Trainer / ops override of attendance rows (not parent/player team-scope RSVP). */
export function canManageAttendance(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return false;
  return (
    normalized === "trainer" ||
    normalized === "team_staff" ||
    normalized === "team_management" ||
    normalized === "club_admin" ||
    normalized === "admin"
  );
}

/** Attendance analytics surfaces (Reports / AI context). */
export function canViewAttendanceAnalytics(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return false;
  if (canAccessModule(normalized, "reports")) return true;
  return canManageAttendance(normalized);
}

export function hasAttendanceCapability(
  role: DashboardRole | string | null | undefined,
  capability: AttendanceResponseCapability,
): boolean {
  switch (capability) {
    case "respond_self":
      return canRespondAttendanceSelf(role);
    case "respond_guardian":
      return canRespondAttendanceGuardian(role);
    case "manage":
      return canManageAttendance(role);
    case "analytics":
      return canViewAttendanceAnalytics(role);
    default:
      return false;
  }
}
