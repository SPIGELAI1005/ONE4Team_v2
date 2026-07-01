import type {
  MarketplaceOfferRow,
  MarketplaceOfferStatus,
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";

export interface MarketplaceOfferAttachment {
  name: string;
  url: string;
}

export interface OfferWithContext {
  offer: MarketplaceOfferRow;
  request: MarketplaceRequestRow | null;
  provider: MarketplaceProviderProfileRow | null;
}

export interface OffersGroupedByRequest {
  request: MarketplaceRequestRow;
  offers: OfferWithContext[];
}

export function parseOfferAttachments(raw: unknown): MarketplaceOfferAttachment[] {
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
    .filter((item): item is MarketplaceOfferAttachment => item != null);
}

export function attachmentsPayload(urls: string[] | undefined) {
  return (urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ name: url.split("/").pop() ?? "Attachment", url }));
}

export function parseIncludedServices(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatOfferPrice(offer: Pick<MarketplaceOfferRow, "price_indication" | "currency">): string {
  if (!offer.price_indication?.trim()) return "-";
  const currency = offer.currency?.trim() || "EUR";
  const price = offer.price_indication.trim();
  if (/^[€$£]|eur|usd|gbp|chf/i.test(price)) return price;
  return `${currency} ${price}`;
}

export function enrichOffers(
  offers: MarketplaceOfferRow[],
  requests: MarketplaceRequestRow[],
  providers: MarketplaceProviderProfileRow[],
): OfferWithContext[] {
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const providerById = new Map(providers.map((p) => [p.id, p]));
  return offers.map((offer) => ({
    offer,
    request: requestById.get(offer.request_id) ?? null,
    provider: providerById.get(offer.provider_profile_id) ?? null,
  }));
}

export function groupOffersByRequest(
  offers: OfferWithContext[],
  requests: MarketplaceRequestRow[],
): OffersGroupedByRequest[] {
  const byRequest = new Map<string, OfferWithContext[]>();
  for (const row of offers) {
    const list = byRequest.get(row.offer.request_id) ?? [];
    list.push(row);
    byRequest.set(row.offer.request_id, list);
  }

  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return sortedRequests
    .filter((request) => byRequest.has(request.id))
    .map((request) => ({
      request,
      offers: (byRequest.get(request.id) ?? []).sort(
        (a, b) => new Date(b.offer.created_at).getTime() - new Date(a.offer.created_at).getTime(),
      ),
    }));
}

export function filterOffersByStatus(
  offers: OfferWithContext[],
  status: MarketplaceOfferStatus | "all",
): OfferWithContext[] {
  if (status === "all") return offers;
  return offers.filter((row) => row.offer.status === status);
}

export function providerReferenceCount(provider: MarketplaceProviderProfileRow | null): number {
  return provider?.references?.length ?? 0;
}
