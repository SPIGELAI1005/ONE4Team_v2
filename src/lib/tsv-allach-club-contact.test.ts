import { describe, expect, it } from "vitest";
import {
  applyTsvAllachClubContactDefaults,
  TSV_ALLACH_CLUB_ADDRESS,
  TSV_ALLACH_CLUB_LATITUDE,
  TSV_ALLACH_CLUB_LONGITUDE,
} from "@/lib/tsv-allach-club-contact";
import type { PublicClubRecord } from "@/lib/public-club-models";

function minimalClub(overrides: Partial<PublicClubRecord>): PublicClubRecord {
  return {
    id: "club-1",
    name: "Test Club",
    slug: "test-club",
    club_category: null,
    description: null,
    is_public: true,
    logo_url: null,
    cover_image_url: null,
    hero_image_url: null,
    hero_object_position: "center",
    hero_club_color_overlay: true,
    hero_tint_strength: 0.45,
    default_hero_asset_id: "football-training-pitch-neutral",
    favicon_url: null,
    primary_color: null,
    secondary_color: null,
    tertiary_color: null,
    support_color: null,
    foreground_color: null,
    muted_color: null,
    reference_images: [],
    address: null,
    phone: null,
    email: null,
    website: null,
    meta_title: null,
    meta_description: null,
    facebook_url: null,
    instagram_url: null,
    twitter_url: null,
    youtube_url: null,
    tiktok_url: null,
    og_image_url: null,
    seoAllowIndexing: true,
    seoStructuredDataEnabled: true,
    latitude: null,
    longitude: null,
    public_location_notes: null,
    join_approval_mode: "manual",
    join_auto_approve_invited_only: false,
    join_default_role: "member",
    join_default_team: null,
    sectionVisibility: {},
    default_language: "de",
    supported_languages: ["de"],
    pageLocalized: {},
    publicPageLayout: { modules: [] },
    homepageModules: [],
    featuredTeamIds: [],
    featuredNewsIds: [],
    featuredSponsorIds: [],
    micrositePrivacy: {
      youthProtectionMode: false,
      showPlayerNamesPublic: true,
      showCoachContactPublic: true,
      showContactPersonsPublic: true,
      allowJoinRequestsPublic: true,
    },
    ...overrides,
  };
}

describe("tsv-allach-club-contact", () => {
  it("applies Enterstraße defaults only for slug tsv-allach-09", () => {
    const result = applyTsvAllachClubContactDefaults(
      minimalClub({ slug: "tsv-allach-09", name: "TSV Allach 09" }),
    );
    expect(result.address).toBe(TSV_ALLACH_CLUB_ADDRESS);
    expect(result.latitude).toBe(TSV_ALLACH_CLUB_LATITUDE);
    expect(result.longitude).toBe(TSV_ALLACH_CLUB_LONGITUDE);
  });

  it("does not apply TSV Allach address to other clubs", () => {
    const cases = [
      { slug: "fc-allach-united", name: "FC Allach United" },
      { slug: "tsv-munich", name: "TSV Munich" },
      { slug: "other-club", name: "Other Club" },
    ];
    for (const { slug, name } of cases) {
      const result = applyTsvAllachClubContactDefaults(minimalClub({ slug, name }));
      expect(result.address).toBeNull();
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    }
  });

  it("preserves explicit contact data for tsv-allach-09", () => {
    const result = applyTsvAllachClubContactDefaults(
      minimalClub({
        slug: "tsv-allach-09",
        address: "Custom address",
        latitude: 1,
        longitude: 2,
      }),
    );
    expect(result.address).toBe("Custom address");
    expect(result.latitude).toBe(1);
    expect(result.longitude).toBe(2);
  });
});
