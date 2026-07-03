export interface ClubSocialPreviewRow {
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  hero_image_url: string | null;
  cover_image_url: string | null;
  is_public: boolean | null;
}

export const PUBLIC_CLUB_BRAND_TITLE_SUFFIX = " | ONE4Team";

const SOCIAL_BOT_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|Pinterest|Applebot/i;

export function isSocialPreviewBot(userAgent: string | null | undefined): boolean {
  return SOCIAL_BOT_UA.test(userAgent ?? "");
}

export function parseClubSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/club\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function toAbsoluteUrl(url: string | null | undefined, origin: string): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  const path = u.startsWith("/") ? u : `/${u}`;
  if (!origin) return path;
  return `${origin.replace(/\/+$/, "")}${path}`;
}

export function resolveClubSocialImageUrl(
  club: ClubSocialPreviewRow,
  origin: string,
  staticFallbackPath = "/favicon.png",
): string {
  const candidates = [
    club.og_image_url,
    club.hero_image_url,
    club.cover_image_url,
    club.logo_url,
  ];
  for (const candidate of candidates) {
    const abs = toAbsoluteUrl(candidate, origin);
    if (abs) return abs;
  }
  return toAbsoluteUrl(staticFallbackPath, origin) ?? staticFallbackPath;
}

export function resolveAppleTouchIconUrl(club: ClubSocialPreviewRow, origin: string): string | null {
  const candidates = [club.favicon_url, club.logo_url, club.og_image_url];
  for (const candidate of candidates) {
    const abs = toAbsoluteUrl(candidate, origin);
    if (!abs) continue;
    const lower = abs.split("?")[0]?.toLowerCase() ?? "";
    if (lower.endsWith(".svg")) continue;
    return abs;
  }
  return toAbsoluteUrl("/favicon.png", origin);
}

export function buildClubSocialTitle(club: ClubSocialPreviewRow): string {
  const meta = club.meta_title?.trim();
  if (meta) return meta;
  return `${club.name.trim()}${PUBLIC_CLUB_BRAND_TITLE_SUFFIX}`;
}

export function buildClubSocialDescription(
  club: ClubSocialPreviewRow,
  fallback: string,
): string {
  const meta = club.meta_description?.trim();
  if (meta) return meta.slice(0, 320);
  const desc = club.description?.trim();
  if (desc) return desc.slice(0, 320);
  return fallback.slice(0, 320);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildClubSocialPreviewHtml(input: {
  club: ClubSocialPreviewRow;
  canonicalUrl: string;
  origin: string;
  title: string;
  description: string;
  imageUrl: string;
  appleTouchIconUrl: string | null;
}): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const canonical = escapeHtml(input.canonicalUrl);
  const image = escapeHtml(input.imageUrl);
  const apple = input.appleTouchIconUrl ? escapeHtml(input.appleTouchIconUrl) : null;
  const clubName = escapeHtml(input.club.name.trim());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:site_name" content="ONE4Team" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="apple-mobile-web-app-title" content="${clubName}" />
  ${apple ? `<link rel="apple-touch-icon" href="${apple}" />` : ""}
  ${apple ? `<link rel="apple-touch-icon" sizes="180x180" href="${apple}" />` : ""}
</head>
<body>
  <p>${title}</p>
  <p><a href="${canonical}">${canonical}</a></p>
</body>
</html>`;
}

export function buildGenericSocialPreviewHtml(input: {
  canonicalUrl: string;
  origin: string;
  title?: string;
  description?: string;
}): string {
  const title = escapeHtml(input.title ?? "ONE4Team");
  const description = escapeHtml(
    input.description ?? "The complete operating system for hobby clubs",
  );
  const canonical = escapeHtml(input.canonicalUrl);
  const image = escapeHtml(toAbsoluteUrl("/favicon.png", input.origin) ?? "/favicon.png");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body><p>${title}</p></body>
</html>`;
}

export async function fetchPublicClubForSocialPreview(
  slug: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<ClubSocialPreviewRow | null> {
  const base = supabaseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    select:
      "name,slug,description,meta_title,meta_description,logo_url,favicon_url,og_image_url,hero_image_url,cover_image_url,is_public",
    slug: `eq.${slug}`,
    is_public: "eq.true",
    limit: "1",
  });

  const response = await fetch(`${base}/rest/v1/clubs?${params.toString()}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const rows = (await response.json()) as ClubSocialPreviewRow[];
  return rows[0] ?? null;
}
