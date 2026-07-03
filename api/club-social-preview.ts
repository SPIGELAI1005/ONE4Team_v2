import {
  buildClubSocialDescription,
  buildClubSocialPreviewHtml,
  buildClubSocialTitle,
  buildGenericSocialPreviewHtml,
  fetchPublicClubForSocialPreview,
  parseClubSlugFromPath,
  resolveAppleTouchIconUrl,
  resolveClubSocialImageUrl,
} from "./_lib/club-social-html.js";

export const config = {
  runtime: "edge",
};

function resolveSiteOrigin(request: Request): string {
  const fromEnv =
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    const normalized = fromEnv.replace(/\/+$/, "");
    return normalized.startsWith("http") ? normalized : `https://${normalized}`;
  }
  return new URL(request.url).origin;
}

function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export default async function handler(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get("path")?.trim() || "/club";
  const origin = resolveSiteOrigin(request);
  const canonicalUrl = `${origin}${path.startsWith("/") ? path : `/${path}`}`;

  const slug = parseClubSlugFromPath(path);
  if (!slug) {
    const html = buildGenericSocialPreviewHtml({ canonicalUrl, origin });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const cfg = supabaseConfig();
  if (!cfg) {
    const html = buildGenericSocialPreviewHtml({ canonicalUrl, origin });
    return new Response(html, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300",
      },
    });
  }

  const club = await fetchPublicClubForSocialPreview(slug, cfg.url, cfg.anonKey);
  if (!club) {
    const html = buildGenericSocialPreviewHtml({
      canonicalUrl,
      origin,
      title: "Club not found | ONE4Team",
      description: "This club page is not available.",
    });
    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=600",
      },
    });
  }

  const title = buildClubSocialTitle(club);
  const description = buildClubSocialDescription(
    club,
    `Official public club page for ${club.name}. Teams, schedule, matches, events and club information.`,
  );
  const imageUrl = resolveClubSocialImageUrl(club, origin);
  const appleTouchIconUrl = resolveAppleTouchIconUrl(club, origin);

  const html = buildClubSocialPreviewHtml({
    club,
    canonicalUrl,
    origin,
    title,
    description,
    imageUrl,
    appleTouchIconUrl,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
