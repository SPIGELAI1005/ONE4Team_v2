import { describe, expect, it } from "vitest";
import {
  computeProviderRequestInboxKpis,
  filterRequestsForProvider,
  parseProviderRequestFiltersFromSearch,
  providerRequestFiltersToSearchParams,
} from "@/lib/marketplace-request-filters";
import type { MarketplaceRequestRow } from "@/lib/marketplace-models";

function req(partial: Partial<MarketplaceRequestRow> & Pick<MarketplaceRequestRow, "id">): MarketplaceRequestRow {
  return {
    club_id: "c1",
    created_by: "u1",
    title: "Need kit",
    category: "equipment",
    provider_type_wanted: "supplier",
    description: null,
    quantity: null,
    visibility: "marketplace",
    budget_min: 100,
    budget_max: 500,
    deadline: null,
    location: "Munich",
    attachments: [],
    status: "open",
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("filterRequestsForProvider extended", () => {
  const base = [
    req({ id: "1", location: "Munich", budget_min: 100, budget_max: 400 }),
    req({ id: "2", location: "Berlin", budget_min: 800, budget_max: 1200, status: "offers_received" }),
    req({ id: "3", location: "Munich South", budget_min: null, budget_max: null }),
  ];

  it("filters by location substring and budget overlap", () => {
    expect(
      filterRequestsForProvider(base, "supplier", ["equipment"], {
        location: "munich",
        budgetMax: 450,
      }).map((r) => r.id),
    ).toEqual(["1", "3"]);
  });

  it("filters no-offer-yet", () => {
    expect(
      filterRequestsForProvider(base, "supplier", ["equipment"], {
        noOfferYet: true,
        offeredRequestIds: new Set(["1"]),
      }).map((r) => r.id),
    ).toEqual(["2", "3"]);
  });
});

describe("provider request filter URL helpers", () => {
  it("round-trips search params", () => {
    const params = providerRequestFiltersToSearchParams({
      category: "equipment",
      location: "Munich",
      status: "open",
      noOfferYet: true,
      budgetMin: 50,
      budgetMax: 200,
    });
    const parsed = parseProviderRequestFiltersFromSearch(params.toString());
    expect(parsed.category).toBe("equipment");
    expect(parsed.location).toBe("Munich");
    expect(parsed.status).toBe("open");
    expect(parsed.noOfferYet).toBe(true);
    expect(parsed.budgetMin).toBe(50);
    expect(parsed.budgetMax).toBe(200);
  });
});

describe("computeProviderRequestInboxKpis", () => {
  it("counts matching offered and won", () => {
    const matching = [req({ id: "1" }), req({ id: "2" }), req({ id: "3" })];
    expect(
      computeProviderRequestInboxKpis(matching, [
        { request_id: "1", status: "submitted" },
        { request_id: "2", status: "accepted" },
      ]),
    ).toEqual({ openMatching: 3, offered: 2, won: 1 });
  });
});
