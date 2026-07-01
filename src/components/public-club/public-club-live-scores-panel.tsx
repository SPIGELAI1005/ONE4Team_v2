import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Loader2, Radio, RefreshCw, Trophy } from "lucide-react";
import {
  PublicClubReportsIntro,
  publicClubDetailStackClass,
} from "@/components/public-club/public-club-dashboard-link";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { useLanguage } from "@/hooks/use-language";
import { publicMatchFixtureSides } from "@/lib/public-club-match-display";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { supabase } from "@/integrations/supabase/client";

interface LiveClubMatch {
  id: string;
  opponent: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
  location: string | null;
  teams?: { name: string } | null;
}

interface PublicClubLiveScoresPanelProps {
  clubId: string;
  clubName: string;
  teams: { id: string; name: string }[];
  basePath: string;
  searchSuffix: string;
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Radio; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[color:var(--club-border)]/40 pb-3">
      <Icon className="h-5 w-5 text-[color:var(--club-primary)]" aria-hidden />
      <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{title}</h3>
    </div>
  );
}

export function PublicClubLiveScoresPanel({ clubId, clubName, teams, basePath, searchSuffix }: PublicClubLiveScoresPanelProps) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<LiveClubMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("matches")
      .select("id, opponent, is_home, home_score, away_score, match_date, status, location, teams(name)")
      .eq("club_id", clubId)
      .eq("status", "in_progress")
      .order("match_date", { ascending: true });

    setMatches((data as LiveClubMatch[]) ?? []);
    setLastUpdated(new Date());
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    const channel = supabase
      .channel(`public-club-live-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `club_id=eq.${clubId}` },
        () => {
          void fetchMatches();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clubId, fetchMatches]);

  const matchesHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${searchSuffix}`;
  const hasLiveMatches = matches.length > 0;

  const elapsedLabel = useMemo(
    () => (matchDate: string) => {
      const elapsed = Math.floor((Date.now() - new Date(matchDate).getTime()) / 60000);
      if (elapsed < 0) return "Pre";
      if (elapsed > 90) return "90+";
      return `${elapsed}'`;
    },
    [],
  );

  const statusLabel = hasLiveMatches
    ? `${matches.length} ${t.liveScores.matchesInProgress}`
    : t.liveScores.noLiveMatches;

  return (
    <div className={publicClubDetailStackClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--club-border)]/60 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--club-foreground)]">
          {hasLiveMatches ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--club-primary)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--club-primary)]" />
            </span>
          ) : (
            <Radio className="h-3.5 w-3.5 text-[color:var(--club-muted)]" aria-hidden />
          )}
          {statusLabel}
        </span>
        <PublicClubButton
          type="button"
          appearance="outline"
          onClick={() => void fetchMatches()}
          className="gap-1.5 px-3 py-1.5 text-xs min-h-[36px]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t.liveScores.updated} {lastUpdated.toLocaleTimeString()}
        </PublicClubButton>
      </div>

      <PublicClubReportsIntro scope={t.clubPage.liveScoresPublicIntro} />

      <PublicClubCard className="space-y-4">
        <SectionHeader icon={Radio} title={t.clubPage.liveScoresSectionLive} />

        {loading && !hasLiveMatches ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[color:var(--club-muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--club-primary)]" />
            {t.common.loading}
          </div>
        ) : !hasLiveMatches ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
            <Trophy className="h-10 w-10 shrink-0 text-[color:var(--club-muted)]/50" aria-hidden />
            <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.liveScores.liveScoresWillAppear}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[color:var(--club-border)]/40">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[color:var(--club-border)]/40 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)] sm:grid-cols-[1fr_6rem_4rem]">
              <span>{t.liveScores.columnMatch}</span>
              <span className="text-center">{t.liveScores.columnScore}</span>
              <span className="text-right">{t.liveScores.columnMinute}</span>
            </div>
            <ul>
              {matches.map((match) => {
                const { homeName, awayName } = publicMatchFixtureSides(match, teams, clubName);
                const detailHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}/${match.id}${searchSuffix}`;
                return (
                  <li key={match.id} className="border-b border-[color:var(--club-border)]/30 last:border-b-0">
                    <Link
                      to={detailHref}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-3 text-sm transition-colors hover:bg-white/5 sm:grid-cols-[1fr_6rem_4rem] sm:items-center"
                    >
                      <div className="min-w-0">
                        {match.teams?.name ? (
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                            {match.teams.name}
                          </div>
                        ) : null}
                        <div className="font-medium text-[color:var(--club-foreground)]">
                          {homeName} <span className="text-[color:var(--club-muted)]">vs</span> {awayName}
                        </div>
                        {match.location ? (
                          <div className="mt-0.5 truncate text-xs text-[color:var(--club-muted)]">{match.location}</div>
                        ) : null}
                      </div>
                      <span className="self-center text-center font-display text-lg font-bold tabular-nums text-[color:var(--club-primary)]">
                        {match.home_score ?? 0}:{match.away_score ?? 0}
                      </span>
                      <span className="self-center text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--club-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--club-primary)]">
                          <Radio className="h-3 w-3" aria-hidden />
                          {elapsedLabel(match.match_date)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Link
            to={matchesHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
          >
            {t.clubPage.liveScoresViewMatches}
            <CalendarDays className="h-4 w-4" />
          </Link>
        </div>
      </PublicClubCard>
    </div>
  );
}
