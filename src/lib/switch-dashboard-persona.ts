import type { NavigateFunction } from "react-router-dom";
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

export function isSameDashboardPersona(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = a ? normalizeDashboardRole(a) : null;
  const right = b ? normalizeDashboardRole(b) : null;
  return left !== null && right !== null && left === right;
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

/**
 * Persist dashboard persona only — does not change active club or refetch memberships.
 * Dashboard persona is a view mode for the club the user already selected.
 */
export function persistDashboardPersona(role: DashboardRole): DashboardRole | null {
  const normalized = normalizeDashboardRole(role);
  if (!normalized) return null;

  localStorage.setItem(ACTIVE_DASHBOARD_PERSONA_KEY, normalized);
  localStorage.removeItem("one4team_role");
  publishDashboardPersonaChange(normalized);
  return normalized;
}

export interface SwitchDashboardPersonaOptions {
  /** When false, only persist persona (e.g. Settings). Default true. */
  navigateToHome?: boolean;
}

/**
 * Persist dashboard persona and optionally navigate to the matching dashboard home.
 * Never changes the active club — use ClubSwitcher for that.
 */
export function switchDashboardPersona(
  role: DashboardRole,
  navigate: NavigateFunction,
  options?: SwitchDashboardPersonaOptions,
): DashboardRole | null {
  const normalized = persistDashboardPersona(role);
  if (!normalized) return null;

  if (options?.navigateToHome === false) return normalized;

  navigate(resolvePersonaSwitchTarget(normalized), { replace: true });
  return normalized;
}

/** Slug used in `/dashboard/:role` - external personas use their own slug. */
export function dashboardPathForPersona(role: DashboardRole | string | null | undefined): string {
  const normalized = normalizeDashboardRole(role);
  if (!normalized) return "/dashboard/member";
  if (isExternalRole(normalized)) {
    return PARTNER_PORTAL_ROUTES.marketplace;
  }
  return `/dashboard/${normalized}`;
}
