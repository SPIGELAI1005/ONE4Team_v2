import type { PublicPageSectionId } from "@/lib/club-public-page-sections";

export type PublicClubMicroRoute =
  | "home"
  | "news"
  | "teams"
  | "teamDetail"
  | "schedule"
  | "matches"
  | "events"
  | "documents"
  | "join"
  | "contact";

/** URL segment (no leading slash) for each micro page. */
export const PUBLIC_CLUB_ROUTE_SEGMENTS: Record<Exclude<PublicClubMicroRoute, "home" | "teamDetail">, string> = {
  news: "news",
  teams: "teams",
  schedule: "schedule",
  matches: "matches",
  events: "events",
  documents: "documents",
  join: "join",
  contact: "contact",
};

/** Which published `public_page_sections` key gates this route (`join` → `nextsteps`). */
export function microRouteRequiredSection(route: PublicClubMicroRoute): PublicPageSectionId | null {
  switch (route) {
    case "home":
      return null;
    case "news":
      return "news";
    case "teams":
    case "teamDetail":
      return "teams";
    case "schedule":
      return "schedule";
    case "matches":
      return "matches";
    case "events":
      return "events";
    case "documents":
      return "documents";
    case "join":
      return "nextsteps";
    case "contact":
      return "contact";
    default:
      return null;
  }
}

export function pathSegmentToMicroRoute(segment: string | undefined): PublicClubMicroRoute | null {
  if (!segment) return null;
  const entries = Object.entries(PUBLIC_CLUB_ROUTE_SEGMENTS) as [Exclude<PublicClubMicroRoute, "home" | "teamDetail">, string][];
  const hit = entries.find(([, v]) => v === segment);
  return hit ? hit[0] : null;
}
