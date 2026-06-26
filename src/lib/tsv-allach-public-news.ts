import { CLUB_FOOTBALL_CAMP_TEMPLATES } from "@/lib/club-football-camp-templates";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import type { NewsRowLite } from "@/lib/public-club-models";
import { SOMMERFEST_FEED, SOMMERFEST_POSTER_PATH } from "@/lib/tsv-allach-sommerfest-2026";

const SHOWCASE_ID_PREFIX = "tsv-showcase-";

/** TSV Allach 09 only: poster for the BFV heat-warning training cancellation post. */
export const TSV_ALLACH_TRAINING_CANCELLED_HEAT_IMAGE = "/images/news/tsv-allach-training-cancelled-heat-2026.png";

export type PublicClubNewsLanguage = "de" | "en";

function showcaseId(key: string): string {
  return `${SHOWCASE_ID_PREFIX}${key}`;
}

export function isTsvAllachShowcaseNewsId(id: string): boolean {
  return id.startsWith(SHOWCASE_ID_PREFIX);
}

function feedItemToNews(
  item: (typeof SOMMERFEST_FEED)[number],
  lang: PublicClubNewsLanguage,
  createdAt: string,
  category: string,
  imageUrl?: string | null
): NewsRowLite {
  const title = lang === "de" ? item.titleDe : item.titleEn;
  const summary = lang === "de" ? item.summaryDe : item.summaryEn;
  const body = lang === "de" ? item.bodyDe : item.bodyEn;
  const content = body?.trim() || summary?.trim() || title;
  return {
    id: showcaseId(item.id),
    title,
    content,
    created_at: createdAt,
    priority: item.kind === "news" ? "high" : "normal",
    publish_to_public_website: true,
    public_news_category: category,
    image_url: imageUrl ?? null,
    excerpt: summary?.trim() || null,
  };
}

function campToNews(
  camp: (typeof CLUB_FOOTBALL_CAMP_TEMPLATES)[number],
  lang: PublicClubNewsLanguage
): NewsRowLite {
  const title = lang === "de" ? camp.titleDe : camp.titleEn;
  const description = lang === "de" ? camp.descriptionDe : camp.descriptionEn;
  const excerpt = lang === "de" ? camp.publicSummaryDe : camp.publicSummaryEn;
  const highlights = lang === "de" ? camp.highlightsDe : camp.highlightsEn;
  const highlightBlock = highlights.length ? `\n\n${highlights.map((h) => `· ${h}`).join("\n")}` : "";
  const registration =
    lang === "de"
      ? `\n\nAnmeldung: ${camp.registrationUrl}\nKontakt: ${camp.contactEmail}`
      : `\n\nRegistration: ${camp.registrationUrl}\nContact: ${camp.contactEmail}`;

  return {
    id: showcaseId(camp.importKey),
    title,
    content: `${description}${highlightBlock}${registration}`,
    created_at: camp.startsAt,
    priority: "normal",
    publish_to_public_website: true,
    public_news_category: "events",
    image_url: camp.imagePath,
    excerpt,
  };
}

/** Pilot showcase posts for TSV Allach 09 when the announcements table has no public rows yet. */
export function getTsvAllachShowcaseNews(lang: PublicClubNewsLanguage): NewsRowLite[] {
  const heatItem = SOMMERFEST_FEED.find((f) => f.id === "feed-news-heat");
  const festivalItem = SOMMERFEST_FEED.find((f) => f.id === "feed-open");

  const items: NewsRowLite[] = [];

  if (heatItem) {
    items.push(
      feedItemToNews(heatItem, lang, "2026-06-20T08:30:00+02:00", "youth", TSV_ALLACH_TRAINING_CANCELLED_HEAT_IMAGE)
    );
  }
  if (festivalItem) {
    items.push(feedItemToNews(festivalItem, lang, "2026-06-01T11:00:00+02:00", "events", SOMMERFEST_POSTER_PATH));
  }

  for (const camp of CLUB_FOOTBALL_CAMP_TEMPLATES) {
    items.push(campToNews(camp, lang));
  }

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function findTsvAllachShowcaseNewsById(
  id: string,
  lang: PublicClubNewsLanguage
): NewsRowLite | undefined {
  if (!isTsvAllachShowcaseNewsId(id)) return undefined;
  return getTsvAllachShowcaseNews(lang).find((n) => n.id === id);
}

/** Merge DB announcements with TSV Allach pilot showcase posts (deduped by id, newest first). */
export function mergePublicClubNews(
  club: { name?: string | null; slug?: string | null } | null | undefined,
  dbRows: NewsRowLite[],
  lang: PublicClubNewsLanguage
): NewsRowLite[] {
  if (!isTsvAllachClub(club)) return dbRows;

  const showcase = getTsvAllachShowcaseNews(lang);
  const seen = new Set<string>();
  const merged: NewsRowLite[] = [];

  for (const row of [...showcase, ...dbRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }

  return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
