/**
 * Marketplace & provider portal access - extends central RBAC (`rbac-config.ts`).
 *
 * Public club listings (`/club/:slug`) remain separate from dashboard marketplace access.
 */

import {
  canAccessModule,
  isExternalRole,
  normalizeDashboardRole,
  resolveDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";
import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  CLUB_MARKETPLACE_TAB_ORDER,
  PROVIDER_PORTAL_TAB_ORDER,
  type ClubMarketplaceTab,
  type ProviderPortalTab,
} from "@/lib/marketplace-product-structure";
import { providerTypeFromDashboardRole } from "@/lib/marketplace-models";
import {
  hasMarketplacePermission,
  type MarketplacePermission,
} from "@/lib/marketplace-permissions";

export type { ClubMarketplaceTab, ProviderPortalTab } from "@/lib/marketplace-product-structure";
export type { MarketplacePermission } from "@/lib/marketplace-permissions";

export function canAccessMarketplaceModule(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  return hasMarketplacePermission(legacyRole, "marketplace:view", assignments);
}

export function canAccessPartnersModule(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  const role = resolveDashboardRole(legacyRole, assignments);
  return canAccessModule(role, "partners");
}

export function canManageClubMarketplace(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!role) return false;
  if (isExternalRole(role)) return false;
  return (
    (role === "club_admin" || role === "admin") &&
    hasMarketplacePermission(legacyRole, "marketplace:view", assignments)
  );
}

export function canModerateMarketplaceListings(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  return hasMarketplacePermission(legacyRole, "marketplace:moderate", assignments);
}

export function canCreateMarketplaceRequest(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  return hasMarketplacePermission(legacyRole, "marketplace:create_request", assignments);
}

export function canAcceptMarketplaceOffer(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  return hasMarketplacePermission(legacyRole, "marketplace:accept_offer", assignments);
}

export function isProviderPortalRole(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  return normalized != null && isExternalRole(normalized);
}

const CLUB_TAB_PERMISSION: Record<ClubMarketplaceTab, MarketplacePermission | null> = {
  overview: "marketplace:view",
  discover: "marketplace:discover",
  providers: "marketplace:discover",
  requests: "marketplace:create_request",
  offers: "marketplace:review_offers",
  reviews: "marketplace:review_offers",
  moderation: "marketplace:moderate",
};

function clubTabRequiresPermission(tab: ClubMarketplaceTab): MarketplacePermission | null {
  return CLUB_TAB_PERMISSION[tab] ?? "marketplace:view";
}

/** Club admin tabs - discovery, requests, offers, saved providers, moderation. */
export function getClubMarketplaceTabs(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): ClubMarketplaceTab[] {
  if (!canManageClubMarketplace(legacyRole, assignments)) return [];
  return CLUB_MARKETPLACE_TAB_ORDER.filter((tab) => {
    const required = clubTabRequiresPermission(tab);
    return required
      ? hasMarketplacePermission(legacyRole, required, assignments)
      : false;
  });
}

/** Unified provider portal tabs for all external provider roles. */
export function getProviderPortalTabs(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): ProviderPortalTab[] {
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!role || !isExternalRole(role)) return [];
  if (!hasMarketplacePermission(legacyRole, "marketplace:view", assignments)) return [];
  if (!providerTypeFromDashboardRole(role)) return [];
  return [...PROVIDER_PORTAL_TAB_ORDER];
}

export function marketplacePageExperience(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): "club_marketplace" | "provider_portal" | "denied" {
  if (!hasMarketplacePermission(legacyRole, "marketplace:view", assignments)) return "denied";
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!role) return "denied";
  if (isExternalRole(role)) return "provider_portal";
  if (canManageClubMarketplace(legacyRole, assignments)) return "club_marketplace";
  return "denied";
}

/** @deprecated Use {@link marketplacePageExperience} */
export const partnersPageExperience = marketplacePageExperience;
