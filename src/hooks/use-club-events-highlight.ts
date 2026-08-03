import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveClub } from "@/hooks/use-active-club";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_CLUB_EVENTS_HIGHLIGHT, type ClubEventsHighlightConfig } from "@/lib/club-events-highlight";
import { loadClubEventsHighlight } from "@/lib/club-events-highlight-api";

/** Shared hero highlight for `/events` and `/matches` (same draft + published source). */
export function useClubEventsHighlight(clubId: string | null | undefined) {
  const { activeClub } = useActiveClub();
  const location = useLocation();
  const [eventsHighlight, setEventsHighlight] = useState<ClubEventsHighlightConfig>({ ...EMPTY_CLUB_EVENTS_HIGHLIGHT });
  const [highlightLoading, setHighlightLoading] = useState(false);

  const reloadHighlight = useCallback(async () => {
    if (!clubId) {
      setEventsHighlight({ ...EMPTY_CLUB_EVENTS_HIGHLIGHT });
      return;
    }
    setHighlightLoading(true);
    const { data, error } = await loadClubEventsHighlight(supabase, clubId, activeClub);
    if (!error) setEventsHighlight(data);
    setHighlightLoading(false);
  }, [clubId, activeClub]);

  useEffect(() => {
    if (!clubId) {
      setEventsHighlight({ ...EMPTY_CLUB_EVENTS_HIGHLIGHT });
      return;
    }
    void reloadHighlight();
  }, [clubId, location.pathname, reloadHighlight]);

  function handleHighlightSaved(next: ClubEventsHighlightConfig) {
    setEventsHighlight(next);
  }

  return {
    eventsHighlight,
    setEventsHighlight,
    reloadHighlight,
    highlightLoading,
    handleHighlightSaved,
  };
}
