import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import defaultOgFallback from "@/assets/one4team-logo.png";
import {
  buildPublicClubDocumentTitle,
  buildPublicClubMetaDescription,
  buildSportsOrganizationJsonLd,
  parsePublicClubSeoPath,
  type PublicClubSeoRouteKind,
  publicClubShouldNoindex,
  publicClubSiteOrigin,
  PUBLIC_CLUB_BRAND_TITLE_SUFFIX,
  resolvePublicClubOgImageAbsolute,
  toAbsoluteUrl,
} from "@/lib/public-club-seo";

const SEO_MARK = "data-one4team-public-club-seo";
const FAV_MARK = "data-one4team-club-favicon";

interface HeadRestore {
  prevTitle: string;
  createdMeta: HTMLMetaElement[];
  createdLinks: HTMLLinkElement[];
  createdScripts: HTMLScriptElement[];
  touchedMeta: Map<HTMLMetaElement, string | null>;
  touchedLinks: Map<HTMLLinkElement, string | null>;
}

function getMetaBy(attr: "name" | "property", value: string): HTMLMetaElement | null {
  return document.head.querySelector(`meta[${attr}="${CSS.escape(value)}"]`);
}

function upsertMeta(attr: "name" | "property", key: string, content: string, state: HeadRestore) {
  const el = getMetaBy(attr, key);
  if (el) {
    if (!state.touchedMeta.has(el)) state.touchedMeta.set(el, el.getAttribute("content"));
    el.setAttribute(SEO_MARK, "borrowed");
    el.setAttribute("content", content);
  } else {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    m.setAttribute("content", content);
    m.setAttribute(SEO_MARK, "created");
    document.head.appendChild(m);
    state.createdMeta.push(m);
  }
}

function upsertCanonical(href: string, state: HeadRestore) {
  const el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (el) {
    if (!state.touchedLinks.has(el)) state.touchedLinks.set(el, el.getAttribute("href"));
    el.setAttribute(SEO_MARK, "borrowed");
    el.setAttribute("href", href);
  } else {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    l.setAttribute("href", href);
    l.setAttribute(SEO_MARK, "created");
    document.head.appendChild(l);
    state.createdLinks.push(l);
  }
}

function routeLabelForKind(
  kind: PublicClubSeoRouteKind,
  labels: {
    home: string;
    news: string;
    teams: string;
    schedule: string;
    matches: string;
    events: string;
    documents: string;
    join: string;
    contact: string;
  }
): string {
  switch (kind) {
    case "home":
      return labels.home;
    case "news":
    case "newsArticle":
      return labels.news;
    case "teams":
    case "teamDetail":
      return labels.teams;
    case "schedule":
      return labels.schedule;
    case "matches":
    case "matchDetail":
      return labels.matches;
    case "events":
    case "eventDetail":
      return labels.events;
    case "documents":
      return labels.documents;
    case "join":
      return labels.join;
    case "contact":
      return labels.contact;
    default:
      return labels.home;
  }
}

function restoreHead(state: HeadRestore) {
  for (const m of state.createdMeta) m.remove();
  for (const [m, prev] of state.touchedMeta) {
    if (m.getAttribute(SEO_MARK) === "borrowed") {
      if (prev == null) m.removeAttribute("content");
      else m.setAttribute("content", prev);
    }
    m.removeAttribute(SEO_MARK);
  }
  for (const l of state.createdLinks) l.remove();
  for (const [l, prev] of state.touchedLinks) {
    if (l.getAttribute(SEO_MARK) === "borrowed") {
      if (prev == null) l.removeAttribute("href");
      else l.setAttribute("href", prev);
    }
    l.removeAttribute(SEO_MARK);
  }
  for (const s of state.createdScripts) s.remove();
  document.title = state.prevTitle;
}

export function PublicClubDocumentHead() {
  const { pathname } = useLocation();
  const { club, basePath, loading, isPreviewMode, isDraftPreviewMode, draftPreviewBlocked } = usePublicClub();
  const { extras } = usePublicClubRouteSeo();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (loading) return;

    const state: HeadRestore = {
      prevTitle: document.title,
      createdMeta: [],
      createdLinks: [],
      createdScripts: [],
      touchedMeta: new Map(),
      touchedLinks: new Map(),
    };

    const origin = publicClubSiteOrigin();
    const cp = t.clubPage;
    const pathOnly = pathname.split("?")[0];
    const canonicalUrl = origin ? `${origin}${pathOnly}` : pathOnly;
    const defaultDesc = cp.seoMetaDescriptionFallback.replace("{{name}}", club?.name?.trim() || "Club");

    const labels = {
      home: t.common.home,
      news: cp.newsSection,
      teams: cp.teamsSection,
      schedule: cp.scheduleSection,
      matches: cp.matchesSection,
      events: cp.eventsSection,
      documents: cp.documentsSection,
      join: cp.joinNav,
      contact: cp.contactSection,
    };

    if (!club) {
      document.title = `${cp.clubNotFound}${PUBLIC_CLUB_BRAND_TITLE_SUFFIX}`;
      const fallbackUrl = typeof defaultOgFallback === "string" ? defaultOgFallback : "";
      const ogFallback =
        toAbsoluteUrl(fallbackUrl, origin) || (origin ? `${origin}/favicon.png` : "/favicon.png");
      upsertMeta("name", "robots", "noindex, nofollow", state);
      upsertMeta("name", "description", cp.clubPageNotAvailableDesc, state);
      upsertMeta("property", "og:title", document.title, state);
      upsertMeta("property", "og:description", cp.clubPageNotAvailableDesc, state);
      upsertMeta("property", "og:type", "website", state);
      upsertMeta("property", "og:url", canonicalUrl, state);
      upsertMeta("property", "og:image", ogFallback, state);
      upsertMeta("name", "twitter:card", "summary_large_image", state);
      upsertMeta("name", "twitter:title", document.title, state);
      upsertMeta("name", "twitter:description", cp.clubPageNotAvailableDesc, state);
      upsertMeta("name", "twitter:image", ogFallback, state);
      upsertCanonical(canonicalUrl, state);
      return () => restoreHead(state);
    }

    const noindex = publicClubShouldNoindex({
      club,
      isPreviewMode,
      isDraftPreviewMode,
      draftPreviewBlocked,
    });

    const parsed = parsePublicClubSeoPath(basePath, pathname);
    const routeLabel = routeLabelForKind(parsed.kind, labels);
    const title = buildPublicClubDocumentTitle({
      club,
      routeKind: parsed.kind,
      routeLabel,
      extrasTitle: extras.title,
    });

    const description = buildPublicClubMetaDescription({
      club,
      defaultFallback: defaultDesc,
      extrasDescription: extras.description,
    });

    const baseHomePath = basePath.replace(/\/$/, "") || basePath;
    const orgCanonical = origin ? `${origin}${baseHomePath}` : baseHomePath;

    const fallbackUrl = typeof defaultOgFallback === "string" ? defaultOgFallback : "";

    const ogImage = resolvePublicClubOgImageAbsolute({
      ogImageUrl: extras.ogImageUrl?.trim() || club.og_image_url,
      heroImageUrl: club.hero_image_url,
      coverImageUrl: club.cover_image_url,
      clubLogoUrl: club.logo_url,
      origin,
      staticFallbackUrl: fallbackUrl,
    });

    const ogImageOrg = resolvePublicClubOgImageAbsolute({
      ogImageUrl: club.og_image_url,
      heroImageUrl: club.hero_image_url,
      coverImageUrl: club.cover_image_url,
      clubLogoUrl: club.logo_url,
      origin,
      staticFallbackUrl: fallbackUrl,
    });

    document.title = title;

    upsertMeta("name", "description", description, state);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow", state);

    upsertMeta("property", "og:title", title, state);
    upsertMeta("property", "og:description", description, state);
    upsertMeta("property", "og:type", extras.ogType === "article" ? "article" : "website", state);
    upsertMeta("property", "og:url", canonicalUrl, state);
    upsertMeta("property", "og:image", ogImage, state);
    upsertMeta("property", "og:site_name", "ONE4Team", state);

    upsertMeta("name", "twitter:card", "summary_large_image", state);
    upsertMeta("name", "twitter:title", title, state);
    upsertMeta("name", "twitter:description", description, state);
    upsertMeta("name", "twitter:image", ogImage, state);

    upsertCanonical(canonicalUrl, state);

    const fav = club.favicon_url?.trim();
    if (fav) {
      const abs = toAbsoluteUrl(fav, origin);
      if (abs) {
        const l = document.createElement("link");
        l.setAttribute("rel", "icon");
        l.setAttribute(FAV_MARK, "1");
        l.setAttribute("href", abs);
        document.head.appendChild(l);
        state.createdLinks.push(l);
      }
    }

    const allowJsonLd = !noindex && club.seoStructuredDataEnabled;
    if (allowJsonLd) {
      const orgNode = buildSportsOrganizationJsonLd({
        club,
        canonicalUrl: orgCanonical,
        origin,
        imageUrls: [ogImageOrg, ogImage].filter(Boolean) as string[],
        description,
      });
      const extraNodes = extras.structuredDataNodes?.filter(Boolean) ?? [];
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(SEO_MARK, "created");
      script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": [orgNode, ...extraNodes] });
      document.head.appendChild(script);
      state.createdScripts.push(script);
    }

    return () => restoreHead(state);
  }, [
    basePath,
    club,
    draftPreviewBlocked,
    extras.description,
    extras.ogImageUrl,
    extras.ogType,
    extras.structuredDataNodes,
    extras.title,
    isDraftPreviewMode,
    isPreviewMode,
    language,
    loading,
    pathname,
    t.clubPage,
    t.common.home,
  ]);

  return null;
}
