import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Radio, Trophy } from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import {
  publicTournamentPath,
  SOMMERFEST_TOURNAMENT_SLUG,
} from "@/lib/tsv-allach-sommerfest-competition";
import { SOMMERFEST_MATCH_IMPORT_KEY_PREFIX } from "@/lib/tsv-allach-sommerfest-match-sync";
import { SOMMERFEST_MATCHES } from "@/lib/tsv-allach-sommerfest-2026";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20_000;

interface TournamentBannerStats {
  liveCount: number;
  finishedCount: number;
  publishedCount: number;
}

function isOnSommerfestTournamentPage(pathname: string): boolean {
  return pathname.includes(`/tournament/${SOMMERFEST_TOURNAMENT_SLUG}`);
}

export function PublicSommerfestTournamentBanner() {
  const { t } = useLanguage();
  const { club, basePath, searchSuffix } = usePublicClub();
  const location = useLocation();
  const [stats, setStats] = useState<TournamentBannerStats>({
    liveCount: 0,
    finishedCount: 0,
    publishedCount: 0,
  });

  const tournamentHref = publicTournamentPath(basePath, searchSuffix);
  const showBanner = Boolean(club && isTsvAllachClub(club) && !isOnSommerfestTournamentPage(location.pathname));

  const loadStats = useCallback(async () => {
    if (!club?.id || !showBanner) return;
    const { data, error } = await supabase
      .from("matches")
      .select("status")
      .eq("club_id", club.id)
      .like("notes", `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}%`);

    if (error) return;

    const rows = data ?? [];
    setStats({
      liveCount: rows.filter((row) => row.status === "in_progress").length,
      finishedCount: rows.filter((row) => row.status === "completed").length,
      publishedCount: rows.length,
    });
  }, [club?.id, showBanner]);

  useEffect(() => {
    if (!showBanner) return;
    let cancelled = false;
    void (async () => {
      await loadStats();
      if (cancelled) return;
    })();
    const timer = window.setInterval(() => {
      void loadStats();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadStats, showBanner]);

  if (!showBanner) return null;

  const copy = t.sommerfest2026;
  const totalFixtures = SOMMERFEST_MATCHES.length;
  const hasLive = stats.liveCount > 0;
  const progressLabel =
    stats.publishedCount > 0
      ? copy.tournamentBannerProgress
          .replace("{finished}", String(stats.finishedCount))
          .replace("{total}", String(totalFixtures))
      : copy.tournamentBannerSubtitle;

  return (
    <Link
      to={tournamentHref}
      className="group block border-b border-[#14532d]/30 bg-gradient-to-r from-[#14532d] via-[#166534] to-[#052e16] text-white transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac] focus-visible:ring-offset-2 focus-visible:ring-offset-[#052e16]"
      aria-label={copy.viewLiveTournament}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:py-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15",
            hasLive && "animate-pulse bg-red-500/25 ring-red-300/40",
          )}
        >
          {hasLive ? <Radio className="h-4 w-4 text-red-200" aria-hidden /> : <Trophy className="h-4 w-4 text-[#d9f99d]" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-display text-sm font-bold leading-tight sm:text-[15px]">{copy.tournamentBannerTitle}</span>
            {hasLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-100 ring-1 ring-red-300/30">
                <span className="h-1.5 w-1.5 rounded-full bg-red-300" aria-hidden />
                {copy.tournamentBannerLive.replace("{count}", String(stats.liveCount))}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] text-white/80 sm:text-xs">{progressLabel}</p>
        </div>

        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors group-hover:bg-white/15 sm:inline-flex">
          {copy.tournamentBannerCta}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/70 sm:hidden" aria-hidden />
      </div>
    </Link>
  );
}
