/**
 * Pure marketplace access rules — mirrors Supabase RLS and product policy.
 * Used for UI guards and regression tests (no network).
 */

import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import { isRequestRelevantForProvider } from "@/lib/marketplace-request-filters";
import type {
  MarketplaceOfferRow,
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
  MarketplaceServicePackage,
} from "@/lib/marketplace-models";
import { hasMarketplacePermission } from "@/lib/marketplace-permissions";
import { canAccessModule, resolveDashboardRole } from "@/lib/rbac-config";
import { marketplacePageExperience } from "@/lib/marketplace-access";

export interface MarketplaceAccessContext {
  userId: string;
  isPlatformAdmin?: boolean;
  /** Return true when the user is a club admin for the given club id. */
  isClubAdminForClub?: (clubId: string) => boolean;
}

export function isProviderProfileOwner(
  userId: string,
  profile: Pick<MarketplaceProviderProfileRow, "owner_user_id">,
): boolean {
  return profile.owner_user_id === userId;
}

/** Active listings visible in club discover (not private visibility). */
export function isMarketplaceListingDiscoverable(
  profile: Pick<MarketplaceProviderProfileRow, "listing_status" | "visibility">,
): boolean {
  return (
    profile.listing_status === "active" &&
    (profile.visibility === "public" || profile.visibility === "marketplace_only")
  );
}

/** Listing exposed on public club/microsite surfaces when visibility is public. */
export function isMarketplaceListingPublicOnWeb(
  profile: Pick<MarketplaceProviderProfileRow, "listing_status" | "visibility">,
): boolean {
  return profile.listing_status === "active" && profile.visibility === "public";
}

export function isMarketplaceListingHiddenFromDiscovery(
  profile: Pick<MarketplaceProviderProfileRow, "listing_status" | "visibility">,
): boolean {
  return !isMarketplaceListingDiscoverable(profile);
}

export function canViewProviderProfile(
  ctx: MarketplaceAccessContext,
  profile: MarketplaceProviderProfileRow,
): boolean {
  if (ctx.isPlatformAdmin) return true;
  if (isProviderProfileOwner(ctx.userId, profile)) return true;
  return isMarketplaceListingDiscoverable(profile);
}

export function canManageProviderProfile(
  ctx: MarketplaceAccessContext,
  profile: Pick<MarketplaceProviderProfileRow, "owner_user_id">,
): boolean {
  return isProviderProfileOwner(ctx.userId, profile);
}

export function providerHasActiveListing(
  profile: Pick<MarketplaceProviderProfileRow, "listing_status"> | null | undefined,
): boolean {
  return profile?.listing_status === "active";
}

/** Mirrors `marketplace_requests_select` for non-admin providers. */
export function canProviderViewMarketplaceRequest(
  ctx: MarketplaceAccessContext,
  request: MarketplaceRequestRow,
  providerProfile: MarketplaceProviderProfileRow | null,
): boolean {
  if (ctx.isClubAdminForClub?.(request.club_id)) return true;
  if (!providerProfile || !isProviderProfileOwner(ctx.userId, providerProfile)) return false;
  if (!providerHasActiveListing(providerProfile)) return false;
  if (request.status !== "open" && request.status !== "offers_received") return false;
  if (request.visibility !== "marketplace") return false;
  return isRequestRelevantForProvider(
    request,
    providerProfile.provider_type,
    providerProfile.categories,
  );
}

/** Mirrors `marketplace_offers_select` — owner provider or club admin for the request's club. */
export function canViewMarketplaceOffer(
  ctx: MarketplaceAccessContext,
  offer: MarketplaceOfferRow,
  providerProfile: MarketplaceProviderProfileRow,
  request: MarketplaceRequestRow,
): boolean {
  if (
    offer.provider_profile_id === providerProfile.id &&
    isProviderProfileOwner(ctx.userId, providerProfile)
  ) {
    return true;
  }
  return Boolean(ctx.isClubAdminForClub?.(request.club_id));
}

/** Provider sees only their own offers (competing offers on same request are hidden). */
export function filterOffersVisibleToProvider(
  offers: MarketplaceOfferRow[],
  providerProfileId: string,
): MarketplaceOfferRow[] {
  return offers.filter((offer) => offer.provider_profile_id === providerProfileId);
}

/** Club admins see offers only for their club's requests. */
export function filterOffersVisibleToClub(
  offers: MarketplaceOfferRow[],
  clubRequestIds: ReadonlySet<string>,
): MarketplaceOfferRow[] {
  return offers.filter((offer) => clubRequestIds.has(offer.request_id));
}

/** Document URLs are only exposed when the listing itself is discoverable. */
export function getPublicListingDocumentPackages(
  profile: MarketplaceProviderProfileRow,
): MarketplaceServicePackage[] {
  if (!isMarketplaceListingDiscoverable(profile)) return [];
  return profile.packages.filter((pkg) => pkg.kind === "document" && Boolean(pkg.url?.trim()));
}

export function showsMarketplaceInSidebar(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!canAccessModule(role, "marketplace")) return false;
  return hasMarketplacePermission(legacyRole, "marketplace:view", assignments);
}

/** Route `/marketplace` — module gate + marketplace experience (used by RequireModule + page). */
export function canAccessMarketplaceRoute(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): boolean {
  const role = resolveDashboardRole(legacyRole, assignments);
  if (!canAccessModule(role, "marketplace")) return false;
  return marketplacePageExperience(legacyRole, assignments) !== "denied";
}
