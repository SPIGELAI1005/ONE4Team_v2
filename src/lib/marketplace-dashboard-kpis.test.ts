import { describe, expect, it } from "vitest";
import {
  buildClubMarketplaceDashboardCards,
  buildProviderMarketplaceDashboardCards,
  filterVisibleMarketplaceDashboardCards,
  hasMarketplaceDashboardActivity,
} from "@/lib/marketplace-dashboard-kpis";
import type {
  MarketplaceOfferRow,
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import type { PartnerRow } from "@/lib/partner-workflow-models";

const labels = {
  openRequests: "Open requests",
  offersReceived: "Offers received",
  pendingApprovals: "Pending approvals",
  savedProviders: "Saved providers",
  activePartners: "Active partners",
};

function request(status: MarketplaceRequestRow["status"]): MarketplaceRequestRow {
  return { id: "r1", status } as MarketplaceRequestRow;
}

function offer(status: MarketplaceOfferRow["status"]): MarketplaceOfferRow {
  return { id: "o1", status } as MarketplaceOfferRow;
}

function partner(marketplaceSource: boolean): PartnerRow {
  return { id: "p1", marketplace_source: marketplaceSource } as PartnerRow;
}

describe("buildClubMarketplaceDashboardCards", () => {
  it("counts open requests and actionable offers", () => {
    const cards = buildClubMarketplaceDashboardCards({
      requests: [request("open"), request("offers_received"), request("closed")],
      offers: [offer("sent"), offer("viewed"), offer("rejected")],
      savedCount: 2,
      pendingApprovals: 0,
      partners: [partner(true), partner(false)],
      canModerate: false,
      labels,
    });

    expect(cards.find((c) => c.id === "open-requests")?.value).toBe(2);
    expect(cards.find((c) => c.id === "offers-received")?.value).toBe(2);
    expect(cards.find((c) => c.id === "saved-providers")?.value).toBe(2);
    expect(cards.find((c) => c.id === "active-partners")?.value).toBe(1);
    expect(cards.some((c) => c.id === "pending-approvals")).toBe(false);
  });

  it("includes pending approvals when user can moderate", () => {
    const cards = buildClubMarketplaceDashboardCards({
      requests: [],
      offers: [],
      savedCount: 0,
      pendingApprovals: 3,
      partners: [],
      canModerate: true,
      labels,
    });

    const pending = cards.find((c) => c.id === "pending-approvals");
    expect(pending?.value).toBe(3);
    expect(pending?.highlight).toBe(true);
  });
});

describe("buildProviderMarketplaceDashboardCards", () => {
  const profile = {
    id: "prof-1",
    listing_status: "published",
    categories: ["kit"],
  } as MarketplaceProviderProfileRow;

  const providerLabels = {
    listingStatus: "Listing status",
    matchingRequests: "Matching requests",
    offersSent: "Offers sent",
    active: "Active orders",
    reviews: "Reviews",
  };

  it("always includes listing status and counts matching requests", () => {
    const cards = buildProviderMarketplaceDashboardCards({
      providerType: "supplier",
      profile,
      openRequests: [
        {
          id: "r1",
          status: "open",
          category: "kit",
          visibility: "public",
          provider_type_wanted: "supplier",
        } as MarketplaceRequestRow,
        {
          id: "r2",
          status: "open",
          category: "other",
          visibility: "public",
          provider_type_wanted: "supplier",
        } as MarketplaceRequestRow,
      ],
      myOffers: [offer("sent"), offer("accepted")],
      listingStatusLabel: "Published",
      labels: providerLabels,
      activeLabel: "Active orders",
    });

    expect(cards.find((c) => c.id === "listing-status")).toMatchObject({
      value: "Published",
      alwaysShow: true,
    });
    expect(cards.find((c) => c.id === "matching-requests")?.value).toBe(1);
    expect(cards.find((c) => c.id === "offers-sent")?.value).toBe(1);
    expect(cards.find((c) => c.id === "active")?.value).toBe(1);
  });
});

describe("filterVisibleMarketplaceDashboardCards", () => {
  it("hides zero-value numeric cards except alwaysShow", () => {
    const cards = [
      { id: "a", label: "A", value: 0, href: "/" },
      { id: "b", label: "B", value: 2, href: "/" },
      { id: "c", label: "C", value: "—", href: "/", alwaysShow: true },
    ];

    const visible = filterVisibleMarketplaceDashboardCards(cards);
    expect(visible.map((c) => c.id)).toEqual(["b", "c"]);
    expect(hasMarketplaceDashboardActivity(cards)).toBe(true);
  });
});
