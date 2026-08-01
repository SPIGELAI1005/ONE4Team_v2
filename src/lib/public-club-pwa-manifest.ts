import { publicClubSiteOrigin, toAbsoluteUrl } from "@/lib/public-club-seo";

export interface PublicClubManifestInput {
  name: string;
  slug: string;
  description?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
}

export interface PublicClubWebManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  display_override?: Array<"standalone" | "minimal-ui" | "browser">;
  orientation: "any";
  background_color: string;
  theme_color: string;
  lang: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed || "Club";
  return `${trimmed.slice(0, 11).trimEnd()}…`;
}

function iconType(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "image/png";
}

function isSvg(url: string): boolean {
  return (url.split("?")[0]?.toLowerCase() ?? "").endsWith(".svg");
}

/** Build a club-scoped web app manifest so home-screen install opens `/club/{slug}`. */
export function buildPublicClubWebManifest(
  input: PublicClubManifestInput,
  options?: { origin?: string; language?: string },
): PublicClubWebManifest {
  const origin = (options?.origin ?? publicClubSiteOrigin()).replace(/\/+$/, "");
  const slug = input.slug.trim().replace(/^\/+|\/+$/g, "");
  const basePath = `/club/${slug}`;
  const startUrl = `${origin}${basePath}/`;
  const scope = `${origin}${basePath}/`;
  const theme = (input.primaryColor || "#0b1220").trim() || "#0b1220";
  const name = input.name.trim() || "Club";

  const candidates = [input.faviconUrl, input.logoUrl, input.ogImageUrl]
    .map((value) => toAbsoluteUrl((value ?? "").trim() || null, origin))
    .filter((value): value is string => Boolean(value));

  const icons: PublicClubWebManifest["icons"] = [];
  for (const src of candidates) {
    if (isSvg(src)) {
      icons.push({ src, sizes: "any", type: "image/svg+xml", purpose: "any" });
      continue;
    }
    icons.push(
      { src, sizes: "192x192", type: iconType(src), purpose: "any" },
      { src, sizes: "512x512", type: iconType(src), purpose: "any" },
      { src, sizes: "180x180", type: iconType(src), purpose: "any" },
    );
    break;
  }

  if (icons.length === 0) {
    const fallback = `${origin}/favicon.png`;
    icons.push(
      { src: fallback, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: fallback, sizes: "512x512", type: "image/png", purpose: "any" },
    );
  }

  return {
    id: startUrl,
    name,
    short_name: shortName(name),
    description:
      (input.description || "").trim() ||
      `Official club page for ${name} on ONE4Team.`,
    start_url: startUrl,
    scope,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: theme,
    theme_color: theme,
    lang: options?.language === "de" ? "de" : "en",
    icons,
  };
}

const MANIFEST_LINK_ID = "one4team-club-manifest";

/** Attach/replace the club web manifest link (blob URL with absolute start_url/scope). */
export function applyPublicClubWebManifest(manifest: PublicClubWebManifest): () => void {
  if (typeof document === "undefined") return () => undefined;

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const objectUrl = URL.createObjectURL(blob);

  let link = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
  const previousHref = link?.getAttribute("href");
  if (!link) {
    link = document.createElement("link");
    link.id = MANIFEST_LINK_ID;
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = objectUrl;

  return () => {
    URL.revokeObjectURL(objectUrl);
    const current = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
    if (!current) return;
    if (previousHref && previousHref !== objectUrl) {
      current.href = previousHref;
    } else {
      current.remove();
    }
  };
}

export function isIosSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isAppleMobile = /iphone|ipad|ipod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOs;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}
