import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import {
  SOMMERFEST_DATE,
  SOMMERFEST_FEED,
  type SommerfestFeedItem,
} from "@/lib/tsv-allach-sommerfest-2026";

export type ClubEventsFeedItemKind = SommerfestFeedItem["kind"];
export type ClubEventsFeedAccent = SommerfestFeedItem["accent"];

/** Persisted club events timeline item (bilingual). */
export interface ClubEventsFeedItem {
  id: string;
  kind: ClubEventsFeedItemKind;
  date: string;
  time: string;
  endTime?: string;
  effectiveUntil?: string;
  titleDe: string;
  titleEn: string;
  summaryDe?: string;
  summaryEn?: string;
  bodyDe?: string;
  bodyEn?: string;
  pitchLabel?: string;
  teamScope?: string | null;
  authorDe?: string;
  authorEn?: string;
  accent: ClubEventsFeedAccent;
}

export interface ClubEventsFeedConfig {
  enabled: boolean;
  festivalDate: string;
  dayProgram: string;
  dayProgramEn: string;
  eveningProgram: string;
  eveningProgramEn: string;
  items: ClubEventsFeedItem[];
}

export const EMPTY_CLUB_EVENTS_FEED: ClubEventsFeedConfig = {
  enabled: false,
  festivalDate: "",
  dayProgram: "",
  dayProgramEn: "",
  eveningProgram: "",
  eveningProgramEn: "",
  items: [],
};

const FEED_KINDS = new Set<ClubEventsFeedItemKind>([
  "festival",
  "tournament",
  "news",
  "evening",
  "pitch_booking",
  "club_wide",
]);

const FEED_ACCENTS = new Set<ClubEventsFeedAccent>(["green", "yellow", "pink", "neutral", "rose"]);

function asIsoDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeFeedItem(raw: unknown): ClubEventsFeedItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const kind = typeof o.kind === "string" && FEED_KINDS.has(o.kind as ClubEventsFeedItemKind)
    ? (o.kind as ClubEventsFeedItemKind)
    : "club_wide";
  const date = asIsoDate(o.date);
  const time = typeof o.time === "string" ? o.time.trim() : "";
  const titleDe = typeof o.titleDe === "string" ? o.titleDe.trim() : "";
  const titleEn = typeof o.titleEn === "string" ? o.titleEn.trim() : "";
  if (!id || !date || !time || (!titleDe && !titleEn)) return null;
  const accent =
    typeof o.accent === "string" && FEED_ACCENTS.has(o.accent as ClubEventsFeedAccent)
      ? (o.accent as ClubEventsFeedAccent)
      : "neutral";
  return {
    id,
    kind,
    date,
    time,
    endTime: typeof o.endTime === "string" && o.endTime.trim() ? o.endTime.trim() : undefined,
    effectiveUntil: asIsoDate(o.effectiveUntil) || undefined,
    titleDe,
    titleEn,
    summaryDe: typeof o.summaryDe === "string" ? o.summaryDe.trim() : undefined,
    summaryEn: typeof o.summaryEn === "string" ? o.summaryEn.trim() : undefined,
    bodyDe: typeof o.bodyDe === "string" ? o.bodyDe.trim() : undefined,
    bodyEn: typeof o.bodyEn === "string" ? o.bodyEn.trim() : undefined,
    pitchLabel: typeof o.pitchLabel === "string" ? o.pitchLabel.trim() : undefined,
    teamScope:
      o.teamScope === null
        ? null
        : typeof o.teamScope === "string"
          ? o.teamScope.trim() || null
          : undefined,
    authorDe: typeof o.authorDe === "string" ? o.authorDe.trim() : undefined,
    authorEn: typeof o.authorEn === "string" ? o.authorEn.trim() : undefined,
    accent,
  };
}

export function normalizeClubEventsFeed(raw: unknown): ClubEventsFeedConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_CLUB_EVENTS_FEED };
  }
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items.map(normalizeFeedItem).filter((item): item is ClubEventsFeedItem => item != null)
    : [];
  return {
    enabled: o.enabled === true,
    festivalDate: asIsoDate(o.festivalDate),
    dayProgram: typeof o.dayProgram === "string" ? o.dayProgram.trim() : "",
    dayProgramEn: typeof o.dayProgramEn === "string" ? o.dayProgramEn.trim() : "",
    eveningProgram: typeof o.eveningProgram === "string" ? o.eveningProgram.trim() : "",
    eveningProgramEn: typeof o.eveningProgramEn === "string" ? o.eveningProgramEn.trim() : "",
    items,
  };
}

export function feedItemFromSommerfest(item: SommerfestFeedItem): ClubEventsFeedItem {
  return {
    id: item.id,
    kind: item.kind,
    date: item.date,
    time: item.time,
    endTime: item.endTime,
    effectiveUntil: item.effectiveUntil,
    titleDe: item.titleDe,
    titleEn: item.titleEn,
    summaryDe: item.summaryDe,
    summaryEn: item.summaryEn,
    bodyDe: item.bodyDe,
    bodyEn: item.bodyEn,
    pitchLabel: item.pitchLabel,
    teamScope: item.teamScope ?? null,
    authorDe: item.authorDe,
    authorEn: item.authorEn,
    accent: item.accent,
  };
}

export function defaultSommerfestEventsFeed(): ClubEventsFeedConfig {
  return {
    enabled: true,
    festivalDate: SOMMERFEST_DATE,
    dayProgram: "Tagsüber ab 11:00",
    dayProgramEn: "Daytime from 11:00",
    eveningProgram: "Sommerglühen ab 19:00",
    eveningProgramEn: "Summer Glow from 19:00",
    items: SOMMERFEST_FEED.map(feedItemFromSommerfest),
  };
}

export function resolveEffectiveEventsFeed(
  feed: ClubEventsFeedConfig | null | undefined,
  club?: { name?: string | null; slug?: string | null } | null,
): ClubEventsFeedConfig {
  const normalized = feed != null ? normalizeClubEventsFeed(feed) : null;
  if (normalized?.enabled && normalized.items.length > 0) return normalized;
  if (isTsvAllachClub(club)) return defaultSommerfestEventsFeed();
  return { ...EMPTY_CLUB_EVENTS_FEED };
}

/** Prefer draft feed over published so trainer saves show before full page publish. */
export function pickSavedEventsFeed(
  draftFeed: ClubEventsFeedConfig | null | undefined,
  publishedFeed: ClubEventsFeedConfig | null | undefined,
): ClubEventsFeedConfig | null {
  const draft = draftFeed != null ? normalizeClubEventsFeed(draftFeed) : null;
  const published = publishedFeed != null ? normalizeClubEventsFeed(publishedFeed) : null;
  if (draft?.enabled && draft.items.length > 0) return draft;
  if (published?.enabled && published.items.length > 0) return published;
  return null;
}

export function clubFeedItemsSorted(config: ClubEventsFeedConfig): ClubEventsFeedItem[] {
  return [...config.items].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    if (a.kind === "news" && b.kind !== "news") return -1;
    if (b.kind === "news" && a.kind !== "news") return 1;
    return a.time.localeCompare(b.time);
  });
}

export function sommerfestItemFromClubFeed(item: ClubEventsFeedItem): SommerfestFeedItem {
  return {
    id: item.id,
    kind: item.kind,
    date: item.date,
    time: item.time,
    endTime: item.endTime,
    effectiveUntil: item.effectiveUntil,
    titleDe: item.titleDe,
    titleEn: item.titleEn,
    summaryDe: item.summaryDe,
    summaryEn: item.summaryEn,
    bodyDe: item.bodyDe,
    bodyEn: item.bodyEn,
    pitchLabel: item.pitchLabel,
    teamScope: item.teamScope ?? null,
    authorDe: item.authorDe,
    authorEn: item.authorEn,
    accent: item.accent,
  };
}
