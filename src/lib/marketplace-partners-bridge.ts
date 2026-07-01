import type {
  MarketplaceOfferRow,
  MarketplaceProviderType,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import type { EngagementCategory } from "@/lib/partner-workflow-models";

export function engagementCategoryForProviderType(
  providerType: MarketplaceProviderType,
): EngagementCategory {
  switch (providerType) {
    case "sponsor":
      return "sponsorship";
    case "supplier":
      return "supply_delivery";
    case "service_provider":
      return "service";
    case "consultant":
      return "service";
    default:
      return "other";
  }
}

export function engagementTitle(
  providerType: MarketplaceProviderType,
  requestTitle: string,
): string {
  switch (providerType) {
    case "sponsor":
      return `Sponsorship: ${requestTitle}`;
    case "supplier":
      return `Supplier order: ${requestTitle}`;
    case "service_provider":
      return `Service job: ${requestTitle}`;
    case "consultant":
      return `Consulting project: ${requestTitle}`;
    default:
      return requestTitle;
  }
}

export function engagementDescription(
  offer: MarketplaceOfferRow,
  request: MarketplaceRequestRow,
): string {
  const parts = [
    offer.description?.trim(),
    offer.price_indication ? `Price: ${offer.currency ?? "EUR"} ${offer.price_indication}` : null,
    offer.delivery_timeline ? `Timeline: ${offer.delivery_timeline}` : null,
    offer.included_services?.length ? `Included: ${offer.included_services.join(", ")}` : null,
    offer.notes?.trim(),
    `Source: Marketplace request "${request.title}" (offer ${offer.id}).`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

export interface PartnersBridgeProvenance {
  marketplace_source: boolean;
  marketplace_offer_id: string;
  marketplace_request_id: string;
}

export function partnersBridgeProvenanceFromOffer(
  offer: Pick<MarketplaceOfferRow, "id">,
  request: Pick<MarketplaceRequestRow, "id">,
): PartnersBridgeProvenance {
  return {
    marketplace_source: true,
    marketplace_offer_id: offer.id,
    marketplace_request_id: request.id,
  };
}
