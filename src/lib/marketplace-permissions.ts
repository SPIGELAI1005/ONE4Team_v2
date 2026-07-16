/**
 * Fine-grained marketplace permissions - extends `rbac-config` module access.
 *
 * Module-level `marketplace` (`full` | `own` | `none`) controls menu + route entry.
 * These permissions gate tabs and actions inside `/marketplace`.
 */

import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  canAccessModule,
  isExternalRole,
  resolveDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";

/** Canonical marketplace permission identifiers (also used in `Permission` union). */
export const MARKETPLACE_PERMISSIONS = [
  "marketplace:view",
  "marketplace:discover",
  "marketplace:manage_own_listing",
  "marketplace:create_request",
  "marketplace:respond_to_request",
  "marketplace:review_offers",
  "marketplace:accept_offer",
  "marketplace:moderate",
] as const;

export type MarketplacePermission = (typeof MARKETPLACE_PERMISSIONS)[number];

/** Snake_case aliases for docs and external references. */
export const MARKETPLACE_PERMISSION_ALIASES: Record<string, MarketplacePermission> = {
  marketplace_view: "marketplace:view",
  marketplace_discover: "marketplace:discover",
  marketplace_manage_own_listing: "marketplace:manage_own_listing",
  marketplace_create_request: "marketplace:create_request",
  marketplace_respond_to_request: "marketplace:respond_to_request",
  marketplace_review_offers: "marketplace:review_offers",
  marketplace_accept_offer: "marketplace:accept_offer",
  marketplace_moderate: "marketplace:moderate",
};

const CLUB_SIDE_PERMISSIONS: readonly MarketplacePermission[] = [
  "marketplace:view",
  "marketplace:discover",
  "marketplace:create_request",
  "marketplace:review_offers",
  "marketplace:accept_offer",
];

const PROVIDER_SIDE_PERMISSIONS: readonly MarketplacePermission[] = [
  "marketplace:view",
  "marketplace:discover",
  "marketplace:manage_own_listing",
  "marketplace:respond_to_request",
];

const ALL_MARKETPLACE_PERMISSIONS: readonly MarketplacePermission[] = MARKETPLACE_PERMISSIONS;

function permissionsForResolvedRole(role: DashboardRole): MarketplacePermission[] {
  if (role === "admin") return [...ALL_MARKETPLACE_PERMISSIONS];

  if (role === "club_admin") {
    return [...CLUB_SIDE_PERMISSIONS, "marketplace:moderate"];
  }

  if (isExternalRole(role)) return [...PROVIDER_SIDE_PERMISSIONS];

  return [];
}

/**
 * Effective marketplace permissions for a membership + optional scoped assignments.
 * Unknown or disallowed roles receive an empty set.
 */
export function marketplacePermissionsFor(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): MarketplacePermission[] {
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!role || !canAccessModule(role, "marketplace")) return [];
  return permissionsForResolvedRole(role);
}

export function hasMarketplacePermission(
  legacyRole: string | null | undefined,
  permission: MarketplacePermission,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  return marketplacePermissionsFor(legacyRole, assignments).includes(permission);
}

export function hasMarketplacePermissionInSet(
  perms: readonly string[],
  permission: MarketplacePermission,
): boolean {
  return perms.includes(permission);
}
