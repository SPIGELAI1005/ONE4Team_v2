import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKETPLACE_DISCOVER_FILTERS,
  filterMarketplaceProviders,
} from "@/lib/marketplace-discover";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";

function sampleProvider(
  overrides: Partial<MarketplaceProviderProfileRow> = {},
): MarketplaceProviderProfileRow {
  return {
    id: "p1",
    owner_user_id: "u1",
    provider_type: "supplier",
    partner_id: null,
    provider_name: "FC Gear Pro",
    slug: null,
    logo_url: null,
    cover_image_url: null,
    short_description: "Teamwear for amateur clubs",
    detailed_description: null,
    categories: ["teamwear_jerseys"],
    location: "Munich, Germany",
    service_area_km: 80,
    availability_mode: "hybrid",
    contact_person: null,
    contact_email: "hello@fcgear.test",
    phone: null,
    website: null,
    packages: [],
    price_indication: null,
    availability_notes: null,
    references: ["FC Riverside"],
    visibility: "marketplace_only",
    listing_status: "active",
    verification_status: "verified",
    is_featured: false,
    rejection_reason: null,
    profile_completeness: 70,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("filterMarketplaceProviders", () => {
  const providers = [
    sampleProvider(),
    sampleProvider({
      id: "p2",
      provider_name: "Remote IT Club",
      provider_type: "service_provider",
      categories: ["website_it"],
      location: "Berlin",
      availability_mode: "remote",
      service_area_km: null,
      verification_status: "unverified",
      references: [],
    }),
  ];

  it("returns all providers with default filters", () => {
    expect(filterMarketplaceProviders(providers, new Set(), DEFAULT_MARKETPLACE_DISCOVER_FILTERS)).toHaveLength(2);
  });

  it("filters by verified and references", () => {
    const filtered = filterMarketplaceProviders(providers, new Set(), {
      ...DEFAULT_MARKETPLACE_DISCOVER_FILTERS,
      verifiedOnly: true,
      referencesFilter: "with_references",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("p1");
  });

  it("filters by location and service area", () => {
    const filtered = filterMarketplaceProviders(providers, new Set(), {
      ...DEFAULT_MARKETPLACE_DISCOVER_FILTERS,
      location: "berlin",
      serviceArea: "remote",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("p2");
  });
});
