import type { NavigateFunction } from "react-router-dom";
import type { ClubOption } from "@/hooks/use-active-club";
import { notifyMembershipsUpdated } from "@/hooks/use-active-club";
import { defaultPartnerPortalPath, PARTNER_PORTAL_ROUTES } from "@/lib/partner-portal-routes";
import {
  isExternalRole,
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";

export const ACTIVE_DASHBOARD_PERSONA_KEY = "one4team.activeRole";

export const DASHBOARD_PERSONA_CHANGED_EVENT = "one4team:dashboard-persona-changed";

export interface DashboardPersonaChangeDetail {
  role: DashboardRole;
}

export function readActiveDashboardPersonaSlug(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACTIVE_DASHBOARD_PERSONA_KEY) ||
    localStorage.getItem("one4team_role") ||
    null
  );
}

export function publishDashboardPersonaChange(role: DashboardRole): void {
  window.dispatchEvent(
    new CustomEvent<DashboardPersonaChangeDetail>(DASHBOARD_PERSONA_CHANGED_EVENT, {
      detail: { role },
    }),
  );
}

function pickClubForPersona(persona: DashboardRole, clubs: ClubOption[]): string | null {
  if (!clubs.length) return null;

  const score = (club: ClubOption): number => {
    const legacy = club.role?.toLowerCase() ?? "";
    const normalized = normalizeDashboardRole(club.role);

    if (persona === "club_admin") {
      if (legacy === "admin" || normalized === "club_admin") return 100;
      return 0;
    }
    if (persona === "trainer") {
      if (legacy === "trainer" || normalized === "trainer") return 80;
      if (legacy === "admin") return 60;
      return 0;
    }
    if (persona === "player") {
      if (normalized === "player") return 70;
      if (legacy === "trainer" || legacy === "admin") return 40;
      return 0;
    }
    if (isExternalRole(persona)) {
      if (legacy === persona) return 90;
      return 10;
    }
    return legacy === persona ? 50 : 0;
  };

  const ranked = [...clubs].sort((a, b) => score(b) - score(a));
  const best = ranked.find((club) => score(club) > 0);
  return best?.id ?? clubs[0]?.id ?? null;
}

/** Route to open after switching persona (dashboard or partner portal home). */
export function resolvePersonaSwitchTarget(role: DashboardRole): string {
  const normalized = normalizeDashboardRole(role);
  if (!normalized) return "/dashboard/member";

  if (isExternalRole(normalized)) {
    return defaultPartnerPortalPath(normalized, normalized);
  }

  return `/dashboard/${normalized}`;
}

export interface SwitchDashboardPersonaOptions {
  clubs?: ClubOption[];
  setActiveClub?: (clubId: string) => void;
  notifyMemberships?: () => void;
}

/**
 * Persist dashboard persona, align active club when switching to club roles,
 * and navigate to the correct portal home.
 */
export function switchDashboardPersona(
  role: DashboardRole,
  navigate: NavigateFunction,
  options?: SwitchDashboardPersonaOptions,
): DashboardRole | null {
  const normalized = normalizeDashboardRole(role);
  if (!normalized) return null;

  localStorage.setItem(ACTIVE_DASHBOARD_PERSONA_KEY, normalized);
  localStorage.removeItem("one4team_role");
  publishDashboardPersonaChange(normalized);

  if (!isExternalRole(normalized) && options?.clubs?.length) {
    const clubId = pickClubForPersona(normalized, options.clubs);
    if (clubId) options.setActiveClub?.(clubId);
  }

  (options?.notifyMemberships ?? notifyMembershipsUpdated)();

  const target = resolvePersonaSwitchTarget(normalized);
  navigate(target, { replace: true });
  return normalized;
}

/** Slug used in `/dashboard/:role` — external personas use their own slug. */
export function dashboardPathForPersona(role: DashboardRole | string | null | undefined): string {
  const normalized = normalizeDashboardRole(role);
  if (!normalized) return "/dashboard/member";
  if (isExternalRole(normalized)) {
    return PARTNER_PORTAL_ROUTES.marketplace;
  }
  return `/dashboard/${normalized}`;
}
