import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  getEffectiveDashboardPersonas,
  normalizeDashboardRole,
  resolveDashboardRole,
} from "@/lib/rbac-config";

export interface DashboardPersonaContext {
  /** When true, club-admin personas are allowed even if legacy membership is e.g. supplier. */
  treatAsClubAdmin?: boolean;
  /** True while club / assignment permissions are still hydrating after navigation or club switch. */
  permissionsLoading?: boolean;
}

/**
 * Whether the URL/localStorage dashboard persona is allowed for the authorized role.
 */
export function isDashboardPersonaAllowed(
  personaSlug: string | null | undefined,
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
  ctx?: DashboardPersonaContext,
): boolean {
  const persona = normalizeDashboardRole(personaSlug);
  if (!persona) return false;
  const effective = getEffectiveDashboardPersonas(legacyRole, assignments, ctx);
  return effective.includes(persona);
}

/** Fallback dashboard slug when persona is not allowed. */
export function defaultDashboardPersonaSlug(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
  ctx?: DashboardPersonaContext,
): string {
  const authorized = resolveDashboardRole(legacyRole, assignments);
  if (ctx?.treatAsClubAdmin) {
    return "club_admin";
  }
  if (authorized) {
    const effective = getEffectiveDashboardPersonas(legacyRole, assignments, ctx);
    if (effective.includes(authorized)) return authorized;
  }
  const effective = getEffectiveDashboardPersonas(legacyRole, assignments, ctx);
  return effective[0] ?? "member";
}

/**
 * Role used for route guards and page data scope.
 * When the user is viewing as an allowed persona (e.g. supplier), that persona wins
 * over club-admin elevation - dual-role users see supplier-only data on /dashboard/supplier.
 */
export function resolveModuleGateRole(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
  activePersonaRaw: string | null | undefined,
  ctx?: DashboardPersonaContext,
): ReturnType<typeof resolveDashboardRole> {
  const persona = normalizeDashboardRole(activePersonaRaw);

  // Keep the user's explicit dashboard persona while permissions re-hydrate (club switch,
  // membership refetch). Without this, menuRole briefly falls back to legacy membership
  // (e.g. member) and the UI looks like the role switch was undone.
  if (ctx?.permissionsLoading && persona) {
    return persona;
  }

  if (
    persona &&
    isDashboardPersonaAllowed(persona, legacyRole, assignments, ctx)
  ) {
    return persona;
  }

  const authorized = resolveDashboardRole(legacyRole, assignments);
  if (ctx?.treatAsClubAdmin) {
    return "club_admin";
  }
  return authorized ?? "member";
}
