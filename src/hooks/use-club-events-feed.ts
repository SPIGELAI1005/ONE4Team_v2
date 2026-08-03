import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveClub } from "@/hooks/use-active-club";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_CLUB_EVENTS_FEED, type ClubEventsFeedConfig } from "@/lib/club-events-feed";
import { loadClubEventsFeed } from "@/lib/club-events-feed-api";

/** Shared events timeline feed for `/events` and `/matches` (same draft + published source). */
export function useClubEventsFeed(clubId: string | null | undefined) {
  const { activeClub } = useActiveClub();
  const location = useLocation();
  const [eventsFeed, setEventsFeed] = useState<ClubEventsFeedConfig>({ ...EMPTY_CLUB_EVENTS_FEED });
  const [feedLoading, setFeedLoading] = useState(false);

  const reloadFeed = useCallback(async () => {
    if (!clubId) {
      setEventsFeed({ ...EMPTY_CLUB_EVENTS_FEED });
      return;
    }
    setFeedLoading(true);
    const { data, error } = await loadClubEventsFeed(supabase, clubId, activeClub);
    if (!error) setEventsFeed(data);
    setFeedLoading(false);
  }, [clubId, activeClub]);

  useEffect(() => {
    if (!clubId) {
      setEventsFeed({ ...EMPTY_CLUB_EVENTS_FEED });
      return;
    }
    void reloadFeed();
  }, [clubId, location.pathname, reloadFeed]);

  function handleFeedSaved(next: ClubEventsFeedConfig) {
    setEventsFeed({ ...next, enabled: true });
  }

  return {
    eventsFeed,
    setEventsFeed,
    reloadFeed,
    feedLoading,
    handleFeedSaved,
  };
}
