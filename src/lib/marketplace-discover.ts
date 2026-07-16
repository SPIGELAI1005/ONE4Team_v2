import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";

export type MarketplaceServiceAreaFilter = "all" | "remote" | "local" | "hybrid";
export type MarketplaceReferencesFilter = "all" | "with_references";

export interface MarketplaceDiscoverFilters {
  q: string;
  category: string;
  type: string;
  location: string;
  verifiedOnly: boolean;
  savedOnly: boolean;
  serviceArea: MarketplaceServiceAreaFilter;
  referencesFilter: MarketplaceReferencesFilter;
}

export const DEFAULT_MARKETPLACE_DISCOVER_FILTERS: MarketplaceDiscoverFilters = {
  q: "",
  category: "all",
  type: "all",
  location: "",
  verifiedOnly: false,
  savedOnly: false,
  serviceArea: "all",
  referencesFilter: "all",
};

function matchesSearch(provider: MarketplaceProviderProfileRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    provider.provider_name,
    provider.short_description ?? "",
    provider.detailed_description ?? "",
    provider.location ?? "",
    ...provider.categories,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function matchesServiceArea(
  provider: MarketplaceProviderProfileRow,
  serviceArea: MarketplaceServiceAreaFilter,
): boolean {
  if (serviceArea === "all") return true;
  if (!provider.availability_mode) {
    return serviceArea === "local" && provider.service_area_km != null;
  }
  if (serviceArea === "remote") return provider.availability_mode === "remote";
  if (serviceArea === "local") {
    return provider.availability_mode === "local" || provider.availability_mode === "hybrid";
  }
  return provider.availability_mode === "hybrid";
}

/** Client-side discover filters over already-scoped marketplace provider rows. */
export function filterMarketplaceProviders(
  providers: MarketplaceProviderProfileRow[],
  savedProviderIds: ReadonlySet<string>,
  filters: MarketplaceDiscoverFilters,
): MarketplaceProviderProfileRow[] {
  return providers.filter((provider) => {
    if (filters.savedOnly && !savedProviderIds.has(provider.id)) return false;
    if (filters.type !== "all" && provider.provider_type !== filters.type) return false;
    if (filters.category !== "all" && !provider.categories.includes(filters.category)) return false;
    if (filters.verifiedOnly && provider.verification_status !== "verified") return false;
    if (filters.location.trim()) {
      const loc = (provider.location ?? "").toLowerCase();
      if (!loc.includes(filters.location.trim().toLowerCase())) return false;
    }
    if (!matchesServiceArea(provider, filters.serviceArea)) return false;
    if (filters.referencesFilter === "with_references" && provider.references.length === 0) {
      return false;
    }
    return matchesSearch(provider, filters.q);
  });
}

export function hasActiveDiscoverFilters(filters: MarketplaceDiscoverFilters): boolean {
  return (
    Boolean(filters.q.trim()) ||
    filters.category !== "all" ||
    filters.type !== "all" ||
    Boolean(filters.location.trim()) ||
    filters.verifiedOnly ||
    filters.savedOnly ||
    filters.serviceArea !== "all" ||
    filters.referencesFilter !== "all"
  );
}

export function sortMarketplaceProvidersFeaturedFirst(
  providers: MarketplaceProviderProfileRow[],
): MarketplaceProviderProfileRow[] {
  return [...providers].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.verification_status === "verified" && b.verification_status !== "verified") return -1;
    if (b.verification_status === "verified" && a.verification_status !== "verified") return 1;
    return a.provider_name.localeCompare(b.provider_name);
  });
}
