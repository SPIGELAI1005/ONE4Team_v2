import { CLUB_FOOTBALL_CAMP_TEMPLATES } from "@/lib/club-football-camp-templates";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import type { EventRowLite } from "@/lib/public-club-models";
import { SOMMERFEST_FEED, SOMMERFEST_LOCATION, SOMMERFEST_POSTER_PATH } from "@/lib/tsv-allach-sommerfest-2026";

const SHOWCASE_EVENT_PREFIX = "tsv-showcase-event-";

export type PublicClubEventLanguage = "de" | "en";

function showcaseEventId(key: string): string {
  return `${SHOWCASE_EVENT_PREFIX}${key}`;
}

export const TSV_ALLACH_SOMMERFEST_SHOWCASE_EVENT_KEY = "sommerfest-2026";

export function isTsvAllachSommerfestShowcaseEventId(id: string): boolean {
  return id === showcaseEventId(TSV_ALLACH_SOMMERFEST_SHOWCASE_EVENT_KEY);
}

export function isTsvAllachShowcaseEventId(id: string): boolean {
  return id.startsWith(SHOWCASE_EVENT_PREFIX);
}

function eventDedupeKey(event: Pick<EventRowLite, "starts_at" | "title">): string {
  return `${event.starts_at.slice(0, 10)}|${event.title.trim().toLowerCase()}`;
}

function campToEvent(
  camp: (typeof CLUB_FOOTBALL_CAMP_TEMPLATES)[number],
  lang: PublicClubEventLanguage
): EventRowLite {
  return {
    id: showcaseEventId(camp.importKey),
    title: lang === "de" ? camp.titleDe : camp.titleEn,
    event_type: "camp",
    starts_at: camp.startsAt,
    ends_at: camp.endsAt,
    location: camp.location,
    publish_to_public_schedule: true,
    image_url: camp.imagePath,
    public_summary: lang === "de" ? camp.publicSummaryDe : camp.publicSummaryEn,
    public_registration_enabled: true,
    registration_external_url: camp.registrationUrl,
    public_event_detail_enabled: true,
  };
}

function sommerfestToEvent(lang: PublicClubEventLanguage): EventRowLite | null {
  const feed = SOMMERFEST_FEED.find((f) => f.id === "feed-open");
  if (!feed) return null;
  const summary = lang === "de" ? feed.summaryDe : feed.summaryEn;
  const body = lang === "de" ? feed.bodyDe : feed.bodyEn;
  return {
    id: showcaseEventId(TSV_ALLACH_SOMMERFEST_SHOWCASE_EVENT_KEY),
    title: lang === "de" ? feed.titleDe : feed.titleEn,
    event_type: "festival",
    starts_at: "2026-07-11T11:00:00+02:00",
    ends_at: "2026-07-11T23:00:00+02:00",
    location: SOMMERFEST_LOCATION,
    publish_to_public_schedule: true,
    image_url: SOMMERFEST_POSTER_PATH,
    public_summary: summary?.trim() || body?.trim() || null,
    public_registration_enabled: false,
    registration_external_url: null,
    public_event_detail_enabled: true,
  };
}

/** Pilot showcase events for TSV Allach 09 (Sommerfest + football camps). */
export function getTsvAllachShowcaseEvents(lang: PublicClubEventLanguage): EventRowLite[] {
  const items: EventRowLite[] = [];
  const fest = sommerfestToEvent(lang);
  if (fest) items.push(fest);
  for (const camp of CLUB_FOOTBALL_CAMP_TEMPLATES) {
    items.push(campToEvent(camp, lang));
  }
  return items.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function findTsvAllachShowcaseEventById(
  id: string,
  lang: PublicClubEventLanguage
): EventRowLite | undefined {
  if (!isTsvAllachShowcaseEventId(id)) return undefined;
  return getTsvAllachShowcaseEvents(lang).find((e) => e.id === id);
}

/** Merge DB events with TSV Allach pilot showcase events (deduped, chronological). */
export function mergePublicClubEvents(
  club: { name?: string | null; slug?: string | null } | null | undefined,
  dbRows: EventRowLite[],
  lang: PublicClubEventLanguage
): EventRowLite[] {
  if (!isTsvAllachClub(club)) return dbRows;

  const dbKeys = new Set(dbRows.map(eventDedupeKey));
  const showcase = getTsvAllachShowcaseEvents(lang).filter((e) => !dbKeys.has(eventDedupeKey(e)));

  const seen = new Set<string>();
  const merged: EventRowLite[] = [];
  for (const row of [...dbRows, ...showcase]) {
    const key = eventDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
