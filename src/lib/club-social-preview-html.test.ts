import { describe, expect, it } from "vitest";
import {
  buildClubSocialPreviewHtml,
  buildClubSocialTitle,
  isSocialPreviewBot,
  parseClubSlugFromPath,
  resolveAppleTouchIconUrl,
  resolveClubSocialImageUrl,
} from "../../api/_lib/club-social-html";

describe("club social preview html", () => {
  it("detects WhatsApp and Facebook crawlers", () => {
    expect(isSocialPreviewBot("WhatsApp/2.23.20.0")).toBe(true);
    expect(isSocialPreviewBot("facebookexternalhit/1.1")).toBe(true);
    expect(isSocialPreviewBot("Mozilla/5.0 Chrome/120")).toBe(false);
  });

  it("parses club slug from pathname", () => {
    expect(parseClubSlugFromPath("/club/tsv-allach-09")).toBe("tsv-allach-09");
    expect(parseClubSlugFromPath("/club/tsv-allach-09/news")).toBe("tsv-allach-09");
  });

  it("builds html with club og tags and apple touch icon", () => {
    const club = {
      name: "TSV Allach 09",
      slug: "tsv-allach-09",
      description: "Official club page",
      meta_title: null,
      meta_description: "Teams, training and events.",
      logo_url: "https://cdn.example/logo.png",
      favicon_url: "https://cdn.example/favicon.png",
      og_image_url: null,
      hero_image_url: null,
      cover_image_url: null,
      is_public: true,
    };

    const html = buildClubSocialPreviewHtml({
      club,
      canonicalUrl: "https://one-4-team-v2.vercel.app/club/tsv-allach-09",
      origin: "https://one-4-team-v2.vercel.app",
      title: buildClubSocialTitle(club),
      description: "Teams, training and events.",
      imageUrl: resolveClubSocialImageUrl(club, "https://one-4-team-v2.vercel.app"),
      appleTouchIconUrl: resolveAppleTouchIconUrl(club, "https://one-4-team-v2.vercel.app"),
    });

    expect(html).toContain('property="og:title" content="TSV Allach 09 | ONE4Team"');
    expect(html).toContain('property="og:description" content="Teams, training and events."');
    expect(html).toContain("https://cdn.example/logo.png");
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="TSV Allach 09"');
  });
});
