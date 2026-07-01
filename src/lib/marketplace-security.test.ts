import { describe, expect, it } from "vitest";
import type {
  MarketplaceOfferRow,
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import {
  canManageProviderProfile,
  canProviderViewMarketplaceRequest,
  canViewMarketplaceOffer,
  canViewProviderProfile,
  filterOffersVisibleToClub,
  filterOffersVisibleToProvider,
  getPublicListingDocumentPackages,
  isMarketplaceListingDiscoverable,
  isMarketplaceListingHiddenFromDiscovery,
  isMarketplaceListingPublicOnWeb,
  isProviderProfileOwner,
} from "@/lib/marketplace-security";

function profile(
  overrides: Partial<MarketplaceProviderProfileRow> = {},
): MarketplaceProviderProfileRow {
  return {
    id: "prof-a",
    owner_user_id: "user-a",
    provider_type: "supplier",
    partner_id: null,
    provider_name: "Gear Pro",
    slug: null,
    logo_url: null,
    cover_image_url: null,
    short_description: "Teamwear",
    detailed_description: null,
    categories: ["teamwear_jerseys"],
    location: "Munich",
    service_area_km: 50,
    availability_mode: "local",
    contact_person: null,
    contact_email: "a@test.com",
    phone: null,
    website: null,
    packages: [
      { id: "pkg-1", name: "Kit bundle", priceIndication: "€500" },
      { id: "doc-1", name: "Private catalogue", kind: "document", url: "https://example.com/cat.pdf" },
    ],
    price_indication: null,
    availability_notes: null,
    references: [],
    visibility: "marketplace_only",
    listing_status: "active",
    verification_status: "verified",
    is_featured: false,
    rejection_reason: null,
    profile_completeness: 80,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function request(overrides: Partial<MarketplaceRequestRow> = {}): MarketplaceRequestRow {
  return {
    id: "req-1",
    club_id: "club-1",
    created_by: "admin-1",
    title: "Jerseys",
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
    status: "open",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function offer(overrides: Partial<MarketplaceOfferRow> = {}): MarketplaceOfferRow {
  return {
    id: "offer-a",
    request_id: "req-1",
    provider_profile_id: "prof-a",
    provider_role: "supplier",
    title: "Offer A",
    description: null,
    price_indication: "1000",
    currency: "EUR",
    delivery_timeline: null,
    included_services: [],
    attachments: [],
    notes: null,
    status: "sent",
    accepted_at: null,
    accepted_by: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("provider profile ownership", () => {
  it("identifies owner and allows manage only for owner", () => {
    const p = profile();
    expect(isProviderProfileOwner("user-a", p)).toBe(true);
    expect(isProviderProfileOwner("user-b", p)).toBe(false);
    expect(canManageProviderProfile({ userId: "user-a" }, p)).toBe(true);
    expect(canManageProviderProfile({ userId: "user-b" }, p)).toBe(false);
  });

  it("owner can view draft listing; strangers cannot", () => {
    const draft = profile({ listing_status: "draft", visibility: "private" });
    expect(canViewProviderProfile({ userId: "user-a" }, draft)).toBe(true);
    expect(canViewProviderProfile({ userId: "user-b" }, draft)).toBe(false);
  });
});

describe("public listing visibility", () => {
  it("draft and rejected listings are not discoverable", () => {
    expect(isMarketplaceListingHiddenFromDiscovery(profile({ listing_status: "draft" }))).toBe(true);
    expect(isMarketplaceListingHiddenFromDiscovery(profile({ listing_status: "rejected" }))).toBe(true);
    expect(isMarketplaceListingDiscoverable(profile({ listing_status: "draft" }))).toBe(false);
    expect(isMarketplaceListingDiscoverable(profile({ listing_status: "rejected" }))).toBe(false);
  });

  it("active marketplace_only listing is discoverable in marketplace", () => {
    const active = profile({ listing_status: "active", visibility: "marketplace_only" });
    expect(isMarketplaceListingDiscoverable(active)).toBe(true);
    expect(isMarketplaceListingPublicOnWeb(active)).toBe(false);
  });

  it("active public listing is discoverable and public on web", () => {
    const pub = profile({ listing_status: "active", visibility: "public" });
    expect(isMarketplaceListingDiscoverable(pub)).toBe(true);
    expect(isMarketplaceListingPublicOnWeb(pub)).toBe(true);
  });

  it("private visibility hides listing from discovery even when active", () => {
    const hidden = profile({ listing_status: "active", visibility: "private" });
    expect(isMarketplaceListingDiscoverable(hidden)).toBe(false);
    expect(isMarketplaceListingPublicOnWeb(hidden)).toBe(false);
  });

  it("private documents are never public when listing is hidden", () => {
    const hidden = profile({ listing_status: "draft", visibility: "private" });
    expect(getPublicListingDocumentPackages(hidden)).toEqual([]);
    const privateActive = profile({ listing_status: "active", visibility: "private" });
    expect(getPublicListingDocumentPackages(privateActive)).toEqual([]);
  });

  it("exposes document packages only for discoverable listings", () => {
    const active = profile({ listing_status: "active", visibility: "marketplace_only" });
    const docs = getPublicListingDocumentPackages(active);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.url).toBe("https://example.com/cat.pdf");
  });
});

describe("request visibility for providers", () => {
  const providerA = profile();

  it("active provider sees open marketplace requests matching profile", () => {
    expect(
      canProviderViewMarketplaceRequest({ userId: "user-a" }, request(), providerA),
    ).toBe(true);
  });

  it("denies private requests and inactive listings", () => {
    expect(
      canProviderViewMarketplaceRequest(
        { userId: "user-a" },
        request({ visibility: "private" }),
        providerA,
      ),
    ).toBe(false);
    expect(
      canProviderViewMarketplaceRequest(
        { userId: "user-a" },
        request(),
        profile({ listing_status: "draft" }),
      ),
    ).toBe(false);
  });

  it("denies wrong provider type and non-owner", () => {
    expect(
      canProviderViewMarketplaceRequest(
        { userId: "user-b" },
        request(),
        providerA,
      ),
    ).toBe(false);
    expect(
      canProviderViewMarketplaceRequest(
        { userId: "user-a" },
        request({ provider_type_wanted: "consultant" }),
        providerA,
      ),
    ).toBe(false);
  });

  it("club admin can view club requests regardless of provider profile", () => {
    expect(
      canProviderViewMarketplaceRequest(
        {
          userId: "club-admin",
          isClubAdminForClub: (clubId) => clubId === "club-1",
        },
        request({ visibility: "private" }),
        null,
      ),
    ).toBe(true);
  });
});

describe("offer privacy", () => {
  const providerA = profile({ id: "prof-a", owner_user_id: "user-a" });
  const providerB = profile({
    id: "prof-b",
    owner_user_id: "user-b",
    provider_name: "Other Gear",
  });
  const req = request();
  const offerA = offer({ id: "offer-a", provider_profile_id: "prof-a" });
  const offerB = offer({ id: "offer-b", provider_profile_id: "prof-b" });

  it("provider A cannot see provider B offers via filter", () => {
    const all = [offerA, offerB];
    expect(filterOffersVisibleToProvider(all, "prof-a").map((o) => o.id)).toEqual(["offer-a"]);
    expect(filterOffersVisibleToProvider(all, "prof-b").map((o) => o.id)).toEqual(["offer-b"]);
  });

  it("provider cannot see competing offers on same request", () => {
    expect(
      canViewMarketplaceOffer({ userId: "user-a" }, offerB, providerA, req),
    ).toBe(false);
    expect(
      canViewMarketplaceOffer({ userId: "user-a" }, offerA, providerA, req),
    ).toBe(true);
  });

  it("club admin sees offers only for own club requests", () => {
    const clubRequestIds = new Set(["req-1"]);
    const otherClubOffer = offer({ id: "offer-x", request_id: "req-other" });
    const visible = filterOffersVisibleToClub([offerA, offerB, otherClubOffer], clubRequestIds);
    expect(visible.map((o) => o.id)).toEqual(["offer-a", "offer-b"]);
  });

  it("club admin can view offers for their requests; provider B cannot view club view", () => {
    const ctxClub = {
      userId: "club-admin",
      isClubAdminForClub: (clubId: string) => clubId === "club-1",
    };
    expect(canViewMarketplaceOffer(ctxClub, offerA, providerA, req)).toBe(true);
    expect(canViewMarketplaceOffer(ctxClub, offerB, providerB, req)).toBe(true);
    expect(
      canViewMarketplaceOffer({ userId: "user-b" }, offerA, providerB, req),
    ).toBe(false);
  });
});
