import {
  isExternalRole,
  MODULE_ROUTES,
  normalizeDashboardRole,
  type DashboardModule,
  type DashboardRole,
} from "@/lib/rbac-config";

/**
 * Partner / external provider portal URLs — separate from club-internal routes.
 * Suppliers discover clubs and manage collaborations here, not other suppliers.
 */
export const PARTNER_PORTAL_ROUTES = {
  marketplace: "/partner-marketplace",
  messages: "/partner-messages",
  tasks: "/partner-tasks",
  reports: "/partner-reports",
  ai4t: "/partner-ai",
  supplier_page: "/supplier-page",
  settings: "/settings",
  support: "/support",
} as const;

const PARTNER_ROUTED_MODULES: DashboardModule[] = [
  "marketplace",
  "messages",
  "tasks",
  "reports",
  "ai4t",
  "supplier_page",
];

/** Club-only portal URLs (not generic internal modules). */
export const CLUB_ONLY_PORTAL_PATHS = ["/club-page-admin"] as const;

/** Partner-only portal URLs (includes `/supplier-page` — not `/partner-*`). */
export const PARTNER_ONLY_PORTAL_PATHS = [
  PARTNER_PORTAL_ROUTES.marketplace,
  PARTNER_PORTAL_ROUTES.messages,
  PARTNER_PORTAL_ROUTES.tasks,
  PARTNER_PORTAL_ROUTES.reports,
  PARTNER_PORTAL_ROUTES.ai4t,
  PARTNER_PORTAL_ROUTES.supplier_page,
  "/partnermarketplace",
] as const;

/** Club-side marketplace (procurement — find providers). */
export const CLUB_MARKETPLACE_ROUTE = MODULE_ROUTES.marketplace;

export function isClubOnlyPortalPath(pathname: string): boolean {
  return (CLUB_ONLY_PORTAL_PATHS as readonly string[]).includes(pathname);
}

export function isPartnerOnlyPortalPath(pathname: string): boolean {
  const normalized = normalizePartnerPortalPath(pathname);
  return (PARTNER_ONLY_PORTAL_PATHS as readonly string[]).includes(normalized);
}

export function isPartnerPortalPath(pathname: string): boolean {
  const normalized = normalizePartnerPortalPath(pathname);
  if (normalized === PARTNER_PORTAL_ROUTES.supplier_page) return true;
  if (normalized === "/partnermarketplace") return true;
  return normalized.startsWith("/partner-");
}

export function normalizePartnerPortalPath(pathname: string): string {
  if (pathname === "/partnermarketplace") return PARTNER_PORTAL_ROUTES.marketplace;
  return pathname;
}

/**
 * Persona slug implied by the current portal URL.
 * Stops dual-role users ping-ponging between club and supplier public-page admins.
 */
export function portalPathImpliedPersonaSlug(
  pathname: string,
  storedPersona?: string | null,
): string | null {
  const normalized = normalizePartnerPortalPath(pathname);

  if (isClubOnlyPortalPath(normalized)) {
    return "club_admin";
  }

  if (normalized === PARTNER_PORTAL_ROUTES.supplier_page) {
    const stored = storedPersona ? normalizeDashboardRole(storedPersona) : null;
    if (stored && isExternalRole(stored)) return stored;
    return "supplier";
  }

  return null;
}

/**
 * Resolve sidebar/dashboard link for a module based on active persona gate role.
 */
export function resolveModuleRoute(
  module: DashboardModule,
  gateRole: DashboardRole | string | null | undefined,
  personaSlug: string,
): string {
  if (module === "dashboard") {
    return `${MODULE_ROUTES.dashboard}/${personaSlug}`;
  }

  const normalized = typeof gateRole === "string" ? normalizeDashboardRole(gateRole) : gateRole;
  if (normalized && isExternalRole(normalized) && PARTNER_ROUTED_MODULES.includes(module)) {
    return PARTNER_PORTAL_ROUTES[module as keyof typeof PARTNER_PORTAL_ROUTES];
  }

  return MODULE_ROUTES[module];
}

/** Default landing when an external persona is denied a club-only route. */
export function defaultPartnerPortalPath(
  gateRole: DashboardRole | string | null | undefined,
  personaSlug: string,
): string {
  const normalized = typeof gateRole === "string" ? normalizeDashboardRole(gateRole) : gateRole;
  if (normalized && isExternalRole(normalized)) {
    return PARTNER_PORTAL_ROUTES.marketplace;
  }
  return `${MODULE_ROUTES.dashboard}/${personaSlug}`;
}
