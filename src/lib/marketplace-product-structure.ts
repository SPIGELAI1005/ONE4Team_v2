/**
 * Marketplace product structure — tab profiles and role-aware labels.
 * Single source for `/marketplace` information architecture (not Partners CRM).
 */

import type { MarketplaceProviderType } from "@/lib/marketplace-models";

/** Club admin marketplace tabs (`?view=` on `/marketplace`). */
export const CLUB_MARKETPLACE_TAB_ORDER = [
  "overview",
  "discover",
  "requests",
  "offers",
  "providers",
  "reviews",
  "moderation",
] as const;

export type ClubMarketplaceTab = (typeof CLUB_MARKETPLACE_TAB_ORDER)[number];

/** External provider portal tabs — same structure for all provider types. */
export const PROVIDER_PORTAL_TAB_ORDER = [
  "overview",
  "listing",
  "services",
  "requests",
  "offers",
  "reviews",
  "settings",
] as const;

export type ProviderPortalTab = (typeof PROVIDER_PORTAL_TAB_ORDER)[number];

/** Map legacy `?view=` values to current club tabs. */
export const CLUB_MARKETPLACE_VIEW_ALIASES: Record<string, ClubMarketplaceTab> = {
  documents: "reviews",
  payments: "overview",
};

/** Map legacy provider `?view=` values to current portal tabs. */
export const PROVIDER_PORTAL_VIEW_ALIASES: Record<string, ProviderPortalTab> = {
  profile: "listing",
  packages: "services",
  placement: "settings",
  jobs: "offers",
  deliverables: "offers",
  documents: "settings",
  payments: "settings",
};

export function normalizeClubMarketplaceView(
  raw: string | null | undefined,
): ClubMarketplaceTab | null {
  if (!raw) return null;
  if ((CLUB_MARKETPLACE_TAB_ORDER as readonly string[]).includes(raw)) {
    return raw as ClubMarketplaceTab;
  }
  return CLUB_MARKETPLACE_VIEW_ALIASES[raw] ?? null;
}

export function normalizeProviderPortalView(
  raw: string | null | undefined,
): ProviderPortalTab | null {
  if (!raw) return null;
  if ((PROVIDER_PORTAL_TAB_ORDER as readonly string[]).includes(raw)) {
    return raw as ProviderPortalTab;
  }
  return PROVIDER_PORTAL_VIEW_ALIASES[raw] ?? null;
}

export interface MarketplaceTabLabels {
  club: Record<ClubMarketplaceTab, string>;
  provider: {
    common: Record<ProviderPortalTab, string>;
    listingByType: Record<MarketplaceProviderType, string>;
    servicesByType: Record<MarketplaceProviderType, string>;
  };
}

export function clubMarketplaceTabLabel(
  tab: ClubMarketplaceTab,
  labels: MarketplaceTabLabels,
): string {
  return labels.club[tab];
}

export function providerPortalTabLabel(
  tab: ProviderPortalTab,
  providerType: MarketplaceProviderType | null,
  labels: MarketplaceTabLabels,
): string {
  if (tab === "listing" && providerType) {
    return labels.provider.listingByType[providerType];
  }
  if (tab === "services" && providerType) {
    return labels.provider.servicesByType[providerType];
  }
  return labels.provider.common[tab];
}
