import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { SOMMERFEST_LOCATION } from "@/lib/tsv-allach-sommerfest-2026";

/** Dashboard /events + /matches highlight strip (poster + copy). */
export interface ClubEventsHighlightConfig {
  enabled: boolean;
  /** Poster image URL (storage public URL or static path). */
  imageUrl: string;
  badge: string;
  title: string;
  eventsLead: string;
  matchesLead: string;
  location: string;
  posterAlt: string;
}

export const DEFAULT_EVENTS_HIGHLIGHT_IMAGE = "/images/sommerfest/poster-day.png";

export const EMPTY_CLUB_EVENTS_HIGHLIGHT: ClubEventsHighlightConfig = {
  enabled: false,
  imageUrl: "",
  badge: "",
  title: "",
  eventsLead: "",
  matchesLead: "",
  location: "",
  posterAlt: "",
};

/** Historical Allach Sommerfest defaults when no saved highlight exists yet. */
export function defaultSommerfestEventsHighlight(): ClubEventsHighlightConfig {
  return {
    enabled: true,
    imageUrl: DEFAULT_EVENTS_HIGHLIGHT_IMAGE,
    badge: "",
    title: "",
    eventsLead: "",
    matchesLead: "",
    location: SOMMERFEST_LOCATION,
    posterAlt: "",
  };
}

export function normalizeClubEventsHighlight(raw: unknown): ClubEventsHighlightConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_CLUB_EVENTS_HIGHLIGHT };
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled === true,
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl.trim() : "",
    badge: typeof o.badge === "string" ? o.badge.trim() : "",
    title: typeof o.title === "string" ? o.title.trim() : "",
    eventsLead: typeof o.eventsLead === "string" ? o.eventsLead.trim() : "",
    matchesLead: typeof o.matchesLead === "string" ? o.matchesLead.trim() : "",
    location: typeof o.location === "string" ? o.location.trim() : "",
    posterAlt: typeof o.posterAlt === "string" ? o.posterAlt.trim() : "",
  };
}

/**
 * Effective highlight for dashboard rendering.
 * Allach clubs without a saved config keep the historical Sommerfest strip on by default.
 */
export function resolveEffectiveEventsHighlight(
  eventsHighlight: ClubEventsHighlightConfig | null | undefined,
  club?: { name?: string | null; slug?: string | null } | null,
): ClubEventsHighlightConfig {
  if (eventsHighlight != null) return normalizeClubEventsHighlight(eventsHighlight);
  if (isTsvAllachClub(club)) return defaultSommerfestEventsHighlight();
  return { ...EMPTY_CLUB_EVENTS_HIGHLIGHT };
}
