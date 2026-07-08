import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import { PublicSommerfestTournamentBoard } from "@/components/sommerfest/public-sommerfest-tournament-board";
import { SommerfestHero } from "@/components/sommerfest/sommerfest-hero";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { publicClubSectionContainer } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import {
  buildSommerfestTournamentSlots,
  SOMMERFEST_COMPETITION_NAME,
  SOMMERFEST_TOURNAMENT_SLUG,
  publicTournamentPath,
  type SommerfestDbMatchRow,
} from "@/lib/tsv-allach-sommerfest-competition";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { isSommerfestTournamentInProgress, hasSommerfestLiveMatches } from "@/lib/sommerfest-live-pulse";
import { publicMatchStatusBadge } from "@/lib/public-club-match-display";
import { trackUsageEvent } from "@/lib/usage-events";

const REFRESH_MS = 20_000;

export default function PublicClubTournamentPage() {
  const { t } = useLanguage();
  const { tournamentSlug = "" } = useParams();
  const { club, teams, basePath, searchSuffix, loadingData } = usePublicClub();
  const { setExtras } = usePublicClubRouteSeo();
  const [matches, setMatches] = useState<SommerfestDbMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSommerfestRoute = tournamentSlug === SOMMERFEST_TOURNAMENT_SLUG;
  const showBoard = Boolean(club && isTsvAllachClub(club) && isSommerfestRoute);
  const trackedTournamentRef = useRef(false);

  useEffect(() => {
    if (!club?.id || !showBoard || trackedTournamentRef.current) return;
    trackedTournamentRef.current = true;
    trackUsageEvent({
      eventName: "tournament_opened",
      clubId: club.id,
      route: `${basePath}/tournament/${tournamentSlug}`,
      metadata: { tournament_slug: tournamentSlug },
    });
  }, [basePath, club?.id, showBoard, tournamentSlug]);

  const loadMatches = useCallback(async () => {
    if (!club?.id || !showBoard) return;
    const { data, error: fetchError } = await supabase
      .from("matches")
      .select(
        "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, publish_to_public_schedule, public_match_detail_enabled, competitions(name), teams(name)",
      )
      .eq("club_id", club.id)
      .like("notes", "tsv-sommerfest-2026:%")
      .order("match_date", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setMatches((data as SommerfestDbMatchRow[]) ?? []);
    setError(null);
  }, [club?.id, showBoard]);

  useEffect(() => {
    if (!showBoard) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await loadMatches();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMatches, showBoard]);

  useEffect(() => {
    if (!showBoard) return;
    const timer = window.setInterval(() => {
      void loadMatches();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadMatches, showBoard]);

  useEffect(() => {
    if (!club || !showBoard) {
      setExtras(null);
      return;
    }
    setExtras({
      title: `${SOMMERFEST_COMPETITION_NAME} · ${club.name}`,
      description: t.sommerfest2026.tournamentPageDescription,
      ogImageUrl: "/images/sommerfest/poster-2026.png",
    });
    return () => setExtras(null);
  }, [club, setExtras, showBoard, t.sommerfest2026.tournamentPageDescription]);

  const eventsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.events}${searchSuffix}`;
  const matchesHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${searchSuffix}`;
  const homeHref = `${basePath}${searchSuffix}`;
  const tournamentSharePath = publicTournamentPath(basePath, searchSuffix);

  const tournamentIsLive = useMemo(() => {
    if (matches.length === 0) return false;
    if (hasSommerfestLiveMatches(matches)) return true;
    const slots = buildSommerfestTournamentSlots(matches);
    let finished = 0;
    for (const slot of slots) {
      const badge = slot.match ? publicMatchStatusBadge(slot.match.status) : "upcoming";
      if (badge === "finished") finished++;
    }
    return isSommerfestTournamentInProgress(finished, slots.length);
  }, [matches]);

  return (
    <PublicClubPageGate section="matches">
      <section className="border-t border-[color:var(--club-border)]/80 py-5 sm:py-12">
        <div className={`${publicClubSectionContainer} space-y-4 sm:space-y-6`}>
          <SommerfestHero
            variant="matches"
            shareUrl={showBoard ? tournamentSharePath : undefined}
            isLive={showBoard && tournamentIsLive}
          />

          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-0.5 text-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            <Link
              to={homeHref}
              className="inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 font-medium text-[color:var(--club-primary)] active:underline sm:min-h-0"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.common.home}
            </Link>
            <Link
              to={eventsHref}
              className="inline-flex min-h-10 shrink-0 snap-start items-center text-[color:var(--club-muted)] active:text-[color:var(--club-foreground)] sm:min-h-0"
            >
              {t.sommerfest2026.backToEvent}
            </Link>
            <Link
              to={matchesHref}
              className="inline-flex min-h-10 shrink-0 snap-start items-center text-[color:var(--club-muted)] active:text-[color:var(--club-foreground)] sm:min-h-0"
            >
              {t.clubPage.homeViewAllMatches}
            </Link>
          </div>

          {!showBoard ? (
            <p className="rounded-2xl club-glass px-4 py-6 text-sm text-[color:var(--club-muted)]">
              {t.sommerfest2026.tournamentUnavailable}
            </p>
          ) : loadingData || loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-9 w-9 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl club-glass px-5 py-8 text-sm text-[color:var(--club-muted)]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[color:var(--club-foreground)]">
                <Radio className="h-4 w-4" />
                {t.sommerfest2026.tournamentPendingTitle}
              </div>
              <p>{t.sommerfest2026.tournamentPendingBody}</p>
            </div>
          ) : (
            <PublicSommerfestTournamentBoard
              teams={teams}
              dbMatches={matches}
              matchDetailBasePath={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}`}
              searchSuffix={searchSuffix}
            />
          )}
        </div>
      </section>
    </PublicClubPageGate>
  );
}
