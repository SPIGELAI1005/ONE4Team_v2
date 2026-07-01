import { describe, expect, it } from "vitest";
import type { MarketplaceOfferRow, MarketplaceRequestRow } from "@/lib/marketplace-models";
import {
  engagementCategoryForProviderType,
  engagementDescription,
  engagementTitle,
  partnersBridgeProvenanceFromOffer,
} from "@/lib/marketplace-partners-bridge";

function makeOffer(overrides: Partial<MarketplaceOfferRow> = {}): MarketplaceOfferRow {
  return {
    id: "offer-1",
    request_id: "req-1",
    provider_profile_id: "prov-1",
    provider_role: "supplier",
    title: "Kit package",
    description: "Full home kit",
    price_indication: "2500",
    currency: "EUR",
    delivery_timeline: "3 weeks",
    included_services: ["Printing"],
    attachments: [],
    notes: "Rush available",
    status: "accepted",
    accepted_at: null,
    accepted_by: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<MarketplaceRequestRow> = {}): MarketplaceRequestRow {
  return {
    id: "req-1",
    club_id: "club-1",
    created_by: "admin-1",
    title: "U17 jerseys",
    category: "teamwear_jerseys",
    provider_type_wanted: "supplier",
    description: null,
    quantity: null,
    visibility: "marketplace",
    budget_min: null,
    budget_max: null,
    deadline: null,
    location: null,
    attachments: [],
    status: "accepted",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("marketplace-partners-bridge", () => {
  it("maps provider types to engagement categories", () => {
    expect(engagementCategoryForProviderType("sponsor")).toBe("sponsorship");
    expect(engagementCategoryForProviderType("supplier")).toBe("supply_delivery");
    expect(engagementCategoryForProviderType("service_provider")).toBe("service");
    expect(engagementCategoryForProviderType("consultant")).toBe("service");
  });

  it("builds role-specific engagement titles", () => {
    expect(engagementTitle("sponsor", "Main sponsor")).toBe("Sponsorship: Main sponsor");
    expect(engagementTitle("supplier", "U17 jerseys")).toBe("Supplier order: U17 jerseys");
    expect(engagementTitle("service_provider", "Photo day")).toBe("Service job: Photo day");
    expect(engagementTitle("consultant", "Governance review")).toBe("Consulting project: Governance review");
  });

  it("builds engagement description with offer and request provenance", () => {
    const text = engagementDescription(makeOffer(), makeRequest());
    expect(text).toContain("Full home kit");
    expect(text).toContain("EUR 2500");
    expect(text).toContain("3 weeks");
    expect(text).toContain('Marketplace request "U17 jerseys"');
    expect(text).toContain("offer-1");
  });

  it("stamps partners with marketplace provenance", () => {
    expect(partnersBridgeProvenanceFromOffer(makeOffer(), makeRequest())).toEqual({
      marketplace_source: true,
      marketplace_offer_id: "offer-1",
      marketplace_request_id: "req-1",
    });
  });
});
