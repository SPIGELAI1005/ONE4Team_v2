import { describe, expect, it } from "vitest";
import {
  defaultSommerfestSiteBanner,
  defaultsForSiteBannerKind,
  normalizeClubSiteBanner,
  resolveEffectiveSiteBanner,
  resolveSiteBannerHref,
} from "@/lib/club-site-banner";

describe("normalizeClubSiteBanner", () => {
  it("defaults to disabled empty banner", () => {
    expect(normalizeClubSiteBanner(null).enabled).toBe(false);
    expect(normalizeClubSiteBanner(null).kind).toBe("promo");
  });

  it("parses enabled sommerfest banner", () => {
    expect(
      normalizeClubSiteBanner({
        enabled: true,
        kind: "sommerfest_live",
        title: " Cup ",
        subtitle: "Live",
        ctaLabel: "Go",
        href: "/tournament/sommerfest-2026",
      }),
    ).toEqual({
      enabled: true,
      kind: "sommerfest_live",
      title: "Cup",
      subtitle: "Live",
      ctaLabel: "Go",
      href: "/tournament/sommerfest-2026",
    });
  });

  it("maps legacy custom kind to promo and prefixes relative href", () => {
    expect(
      normalizeClubSiteBanner({
        enabled: true,
        kind: "custom",
        title: "Camp",
        subtitle: "Info",
        ctaLabel: "Open",
        href: "news/camp-2026",
      }),
    ).toMatchObject({
      kind: "promo",
      href: "/news/camp-2026",
    });
  });

  it("keeps news / event / alert kinds", () => {
    expect(normalizeClubSiteBanner({ enabled: true, kind: "news" }).kind).toBe("news");
    expect(normalizeClubSiteBanner({ enabled: true, kind: "event" }).kind).toBe("event");
    expect(normalizeClubSiteBanner({ enabled: true, kind: "alert" }).kind).toBe("alert");
  });
});

describe("defaultsForSiteBannerKind", () => {
  it("returns enabled templates per kind", () => {
    expect(defaultsForSiteBannerKind("news").kind).toBe("news");
    expect(defaultsForSiteBannerKind("event").enabled).toBe(true);
    expect(defaultsForSiteBannerKind("sommerfest_live").href).toContain("/tournament/");
  });
});

describe("resolveEffectiveSiteBanner", () => {
  it("keeps Allach Sommerfest on when config missing", () => {
    const banner = resolveEffectiveSiteBanner(null, { slug: "tsv-allach-09", name: "TSV Allach 09" });
    expect(banner.enabled).toBe(true);
    expect(banner.kind).toBe("sommerfest_live");
  });

  it("respects explicit off for Allach", () => {
    expect(
      resolveEffectiveSiteBanner(
        { ...defaultSommerfestSiteBanner(), enabled: false },
        { slug: "tsv-allach-09" },
      ).enabled,
    ).toBe(false);
  });

  it("defaults other clubs to off", () => {
    expect(resolveEffectiveSiteBanner(null, { slug: "fc-example" }).enabled).toBe(false);
  });

  it("uses saved promo banner instead of Allach default", () => {
    const banner = resolveEffectiveSiteBanner(
      {
        enabled: true,
        kind: "news",
        title: "Sommer Camp",
        subtitle: "Campus",
        ctaLabel: "See Camp",
        href: "/news/camp",
      },
      { slug: "tsv-allach-09" },
    );
    expect(banner.kind).toBe("news");
    expect(banner.title).toBe("Sommer Camp");
  });
});

describe("resolveSiteBannerHref", () => {
  it("joins relative paths with club base", () => {
    expect(resolveSiteBannerHref("/tournament/sommerfest-2026", "/club/tsv-allach-09", "?draft=1")).toBe(
      "/club/tsv-allach-09/tournament/sommerfest-2026?draft=1",
    );
  });

  it("normalizes paths without leading slash", () => {
    expect(resolveSiteBannerHref("news/camp", "/club/tsv-allach-09")).toBe(
      "/club/tsv-allach-09/news/camp",
    );
  });

  it("passes through absolute urls", () => {
    expect(resolveSiteBannerHref("https://example.com/x", "/club/a")).toBe("https://example.com/x");
  });
});
