import { describe, expect, it } from "vitest";
import {
  clubRowToPublicPageConfig,
  editorFormToPublicPageConfig,
  emptyClubPublicPageEditorForm,
  overlayClubRowOntoPublicPageConfig,
  parseClubPublicPageConfig,
  publicPageConfigToEditorForm,
  publicPageConfigToJson,
  roundTripClubPageEditorForm,
  stableConfigFingerprint,
} from "@/lib/club-public-page-config";
import { mapClubRow } from "@/lib/public-club-models";

function sampleEditorForm() {
  const base = emptyClubPublicPageEditorForm();
  return {
    ...base,
    name: "TSV Allach 09",
    slug: "tsv-allach-09",
    description: "Football club in Munich",
    is_public: true,
    default_language: "de",
    timezone: "Europe/Berlin",
    club_category: "Abteilung Fußball",
    logo_url: "https://cdn.example/logo.png",
    favicon_url: "https://cdn.example/favicon.ico",
    cover_image_url: "https://cdn.example/cover.jpg",
    hero_image_url: "https://cdn.example/hero.jpg",
    primary_color: "#195511",
    secondary_color: "#1ec837",
    tertiary_color: "#5e636e",
    support_color: "#f8fcf9",
    foreground_color: "#F8FAFC",
    muted_color: "#000000",
    theme_preference: "dark" as const,
    logo_alt: "Club logo",
    hero_alt: "Stadium",
    hero_object_position: "top",
    hero_club_color_overlay: false,
    hero_tint_strength: 0.25,
    default_hero_asset_id: "football-training-pitch-neutral",
    reference_images: ["https://cdn.example/ref1.jpg"],
    address: "Enterstraße 55, 80999 München",
    phone: "+49 89 123456",
    email: "info@club.example",
    website: "https://club.example",
    contact_latitude: "48.18",
    contact_longitude: "11.45",
    public_location_notes: "Park at the north lot",
    facebook_url: "https://facebook.com/club",
    instagram_url: "https://instagram.com/club",
    meta_title: "TSV Allach 09",
    meta_description: "Official club site",
    news_page_subtitle: "Stadion Ticker",
    seo_og_image_url: "https://cdn.example/og.png",
    seo_allow_indexing: false,
    seo_structured_data_enabled: false,
    join_approval_mode: "auto" as const,
    join_reviewer_policy: "admin_trainer" as const,
    join_default_role: "player",
    join_default_team: "U10-IV",
    join_notify_emails: "admin@club.example",
    join_auto_approve_invited_only: true,
    featured_team_ids: ["team-uuid-1", "team-uuid-2"],
    homepage_show_partners: true,
    siteBanner: {
      enabled: true,
      kind: "sommerfest_live" as const,
      title: "Sommerfest 2026",
      subtitle: "Live board",
      ctaLabel: "Open",
      href: "/tournament/sommerfest-2026",
    },
    microPages: {
      ...base.microPages,
      news: { ...base.microPages.news, enabled: true, showInNav: true, label: "News" },
    },
    privacy: {
      ...base.privacy,
      show_player_names_public: false,
      allow_join_requests_public: true,
    },
  };
}

describe("club-public-page-config", () => {
  it("round-trips every admin editor field through JSON", () => {
    const input = sampleEditorForm();
    const preserve = editorFormToPublicPageConfig(emptyClubPublicPageEditorForm());
    preserve.featuredNewsIds = ["news-1"];
    preserve.featuredSponsorIds = ["sponsor-1"];

    const output = roundTripClubPageEditorForm(input, preserve);

    expect(output.name).toBe(input.name);
    expect(output.slug).toBe(input.slug);
    expect(output.description).toBe(input.description);
    expect(output.is_public).toBe(input.is_public);
    expect(output.default_language).toBe(input.default_language);
    expect(output.secondary_language_enabled).toBe(input.secondary_language_enabled);
    expect(output.localized_secondary).toEqual(input.localized_secondary);
    expect(output.timezone).toBe(input.timezone);
    expect(output.club_category).toBe(input.club_category);
    expect(output.logo_url).toBe(input.logo_url);
    expect(output.favicon_url).toBe(input.favicon_url);
    expect(output.cover_image_url).toBe(input.cover_image_url);
    expect(output.hero_image_url).toBe(input.hero_image_url);
    expect(output.primary_color).toBe(input.primary_color);
    expect(output.secondary_color).toBe(input.secondary_color);
    expect(output.tertiary_color).toBe(input.tertiary_color);
    expect(output.support_color).toBe(input.support_color);
    expect(output.foreground_color).toBe(input.foreground_color);
    expect(output.muted_color).toBe(input.muted_color);
    expect(output.theme_preference).toBe(input.theme_preference);
    expect(output.logo_alt).toBe(input.logo_alt);
    expect(output.hero_alt).toBe(input.hero_alt);
    expect(output.hero_object_position).toBe(input.hero_object_position);
    expect(output.hero_club_color_overlay).toBe(input.hero_club_color_overlay);
    expect(output.hero_tint_strength).toBe(input.hero_tint_strength);
    expect(output.reference_images).toEqual(input.reference_images);
    expect(output.address).toBe(input.address);
    expect(output.phone).toBe(input.phone);
    expect(output.email).toBe(input.email);
    expect(output.website).toBe(input.website);
    expect(output.contact_latitude).toBe(input.contact_latitude);
    expect(output.contact_longitude).toBe(input.contact_longitude);
    expect(output.public_location_notes).toBe(input.public_location_notes);
    expect(output.facebook_url).toBe(input.facebook_url);
    expect(output.instagram_url).toBe(input.instagram_url);
    expect(output.meta_title).toBe(input.meta_title);
    expect(output.meta_description).toBe(input.meta_description);
    expect(output.news_page_subtitle).toBe(input.news_page_subtitle);
    expect(output.seo_og_image_url).toBe(input.seo_og_image_url);
    expect(output.seo_allow_indexing).toBe(input.seo_allow_indexing);
    expect(output.seo_structured_data_enabled).toBe(input.seo_structured_data_enabled);
    expect(output.join_approval_mode).toBe(input.join_approval_mode);
    expect(output.join_reviewer_policy).toBe(input.join_reviewer_policy);
    expect(output.join_default_role).toBe(input.join_default_role);
    expect(output.join_default_team).toBe(input.join_default_team);
    expect(output.join_notify_emails).toBe(input.join_notify_emails);
    expect(output.join_auto_approve_invited_only).toBe(input.join_auto_approve_invited_only);
    expect(output.featured_team_ids).toEqual(input.featured_team_ids);
    expect(output.homepage_show_partners).toBe(input.homepage_show_partners);
    expect(output.siteBanner).toEqual(input.siteBanner);
    expect(output.microPages.news.label).toBe("News");
    expect(output.privacy.allow_join_requests_public).toBe(true);
  });

  it("parses draft JSON missing optional top-level sections", () => {
    const config = editorFormToPublicPageConfig(sampleEditorForm());
    const json = publicPageConfigToJson(config);
    const partial = { ...json, onboarding: undefined, seo: undefined };
    const parsed = parseClubPublicPageConfig(partial);
    expect(parsed).not.toBeNull();
    expect(parsed?.branding.muted_color).toBe("#000000");
    expect(parsed?.onboarding.join_approval_mode).toBe("manual");
  });

  it("maps JSON-only branding and hero fields onto the public club record", () => {
    const config = editorFormToPublicPageConfig(sampleEditorForm());
    const row = {
      id: "club-1",
      name: config.general.name,
      slug: config.general.slug,
      is_public: true,
      public_page_published_config: publicPageConfigToJson(config),
    };
    const club = mapClubRow(row);
    expect(club.muted_color).toBe("#000000");
    expect(club.foreground_color).toBe("#F8FAFC");
    expect(club.hero_image_url).toBe("https://cdn.example/hero.jpg");
    expect(club.news_page_subtitle).toBe("Stadion Ticker");
    expect(club.join_auto_approve_invited_only).toBe(true);
    expect(club.siteBanner.enabled).toBe(true);
    expect(club.siteBanner.kind).toBe("sommerfest_live");
  });

  it("keeps a stable fingerprint after serialize and parse", () => {
    const config = editorFormToPublicPageConfig(sampleEditorForm());
    const fp1 = stableConfigFingerprint(config);
    const reparsed = parseClubPublicPageConfig(publicPageConfigToJson(config));
    expect(reparsed).not.toBeNull();
    const fp2 = stableConfigFingerprint(reparsed!);
    expect(fp2).toBe(fp1);
  });

  it("overlays club row columns without dropping JSON-only branding text colors", () => {
    const config = editorFormToPublicPageConfig(sampleEditorForm());
    const merged = overlayClubRowOntoPublicPageConfig(config, {
      primary_color: "#111111",
      name: "Row Name",
    });
    expect(merged.branding.primary_color).toBe("#111111");
    expect(merged.branding.muted_color).toBe("#000000");
    expect(merged.general.name).toBe("Row Name");
    const fromRow = clubRowToPublicPageConfig({
      name: "Row Name",
      slug: config.general.slug,
      primary_color: "#111111",
      public_page_published_config: publicPageConfigToJson(config),
    });
    expect(fromRow.branding.muted_color).toBe("#000000");
    expect(publicPageConfigToEditorForm(fromRow).muted_color).toBe("#000000");
  });

  it("does not wipe JSON asset URLs when club row columns are empty strings", () => {
    const config = editorFormToPublicPageConfig(sampleEditorForm());
    const merged = overlayClubRowOntoPublicPageConfig(config, {
      cover_image_url: "",
      logo_url: "",
      hero_image_url: "",
    });
    expect(merged.assets.cover_image_url).toBe("https://cdn.example/cover.jpg");
    expect(merged.assets.logo_url).toBe("https://cdn.example/logo.png");
    expect(merged.assets.hero_image_url).toBe("https://cdn.example/hero.jpg");
  });
});
