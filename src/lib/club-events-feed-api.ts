import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clubRowToPublicPageConfig,
  getClubPageDraftConfig,
  parseClubPublicPageConfig,
  publicPageConfigToJson,
  saveClubPageDraftConfig,
  type ClubPublicPageConfig,
} from "@/lib/club-public-page-config";
import {
  EMPTY_CLUB_EVENTS_FEED,
  normalizeClubEventsFeed,
  resolveEffectiveEventsFeed,
  type ClubEventsFeedConfig,
} from "@/lib/club-events-feed";

function extractFeedFromConfig(config: ClubPublicPageConfig | null | undefined): ClubEventsFeedConfig | null {
  if (!config) return null;
  return config.eventsFeed ?? null;
}

export async function loadClubEventsFeed(
  supabase: SupabaseClient,
  clubId: string,
  club?: { name?: string | null; slug?: string | null } | null,
): Promise<{ data: ClubEventsFeedConfig; error: Error | null }> {
  const { data: row, error } = await supabase
    .from("clubs")
    .select("name, slug, public_page_published_config")
    .eq("id", clubId)
    .maybeSingle();
  if (error) return { data: resolveEffectiveEventsFeed(null, club), error: new Error(error.message) };

  const clubMeta = club ?? { name: row?.name, slug: row?.slug };
  const published = parseClubPublicPageConfig(row?.public_page_published_config);
  const fromPublished = extractFeedFromConfig(published);
  if (fromPublished != null) {
    return { data: resolveEffectiveEventsFeed(fromPublished, clubMeta), error: null };
  }

  const draft = await getClubPageDraftConfig(supabase, clubId);
  if (draft.error) return { data: resolveEffectiveEventsFeed(null, clubMeta), error: draft.error };
  const fromDraft = extractFeedFromConfig(draft.data);
  return { data: resolveEffectiveEventsFeed(fromDraft, clubMeta), error: null };
}

export async function saveClubEventsFeed(
  supabase: SupabaseClient,
  clubId: string,
  feed: ClubEventsFeedConfig,
  adminUserId: string | null,
): Promise<{ error: Error | null }> {
  const normalized: ClubEventsFeedConfig = {
    ...normalizeClubEventsFeed(feed),
    enabled: true,
  };

  const { data: row, error: loadError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();
  if (loadError) return { error: new Error(loadError.message) };
  if (!row) return { error: new Error("club_not_found") };

  const base = clubRowToPublicPageConfig(row as Record<string, unknown>);
  const draftResult = await getClubPageDraftConfig(supabase, clubId);
  const draftBase = draftResult.data ?? base;
  const nextDraft: ClubPublicPageConfig = { ...draftBase, eventsFeed: normalized };
  const draftSave = await saveClubPageDraftConfig(supabase, clubId, nextDraft, adminUserId);
  if (draftSave.error) return draftSave;

  const publishedBase = parseClubPublicPageConfig(row.public_page_published_config) ?? base;
  const nextPublished: ClubPublicPageConfig = { ...publishedBase, eventsFeed: normalized };
  const { error: pubError } = await supabase
    .from("clubs")
    .update({ public_page_published_config: publicPageConfigToJson(nextPublished) })
    .eq("id", clubId);
  if (pubError) return { error: new Error(pubError.message) };
  return { error: null };
}

export { EMPTY_CLUB_EVENTS_FEED };
