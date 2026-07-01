import { describe, expect, it } from "vitest";
import type { MarketplaceOfferRow, MarketplaceRequestRow } from "@/lib/marketplace-models";
import {
  enrichOffers,
  filterOffersByStatus,
  formatOfferPrice,
  groupOffersByRequest,
  parseIncludedServices,
} from "@/lib/marketplace-offer-utils";

function makeOffer(overrides: Partial<MarketplaceOfferRow> = {}): MarketplaceOfferRow {
  return {
    id: "offer-1",
    request_id: "req-1",
    provider_profile_id: "prov-1",
    provider_role: "supplier",
    title: "Test offer",
    description: null,
    price_indication: "1500",
    currency: "EUR",
    delivery_timeline: "2 weeks",
    included_services: ["Delivery"],
    attachments: [],
    notes: null,
    status: "sent",
    accepted_at: null,
    accepted_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<MarketplaceRequestRow> = {}): MarketplaceRequestRow {
  return {
    id: "req-1",
    club_id: "club-1",
    created_by: "user-1",
    title: "Jerseys",
    category: "teamwear_jerseys",
    provider_type_wanted: null,
    description: null,
    quantity: null,
    visibility: "marketplace",
    budget_min: null,
    budget_max: null,
    deadline: null,
    location: null,
    attachments: [],
    status: "offers_received",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("formatOfferPrice", () => {
  it("formats currency and price", () => {
    expect(formatOfferPrice(makeOffer())).toBe("EUR 1500");
  });
});

describe("parseIncludedServices", () => {
  it("splits by comma and newline", () => {
    expect(parseIncludedServices("Delivery\nSetup, Training")).toEqual([
      "Delivery",
      "Setup",
      "Training",
    ]);
  });
});

describe("filterOffersByStatus", () => {
  it("filters by status", () => {
    const rows = enrichOffers(
      [makeOffer({ status: "sent" }), makeOffer({ id: "offer-2", status: "rejected" })],
      [makeRequest()],
      [],
    );
    expect(filterOffersByStatus(rows, "sent")).toHaveLength(1);
  });
});

describe("groupOffersByRequest", () => {
  it("groups offers under their request", () => {
    const requests = [makeRequest(), makeRequest({ id: "req-2", title: "Photos" })];
    const rows = enrichOffers(
      [
        makeOffer(),
        makeOffer({ id: "offer-2", request_id: "req-2" }),
      ],
      requests,
      [],
    );
    const grouped = groupOffersByRequest(rows, requests);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.offers).toHaveLength(1);
  });
});
