import { describe, expect, it } from "vitest";
import {
  defaultSommerfestEventsHighlight,
  normalizeClubEventsHighlight,
  resolveEffectiveEventsHighlight,
} from "@/lib/club-events-highlight";
import { parseClubPublicPageConfig, publicPageConfigToJson } from "@/lib/club-public-page-config";

describe("club-events-highlight", () => {
  it("normalizes enabled highlight with image and copy", () => {
    const config = normalizeClubEventsHighlight({
      enabled: true,
      imageUrl: " https://cdn.example/poster.png ",
      badge: " Festival ",
      title: "Club Day",
      eventsLead: "Join us",
      matchesLead: "See fixtures",
      location: "Pitch 1",
      posterAlt: "Poster",
    });
    expect(config).toEqual({
      enabled: true,
      imageUrl: "https://cdn.example/poster.png",
      badge: "Festival",
      title: "Club Day",
      eventsLead: "Join us",
      matchesLead: "See fixtures",
      location: "Pitch 1",
      posterAlt: "Poster",
    });
  });

  it("defaults Allach to Sommerfest highlight when unset", () => {
    const resolved = resolveEffectiveEventsHighlight(null, { slug: "tsv-allach-09", name: "TSV Allach 09" });
    expect(resolved.enabled).toBe(true);
    expect(resolved.imageUrl).toContain("sommerfest");
  });

  it("keeps other clubs disabled when unset", () => {
    const resolved = resolveEffectiveEventsHighlight(null, { slug: "other-club", name: "Other" });
    expect(resolved.enabled).toBe(false);
  });

  it("round-trips through public page config JSON", () => {
    const highlight = defaultSommerfestEventsHighlight();
    highlight.title = "Custom title";
    highlight.imageUrl = "https://cdn.example/custom.png";
    const parsed = parseClubPublicPageConfig({
      schemaVersion: 1,
      general: { name: "Club", slug: "club", description: null, is_public: true, default_language: "de", supported_languages: ["de"], localized: {}, timezone: "Europe/Berlin", club_category: "" },
      branding: { primary_color: "", secondary_color: "", tertiary_color: "", support_color: "", foreground_color: "", muted_color: "", theme_preference: "system" },
      assets: { logo_url: "", favicon_url: "", cover_image_url: "", hero_image_url: "", reference_images: [], logo_alt: "", favicon_alt: "", cover_alt: "", hero_alt: "", cover_object_position: "", hero_object_position: "", default_generated_asset: "", default_hero_asset_id: "", hero_club_color_overlay: true, hero_tint_strength: 0.45 },
      contact: { address: "", phone: "", email: "", website: "", latitude: "", longitude: "", public_location_notes: "" },
      social: { facebook_url: "", instagram_url: "", twitter_url: "", youtube_url: "", tiktok_url: "" },
      seo: { meta_title: "", meta_description: "", news_page_subtitle: null, og_image_url: "", allow_indexing: true, structured_data_enabled: true },
      onboarding: { join_approval_mode: "manual", join_reviewer_policy: "admin_only", join_default_role: "member", join_default_team: "", join_notify_emails: "", join_auto_approve_invited_only: false },
      eventsHighlight: highlight,
    });
    expect(parsed?.eventsHighlight?.title).toBe("Custom title");
    const json = publicPageConfigToJson(parsed!);
    expect((json.eventsHighlight as { imageUrl: string }).imageUrl).toBe("https://cdn.example/custom.png");
  });
});
