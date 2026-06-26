import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import { PublicSommerfestTournamentBoard } from "@/components/sommerfest/public-sommerfest-tournament-board";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import {
  SOMMERFEST_COMPETITION_NAME,
  SOMMERFEST_TOURNAMENT_SLUG,
  type SommerfestDbMatchRow,
} from "@/lib/tsv-allach-sommerfest-competition";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";

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

  const loadMatches = useCallback(async () => {
    if (!club?.id || !showBoard) return;
    const { data, error: fetchError } = await supabase
      .from("matches")
      .select(
        "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, publish_to_public_schedule, public_match_detail_enabled, competitions(name), teams(name)",
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

  return (
    <PublicClubPageGate section="matches">
      <PublicClubSection
        title={t.sommerfest2026.tournamentPageTitle}
        subtitle={t.sommerfest2026.tournamentPageSubtitle}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link
              to={eventsHref}
              className="inline-flex items-center gap-1 font-medium text-[color:var(--club-primary)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.sommerfest2026.backToEvent}
            </Link>
            <Link to={matchesHref} className="text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]">
              {t.clubPage.homeViewAllMatches}
            </Link>
          </div>

          {!showBoard ? (
            <p className="rounded-2xl club-glass px-4 py-6 text-sm text-[color:var(--club-muted)]">
              {t.sommerfest2026.tournamentUnavailable}
            </p>
          ) : loadingData || loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl club-glass px-4 py-6 text-sm text-[color:var(--club-muted)]">
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
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
