import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getClubPageDraftConfig,
  parseClubPublicPageConfig,
} from "@/lib/club-public-page-config";
import {
  EMPTY_CLUB_EVENTS_FEED,
  normalizeClubEventsFeed,
  pickSavedEventsFeed,
  resolveEffectiveEventsFeed,
  type ClubEventsFeedConfig,
} from "@/lib/club-events-feed";

function extractFeedFromConfig(config: { eventsFeed?: ClubEventsFeedConfig | null } | null | undefined): ClubEventsFeedConfig | null {
  if (!config) return null;
  return config.eventsFeed ?? null;
}

export async function loadClubEventsFeed(
  supabase: SupabaseClient,
  clubId: string,
  club?: { name?: string | null; slug?: string | null } | null,
): Promise<{ data: ClubEventsFeedConfig; error: Error | null }> {
  const [{ data: row, error }, draftResult] = await Promise.all([
    supabase.from("clubs").select("name, slug, public_page_published_config").eq("id", clubId).maybeSingle(),
    getClubPageDraftConfig(supabase, clubId),
  ]);

  if (error) return { data: resolveEffectiveEventsFeed(null, club), error: new Error(error.message) };

  const clubMeta = club ?? { name: row?.name, slug: row?.slug };
  const published = parseClubPublicPageConfig(row?.public_page_published_config);
  const fromDraft = draftResult.error ? null : extractFeedFromConfig(draftResult.data);
  const fromPublished = extractFeedFromConfig(published);
  const picked = pickSavedEventsFeed(fromDraft, fromPublished);
  return { data: resolveEffectiveEventsFeed(picked, clubMeta), error: null };
}

export async function saveClubEventsFeed(
  supabase: SupabaseClient,
  clubId: string,
  feed: ClubEventsFeedConfig,
  _adminUserId: string | null,
): Promise<{ error: Error | null }> {
  const normalized: ClubEventsFeedConfig = {
    ...normalizeClubEventsFeed(feed),
    enabled: true,
  };

  const { data, error } = await supabase.rpc("patch_club_events_feed", {
    p_club_id: clubId,
    p_feed: normalized,
  });

  if (error) return { error: new Error(error.message) };
  if (data && typeof data === "object" && (data as { ok?: boolean }).ok !== true) {
    return { error: new Error("events_feed_save_failed") };
  }
  return { error: null };
}

export { EMPTY_CLUB_EVENTS_FEED };
