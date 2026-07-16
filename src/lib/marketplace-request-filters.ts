import type {
  MarketplaceOfferRow,
  MarketplaceProviderType,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";

/** Client-side relevance filter (RLS is authoritative; this improves UX). */
export function isRequestRelevantForProvider(
  request: MarketplaceRequestRow,
  providerType: MarketplaceProviderType,
  providerCategories: readonly string[],
): boolean {
  if (request.status !== "open" && request.status !== "offers_received") return false;
  if (request.visibility === "private") return false;

  if (request.provider_type_wanted && request.provider_type_wanted !== providerType) {
    return false;
  }

  if (providerCategories.length > 0 && !providerCategories.includes(request.category)) {
    return false;
  }

  return true;
}

export interface ProviderRequestFilterOptions {
  category?: string;
  location?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  status?: string;
  noOfferYet?: boolean;
  offeredRequestIds?: ReadonlySet<string>;
}

function locationMatches(requestLocation: string | null, filter: string): boolean {
  if (!filter.trim()) return true;
  if (!requestLocation) return false;
  return requestLocation.toLowerCase().includes(filter.trim().toLowerCase());
}

function budgetOverlaps(
  request: MarketplaceRequestRow,
  budgetMin?: number | null,
  budgetMax?: number | null,
): boolean {
  const hasMin = budgetMin != null && Number.isFinite(budgetMin);
  const hasMax = budgetMax != null && Number.isFinite(budgetMax);
  if (!hasMin && !hasMax) return true;

  const reqMin = request.budget_min;
  const reqMax = request.budget_max;
  if (reqMin == null && reqMax == null) return true;

  const effectiveMin = reqMin ?? 0;
  const effectiveMax = reqMax ?? Number.POSITIVE_INFINITY;
  const filterMin = hasMin ? (budgetMin as number) : 0;
  const filterMax = hasMax ? (budgetMax as number) : Number.POSITIVE_INFINITY;
  return effectiveMin <= filterMax && effectiveMax >= filterMin;
}

export function filterRequestsForProvider(
  requests: MarketplaceRequestRow[],
  providerType: MarketplaceProviderType,
  providerCategories: readonly string[],
  options?: ProviderRequestFilterOptions,
): MarketplaceRequestRow[] {
  const offered = options?.offeredRequestIds ?? new Set<string>();
  return requests.filter((request) => {
    if (!isRequestRelevantForProvider(request, providerType, providerCategories)) return false;
    if (options?.category && options.category !== "all" && request.category !== options.category) {
      return false;
    }
    if (options?.location && !locationMatches(request.location, options.location)) return false;
    if (!budgetOverlaps(request, options?.budgetMin, options?.budgetMax)) return false;
    if (options?.status && options.status !== "all" && request.status !== options.status) return false;
    if (options?.noOfferYet && offered.has(request.id)) return false;
    return true;
  });
}

export function offerCountForRequest(
  requestId: string,
  offers: { request_id: string }[],
): number {
  return offers.filter((o) => o.request_id === requestId).length;
}

export interface ProviderRequestInboxKpis {
  openMatching: number;
  offered: number;
  won: number;
}

export function computeProviderRequestInboxKpis(
  matchingRequests: MarketplaceRequestRow[],
  myOffers: Pick<MarketplaceOfferRow, "request_id" | "status">[],
): ProviderRequestInboxKpis {
  const offeredIds = new Set(myOffers.map((o) => o.request_id));
  const wonIds = new Set(myOffers.filter((o) => o.status === "accepted").map((o) => o.request_id));
  return {
    openMatching: matchingRequests.length,
    offered: matchingRequests.filter((r) => offeredIds.has(r.id)).length,
    won: matchingRequests.filter((r) => wonIds.has(r.id)).length,
  };
}

export function parseProviderRequestFiltersFromSearch(search: string): ProviderRequestFilterOptions & {
  category: string;
  location: string;
  status: string;
  noOfferYet: boolean;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const budgetMinRaw = params.get("budgetMin");
  const budgetMaxRaw = params.get("budgetMax");
  return {
    category: params.get("category") || "all",
    location: params.get("location") || "",
    status: params.get("reqStatus") || "all",
    noOfferYet: params.get("noOffer") === "1",
    budgetMin: budgetMinRaw != null && budgetMinRaw !== "" ? Number(budgetMinRaw) : null,
    budgetMax: budgetMaxRaw != null && budgetMaxRaw !== "" ? Number(budgetMaxRaw) : null,
  };
}

export function providerRequestFiltersToSearchParams(
  filters: ProviderRequestFilterOptions & { category?: string; location?: string; status?: string },
  base?: URLSearchParams,
): URLSearchParams {
  const params = base ? new URLSearchParams(base) : new URLSearchParams();
  params.set("view", "requests");
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  else params.delete("category");
  if (filters.location?.trim()) params.set("location", filters.location.trim());
  else params.delete("location");
  if (filters.status && filters.status !== "all") params.set("reqStatus", filters.status);
  else params.delete("reqStatus");
  if (filters.noOfferYet) params.set("noOffer", "1");
  else params.delete("noOffer");
  if (filters.budgetMin != null && Number.isFinite(filters.budgetMin)) {
    params.set("budgetMin", String(filters.budgetMin));
  } else params.delete("budgetMin");
  if (filters.budgetMax != null && Number.isFinite(filters.budgetMax)) {
    params.set("budgetMax", String(filters.budgetMax));
  } else params.delete("budgetMax");
  return params;
}

export interface MarketplaceRequestAttachment {
  name: string;
  url: string;
}

export function parseRequestAttachments(raw: unknown): MarketplaceRequestAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!url) return null;
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : url;
      return { name, url };
    })
    .filter((item): item is MarketplaceRequestAttachment => item != null);
}
