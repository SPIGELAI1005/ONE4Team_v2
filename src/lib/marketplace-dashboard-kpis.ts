import type { MarketplaceOfferRow, MarketplaceProviderProfileRow, MarketplaceRequestRow } from "@/lib/marketplace-models";
import type { PartnerRow } from "@/lib/partner-workflow-models";
import { filterRequestsForProvider } from "@/lib/marketplace-request-filters";
import type { MarketplaceProviderType } from "@/lib/marketplace-models";
import { PARTNER_PORTAL_ROUTES } from "@/lib/partner-portal-routes";

export interface MarketplaceDashboardCardItem {
  id: string;
  label: string;
  value: string | number;
  href: string;
  highlight?: boolean;
  /** Show even when numeric value is 0 */
  alwaysShow?: boolean;
}

export function buildClubMarketplaceDashboardCards(input: {
  requests: MarketplaceRequestRow[];
  offers: MarketplaceOfferRow[];
  savedCount: number;
  pendingApprovals: number;
  partners: PartnerRow[];
  canModerate: boolean;
  labels: {
    openRequests: string;
    offersReceived: string;
    pendingApprovals: string;
    savedProviders: string;
    activePartners: string;
  };
}): MarketplaceDashboardCardItem[] {
  const openRequests = input.requests.filter(
    (r) => r.status === "open" || r.status === "offers_received",
  ).length;
  const offersReceived = input.offers.filter(
    (o) => o.status === "sent" || o.status === "viewed",
  ).length;
  const activePartners = input.partners.filter((p) => p.marketplace_source).length;

  const cards: MarketplaceDashboardCardItem[] = [
    {
      id: "open-requests",
      label: input.labels.openRequests,
      value: openRequests,
      href: "/marketplace?view=requests",
    },
    {
      id: "offers-received",
      label: input.labels.offersReceived,
      value: offersReceived,
      href: "/marketplace?view=offers",
      highlight: offersReceived > 0,
    },
    {
      id: "saved-providers",
      label: input.labels.savedProviders,
      value: input.savedCount,
      href: "/marketplace?view=providers",
    },
    {
      id: "active-partners",
      label: input.labels.activePartners,
      value: activePartners,
      href: "/partners?tab=directory",
    },
  ];

  if (input.canModerate) {
    cards.splice(2, 0, {
      id: "pending-approvals",
      label: input.labels.pendingApprovals,
      value: input.pendingApprovals,
      href: "/marketplace?view=moderation",
      highlight: input.pendingApprovals > 0,
    });
  }

  return cards;
}

export function buildProviderMarketplaceDashboardCards(input: {
  providerType: MarketplaceProviderType;
  profile: MarketplaceProviderProfileRow | null;
  openRequests: MarketplaceRequestRow[];
  myOffers: MarketplaceOfferRow[];
  listingStatusLabel: string;
  labels: {
    listingStatus: string;
    matchingRequests: string;
    offersSent: string;
    active: string;
    reviews: string;
  };
  activeLabel: string;
}): MarketplaceDashboardCardItem[] {
  const matchingCount = input.profile
    ? filterRequestsForProvider(
        input.openRequests,
        input.providerType,
        input.profile.categories,
      ).length
    : 0;

  const offersSent = input.myOffers.filter(
    (o) => o.status === "sent" || o.status === "viewed" || o.status === "draft",
  ).length;

  const activeCount = input.myOffers.filter((o) => o.status === "accepted").length;

  const statusLabel = input.profile
    ? input.listingStatusLabel
    : "—";

  const partnerMarketplace = PARTNER_PORTAL_ROUTES.marketplace;

  return [
    {
      id: "listing-status",
      label: input.labels.listingStatus,
      value: statusLabel,
      href: `${partnerMarketplace}?view=listing`,
      alwaysShow: true,
    },
    {
      id: "matching-requests",
      label: input.labels.matchingRequests,
      value: matchingCount,
      href: `${partnerMarketplace}?view=requests`,
      highlight: matchingCount > 0,
    },
    {
      id: "offers-sent",
      label: input.labels.offersSent,
      value: offersSent,
      href: `${partnerMarketplace}?view=offers`,
    },
    {
      id: "active",
      label: input.activeLabel,
      value: activeCount,
      href: `${partnerMarketplace}?view=offers`,
      highlight: activeCount > 0,
    },
  ];
}

export function filterVisibleMarketplaceDashboardCards(
  cards: MarketplaceDashboardCardItem[],
): MarketplaceDashboardCardItem[] {
  return cards.filter((card) => {
    if (card.alwaysShow) return true;
    if (typeof card.value === "number") return card.value > 0;
    const text = String(card.value).trim();
    return text !== "" && text !== "—" && text !== "0";
  });
}

export function hasMarketplaceDashboardActivity(cards: MarketplaceDashboardCardItem[]): boolean {
  return filterVisibleMarketplaceDashboardCards(cards).length > 0;
}
