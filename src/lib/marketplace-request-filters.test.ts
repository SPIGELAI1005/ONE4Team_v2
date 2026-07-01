import { describe, expect, it } from "vitest";
import type { MarketplaceRequestRow } from "@/lib/marketplace-models";
import {
  filterRequestsForProvider,
  isRequestRelevantForProvider,
  offerCountForRequest,
  parseRequestAttachments,
} from "@/lib/marketplace-request-filters";

function makeRequest(overrides: Partial<MarketplaceRequestRow> = {}): MarketplaceRequestRow {
  return {
    id: "req-1",
    club_id: "club-1",
    title: "Test request",
    category: "equipment",
    description: null,
    location: null,
    deadline: null,
    budget_min: null,
    budget_max: null,
    visibility: "marketplace",
    status: "open",
    provider_type_wanted: null,
    quantity: null,
    attachments: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isRequestRelevantForProvider", () => {
  it("excludes private and non-open requests", () => {
    expect(
      isRequestRelevantForProvider(
        makeRequest({ visibility: "private" }),
        "supplier",
        ["equipment"],
      ),
    ).toBe(false);
    expect(
      isRequestRelevantForProvider(
        makeRequest({ status: "draft" }),
        "supplier",
        ["equipment"],
      ),
    ).toBe(false);
  });

  it("matches provider type and category", () => {
    expect(
      isRequestRelevantForProvider(
        makeRequest({ provider_type_wanted: "supplier" }),
        "supplier",
        ["equipment"],
      ),
    ).toBe(true);
    expect(
      isRequestRelevantForProvider(
        makeRequest({ provider_type_wanted: "consultant" }),
        "supplier",
        ["equipment"],
      ),
    ).toBe(false);
    expect(
      isRequestRelevantForProvider(
        makeRequest({ category: "consulting" }),
        "supplier",
        ["equipment"],
      ),
    ).toBe(false);
  });
});

describe("filterRequestsForProvider", () => {
  const requests = [
    makeRequest({ id: "a", category: "equipment" }),
    makeRequest({ id: "b", category: "photography", status: "offers_received" }),
    makeRequest({ id: "c", category: "equipment", visibility: "private" }),
  ];

  it("filters by relevance and category", () => {
    const filtered = filterRequestsForProvider(requests, "supplier", ["equipment"], {
      category: "equipment",
    });
    expect(filtered.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("offerCountForRequest", () => {
  it("counts offers for a request", () => {
    const count = offerCountForRequest("req-1", [
      { request_id: "req-1" },
      { request_id: "req-2" },
      { request_id: "req-1" },
    ]);
    expect(count).toBe(2);
  });
});

describe("parseRequestAttachments", () => {
  it("parses valid attachment rows", () => {
    expect(
      parseRequestAttachments([
        { name: "Brief.pdf", url: "https://example.com/brief.pdf" },
        { url: "https://example.com/photo.jpg" },
        { url: "" },
      ]),
    ).toEqual([
      { name: "Brief.pdf", url: "https://example.com/brief.pdf" },
      { name: "https://example.com/photo.jpg", url: "https://example.com/photo.jpg" },
    ]);
  });
});
