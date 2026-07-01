import type {
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

export function filterRequestsForProvider(
  requests: MarketplaceRequestRow[],
  providerType: MarketplaceProviderType,
  providerCategories: readonly string[],
  options?: { category?: string },
): MarketplaceRequestRow[] {
  return requests.filter((request) => {
    if (!isRequestRelevantForProvider(request, providerType, providerCategories)) return false;
    if (options?.category && options.category !== "all" && request.category !== options.category) {
      return false;
    }
    return true;
  });
}

export function offerCountForRequest(
  requestId: string,
  offers: { request_id: string }[],
): number {
  return offers.filter((o) => o.request_id === requestId).length;
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
