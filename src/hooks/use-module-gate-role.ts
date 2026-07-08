import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveDashboardPersonaSlug } from "@/hooks/use-active-dashboard-persona-slug";
import { isDashboardPersonaAllowed, resolveModuleGateRole } from "@/lib/dashboard-persona";
import {
  isClubOnlyPortalPath,
  isPartnerOnlyPortalPath,
  isPartnerPortalPath,
  normalizePartnerPortalPath,
  PARTNER_PORTAL_ROUTES,
  portalPathImpliedPersonaSlug,
} from "@/lib/partner-portal-routes";
import {
  isExternalRole,
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";
import { readActiveDashboardPersonaSlug } from "@/lib/switch-dashboard-persona";

const ACTIVE_ROLE_KEY = "one4team.activeRole";

export type PortalSide = "club" | "partner" | "loading";

/** Raw slug from localStorage (non-reactive). */
export function readActiveDashboardPersonaRaw(): string | null {
  return readActiveDashboardPersonaSlug();
}

export function useActiveDashboardPersonaRaw(): string | null {
  const { role: urlRole } = useParams();
  const location = useLocation();
  const storedSlug = useActiveDashboardPersonaSlug();
  const pathPersona = portalPathImpliedPersonaSlug(location.pathname, storedSlug);
  return urlRole || pathPersona || storedSlug;
}

/**
 * Effective role for module routes, queries, and admin UI flags.
 * Respects the active dashboard persona for dual-role users.
 */
export function useModuleGateRole(): DashboardRole | null {
  const perms = usePermissions();
  const personaRaw = useActiveDashboardPersonaRaw();

  const permissionsLoading = perms.activeClubLoading || perms.assignmentsLoading;

  return useMemo(
    () =>
      resolveModuleGateRole(perms.role, perms.assignments, personaRaw, {
        treatAsClubAdmin:
          perms.isAdmin ||
          normalizeDashboardRole(perms.role) === "club_admin",
        permissionsLoading,
      }),
    [
      perms.role,
      perms.assignments,
      perms.isAdmin,
      permissionsLoading,
      personaRaw,
    ],
  );
}

/**
 * Which portal (club vs partner) the current route belongs to.
 * Waits for permissions before redirecting; dedicated URLs are authoritative.
 */
export function resolvePortalSide(input: {
  gateRole: DashboardRole | null;
  pathname: string;
  permissionsLoading: boolean;
}): PortalSide {
  if (input.permissionsLoading) return "loading";

  const normalized = normalizePartnerPortalPath(input.pathname);

  // Dedicated public-page admins - URL is authoritative (no club↔supplier ping-pong).
  if (isClubOnlyPortalPath(normalized)) return "club";
  if (normalized === PARTNER_PORTAL_ROUTES.supplier_page) return "partner";

  if (input.gateRole != null) {
    return isExternalRole(input.gateRole) ? "partner" : "club";
  }

  return isPartnerPortalPath(normalized) ? "partner" : "club";
}

export function useResolvedPortalSide(pathname: string): PortalSide {
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const permissionsLoading = perms.activeClubLoading || perms.assignmentsLoading;

  return useMemo(
    () =>
      resolvePortalSide({
        gateRole,
        pathname,
        permissionsLoading,
      }),
    [gateRole, pathname, permissionsLoading],
  );
}

export function useIsExternalDashboardPersona(): boolean {
  const gateRole = useModuleGateRole();
  return isExternalRole(gateRole);
}

export function useIsClubAdminDashboardPersona(): boolean {
  const gateRole = useModuleGateRole();
  const normalized = gateRole ? normalizeDashboardRole(gateRole) : null;
  return normalized === "club_admin" || normalized === "admin";
}

/** Keep localStorage persona aligned with dedicated portal URLs (club vs supplier page). */
export function usePersistPortalPersonaFromPath() {
  const location = useLocation();
  const perms = usePermissions();

  useEffect(() => {
    if (perms.activeClubLoading || perms.assignmentsLoading) return;

    const stored = readActiveDashboardPersonaRaw();
    const implied = portalPathImpliedPersonaSlug(location.pathname, stored);
    if (!implied || stored === implied) return;

    const ctx = { treatAsClubAdmin: perms.isAdmin };
    if (!isDashboardPersonaAllowed(implied, perms.role, perms.assignments, ctx)) return;

    localStorage.setItem(ACTIVE_ROLE_KEY, implied);
  }, [
    location.pathname,
    perms.role,
    perms.assignments,
    perms.isAdmin,
    perms.activeClubLoading,
    perms.assignmentsLoading,
  ]);
}
