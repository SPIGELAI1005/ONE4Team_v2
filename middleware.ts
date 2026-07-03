const SOCIAL_BOT_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|Pinterest|Applebot/i;

export const config = {
  matcher: ["/club/:path*"],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!SOCIAL_BOT_UA.test(userAgent)) return undefined;

  const incoming = new URL(request.url);
  const preview = new URL("/api/club-social-preview", incoming.origin);
  preview.searchParams.set("path", incoming.pathname);

  return fetch(preview.toString(), {
    headers: {
      Accept: "text/html",
    },
  });
}
