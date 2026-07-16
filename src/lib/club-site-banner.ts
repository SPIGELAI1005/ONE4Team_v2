import { SOMMERFEST_TOURNAMENT_SLUG } from "@/lib/tsv-allach-sommerfest-competition";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";

/** Visual / behaviour variants for the public club chrome banner. */
export type ClubSiteBannerKind =
  | "promo"
  | "news"
  | "event"
  | "alert"
  | "sommerfest_live"
  /** @deprecated Prefer `promo`. Still accepted when reading saved config. */
  | "custom";

export interface ClubSiteBannerConfig {
  /** When false, the public club chrome hides the site banner. */
  enabled: boolean;
  kind: ClubSiteBannerKind;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /**
   * Relative path under the club microsite (e.g. `/news/my-story`)
   * or an absolute http(s) URL.
   */
  href: string;
}

export const CLUB_SITE_BANNER_KINDS: ClubSiteBannerKind[] = [
  "promo",
  "news",
  "event",
  "alert",
  "sommerfest_live",
];

export const EMPTY_CLUB_SITE_BANNER: ClubSiteBannerConfig = {
  enabled: false,
  kind: "promo",
  title: "",
  subtitle: "",
  ctaLabel: "",
  href: "",
};

function normalizeBannerHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function normalizeClubSiteBannerKind(raw: unknown): ClubSiteBannerKind {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "custom") return "promo";
  if (
    value === "promo" ||
    value === "news" ||
    value === "event" ||
    value === "alert" ||
    value === "sommerfest_live"
  ) {
    return value;
  }
  return "promo";
}

/** Default Sommerfest strip for TSV Allach when no saved banner config exists yet. */
export function defaultSommerfestSiteBanner(): ClubSiteBannerConfig {
  return {
    enabled: true,
    kind: "sommerfest_live",
    title: "Sommerfest 2026 · Live tournament",
    subtitle: "Follow fixtures, results, and the cup board on the public tournament page.",
    ctaLabel: "Open tournament",
    href: `/tournament/${SOMMERFEST_TOURNAMENT_SLUG}`,
  };
}

/** Suggested copy + link shape when switching banner type in admin. */
export function defaultsForSiteBannerKind(kind: ClubSiteBannerKind): ClubSiteBannerConfig {
  const resolved = normalizeClubSiteBannerKind(kind);
  switch (resolved) {
    case "sommerfest_live":
      return defaultSommerfestSiteBanner();
    case "news":
      return {
        enabled: true,
        kind: "news",
        title: "Latest club news",
        subtitle: "Read the newest story from the club.",
        ctaLabel: "Read more",
        href: "/news",
      };
    case "event":
      return {
        enabled: true,
        kind: "event",
        title: "Upcoming club event",
        subtitle: "Save the date and join us.",
        ctaLabel: "View event",
        href: "/events",
      };
    case "alert":
      return {
        enabled: true,
        kind: "alert",
        title: "Important notice",
        subtitle: "Please read this update from the club.",
        ctaLabel: "Learn more",
        href: "/news",
      };
    case "promo":
    default:
      return {
        enabled: true,
        kind: "promo",
        title: "Club highlight",
        subtitle: "Discover what’s new at the club.",
        ctaLabel: "Open",
        href: "/",
      };
  }
}

export function normalizeClubSiteBanner(raw: unknown): ClubSiteBannerConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_CLUB_SITE_BANNER };
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled === true,
    kind: normalizeClubSiteBannerKind(o.kind),
    title: typeof o.title === "string" ? o.title.trim() : "",
    subtitle: typeof o.subtitle === "string" ? o.subtitle.trim() : "",
    ctaLabel: typeof o.ctaLabel === "string" ? o.ctaLabel.trim() : "",
    href: normalizeBannerHref(typeof o.href === "string" ? o.href : ""),
  };
}

/**
 * Effective banner for public rendering.
 * Allach clubs without a saved `siteBanner` keep the historical Sommerfest strip on by default.
 */
export function resolveEffectiveSiteBanner(
  siteBanner: ClubSiteBannerConfig | null | undefined,
  club?: { name?: string | null; slug?: string | null } | null,
): ClubSiteBannerConfig {
  if (siteBanner != null) return normalizeClubSiteBanner(siteBanner);
  if (isTsvAllachClub(club)) return defaultSommerfestSiteBanner();
  return { ...EMPTY_CLUB_SITE_BANNER };
}

export function resolveSiteBannerHref(
  href: string,
  basePath: string,
  searchSuffix = "",
): string {
  const trimmed = normalizeBannerHref(href);
  if (!trimmed) return basePath || "/";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const root = (basePath || "").replace(/\/$/, "");
  return `${root}${trimmed}${searchSuffix}`;
}

/** Live match stats strip — only for the dedicated Sommerfest banner type. */
export function isSommerfestLiveBanner(banner: ClubSiteBannerConfig): boolean {
  return normalizeClubSiteBannerKind(banner.kind) === "sommerfest_live";
}

export function siteBannerKindUsesLiveStats(kind: ClubSiteBannerKind): boolean {
  return normalizeClubSiteBannerKind(kind) === "sommerfest_live";
}
