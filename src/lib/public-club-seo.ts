import type { PublicClubRecord } from "@/lib/public-club-models";

export const PUBLIC_CLUB_BRAND_TITLE_SUFFIX = " | ONE4Team";

export function publicClubSiteOrigin(): string {
  const fromEnv =
    typeof import.meta !== "undefined" && String(import.meta.env?.VITE_PUBLIC_SITE_URL ?? "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export function toAbsoluteUrl(url: string | null | undefined, origin: string): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  const path = u.startsWith("/") ? u : `/${u}`;
  if (!origin) return path;
  return `${origin}${path}`;
}

export function resolvePublicClubOgImageAbsolute(options: {
  ogImageUrl: string | null;
  heroImageUrl: string | null;
  coverImageUrl: string | null;
  clubLogoUrl: string | null;
  origin: string;
  /** Bundled asset URL (e.g. from `import logo from '...png'`) */
  staticFallbackUrl: string;
}): string {
  const candidates = [
    options.ogImageUrl,
    options.heroImageUrl,
    options.coverImageUrl,
    options.clubLogoUrl,
  ];
  for (const c of candidates) {
    const abs = toAbsoluteUrl(c, options.origin);
    if (abs) return abs;
  }
  const fb = toAbsoluteUrl(options.staticFallbackUrl, options.origin);
  if (fb) return fb;
  return `${options.origin}/favicon.png`;
}

export type PublicClubSeoRouteKind =
  | "home"
  | "news"
  | "newsArticle"
  | "teams"
  | "teamDetail"
  | "schedule"
  | "matches"
  | "matchDetail"
  | "events"
  | "eventDetail"
  | "documents"
  | "join"
  | "contact";

export interface ParsedPublicClubPath {
  kind: PublicClubSeoRouteKind;
  /** Pathname only, no query (for canonical) */
  canonicalPathname: string;
}

function stripTrailingSlash(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/** `basePath` is `/club/:slug`; `pathname` is `location.pathname` */
export function parsePublicClubSeoPath(basePath: string, pathname: string): ParsedPublicClubPath {
  const base = stripTrailingSlash(basePath);
  const path = stripTrailingSlash(pathname || "/");
  const canonicalPathname = path;
  const rest =
    path === base ? "" : path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path.replace(/^\//, "");
  const parts = rest ? rest.split("/").filter(Boolean) : [];
  const seg = (i: number) => parts[i] ?? "";

  if (parts.length === 0) return { kind: "home", canonicalPathname };

  const p0 = seg(0);
  const p1 = seg(1);

  if (p0 === "news" && p1) return { kind: "newsArticle", canonicalPathname };
  if (p0 === "news") return { kind: "news", canonicalPathname };

  if (p0 === "teams" && p1) return { kind: "teamDetail", canonicalPathname };
  if (p0 === "teams") return { kind: "teams", canonicalPathname };

  if (p0 === "schedule") return { kind: "schedule", canonicalPathname };

  if (p0 === "matches" && p1) return { kind: "matchDetail", canonicalPathname };
  if (p0 === "matches") return { kind: "matches", canonicalPathname };

  if (p0 === "events" && p1) return { kind: "eventDetail", canonicalPathname };
  if (p0 === "events") return { kind: "events", canonicalPathname };

  if (p0 === "documents") return { kind: "documents", canonicalPathname };
  if (p0 === "join") return { kind: "join", canonicalPathname };
  if (p0 === "contact") return { kind: "contact", canonicalPathname };

  return { kind: "home", canonicalPathname };
}

export function publicClubShouldNoindex(options: {
  club: PublicClubRecord | null;
  isPreviewMode: boolean;
  isDraftPreviewMode: boolean;
  draftPreviewBlocked: boolean;
}): boolean {
  if (options.isPreviewMode || options.isDraftPreviewMode || options.draftPreviewBlocked) return true;
  if (!options.club) return true;
  if (!options.club.is_public) return true;
  if (!options.club.seoAllowIndexing) return true;
  return false;
}

export function buildPublicClubHomeTitle(club: PublicClubRecord): string {
  const meta = club.meta_title?.trim();
  if (meta) return meta;
  return `${club.name}${PUBLIC_CLUB_BRAND_TITLE_SUFFIX}`;
}

export function buildPublicClubDocumentTitle(options: {
  club: PublicClubRecord;
  routeKind: PublicClubSeoRouteKind;
  routeLabel: string;
  /** From child page: article title, team name, etc. */
  extrasTitle?: string | null;
}): string {
  const homeCore = options.club.meta_title?.trim() || `${options.club.name}${PUBLIC_CLUB_BRAND_TITLE_SUFFIX}`;
  if (options.routeKind === "home") return buildPublicClubHomeTitle(options.club);
  const specific = options.extrasTitle?.trim();
  if (specific) return `${specific} · ${homeCore}`;
  return `${options.routeLabel.trim()} · ${homeCore}`;
}

export function buildPublicClubMetaDescription(options: {
  club: PublicClubRecord;
  defaultFallback: string;
  extrasDescription?: string | null;
}): string {
  const extra = options.extrasDescription?.trim();
  if (extra) return extra.slice(0, 320);
  const meta = options.club.meta_description?.trim();
  if (meta) return meta.slice(0, 320);
  const desc = options.club.description?.trim();
  if (desc) return desc.slice(0, 320);
  return options.defaultFallback.slice(0, 320);
}

function sameAsUrls(club: PublicClubRecord): string[] {
  const urls = [club.facebook_url, club.instagram_url, club.twitter_url, club.youtube_url, club.tiktok_url]
    .map((u) => (u ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(urls));
}

export function buildSportsOrganizationJsonLd(options: {
  club: PublicClubRecord;
  canonicalUrl: string;
  origin: string;
  imageUrls: string[];
  description: string;
}): Record<string, unknown> {
  const c = options.club;
  const sameAs = sameAsUrls(c);
  const logo = toAbsoluteUrl(c.logo_url, options.origin) ?? options.imageUrls[0];
  const row: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": `${options.canonicalUrl}#organization`,
    name: c.name,
    url: options.canonicalUrl,
    description: options.description,
  };
  if (logo) row.logo = logo;
  if (options.imageUrls.length) row.image = options.imageUrls.slice(0, 4);
  const addr = (c.address ?? "").trim();
  if (addr) {
    row.address = {
      "@type": "PostalAddress",
      streetAddress: addr,
    };
  }
  const phone = (c.phone ?? "").trim();
  if (phone) row.telephone = phone;
  const email = (c.email ?? "").trim();
  if (email) row.email = email;
  if (sameAs.length) row.sameAs = sameAs;
  const lat = c.latitude;
  const lon = c.longitude;
  if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    row.geo = {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lon,
    };
  }
  return row;
}

export function buildNewsArticleJsonLd(options: {
  headline: string;
  url: string;
  description: string;
  imageUrl: string | null;
  datePublished: string | null;
  publisherName: string;
  publisherLogoUrl: string | null;
}): Record<string, unknown> {
  const publisher: Record<string, unknown> = {
    "@type": "Organization",
    name: options.publisherName,
  };
  if (options.publisherLogoUrl) {
    publisher.logo = { "@type": "ImageObject", url: options.publisherLogoUrl };
  }
  const article: Record<string, unknown> = {
    "@type": "NewsArticle",
    headline: options.headline,
    url: options.url,
    description: options.description,
    publisher,
  };
  if (options.imageUrl) article.image = [options.imageUrl];
  if (options.datePublished) article.datePublished = options.datePublished;
  return article;
}
