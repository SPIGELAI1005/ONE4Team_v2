import { describe, expect, it } from "vitest";
import {
  buildClubProviderRelationshipMap,
  relationshipStatusForProvider,
} from "@/lib/marketplace-club-relationship";
import type { MarketplaceOfferRow } from "@/lib/marketplace-models";

function offer(overrides: Partial<MarketplaceOfferRow> = {}): MarketplaceOfferRow {
  return {
    id: "offer-1",
    request_id: "req-1",
    provider_profile_id: "prov-1",
    provider_role: "supplier",
    title: "Offer",
    description: null,
    price_indication: null,
    currency: "EUR",
    delivery_timeline: null,
    included_services: [],
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

describe("relationshipStatusForProvider", () => {
  it("returns saved when only bookmarked", () => {
    expect(
      relationshipStatusForProvider("prov-1", {
        savedProviderIds: new Set(["prov-1"]),
        offers: [],
        providerPartnerIds: new Map([["prov-1", null]]),
        partnerTasks: [],
      }),
    ).toBe("saved");
  });

  it("returns offer_sent for pending offers", () => {
    expect(
      relationshipStatusForProvider("prov-1", {
        savedProviderIds: new Set(),
        offers: [offer({ status: "viewed" })],
        providerPartnerIds: new Map([["prov-1", null]]),
        partnerTasks: [],
      }),
    ).toBe("offer_sent");
  });

  it("returns active_partner for accepted offers", () => {
    expect(
      relationshipStatusForProvider("prov-1", {
        savedProviderIds: new Set(),
        offers: [offer({ status: "accepted" })],
        providerPartnerIds: new Map([["prov-1", "partner-1"]]),
        partnerTasks: [
          {
            partner_id: "partner-1",
            marketplace_offer_id: "offer-1",
            marketplace_request_id: "req-1",
            task_status: "open",
          },
        ],
      }),
    ).toBe("active_partner");
  });
});

describe("buildClubProviderRelationshipMap", () => {
  it("maps multiple providers", () => {
    const map = buildClubProviderRelationshipMap(["a", "b"], {
      savedProviderIds: new Set(["b"]),
      offers: [],
      providerPartnerIds: new Map([
        ["a", null],
        ["b", null],
      ]),
      partnerTasks: [],
    });
    expect(map.get("b")).toBe("saved");
    expect(map.get("a")).toBe("none");
  });
});
