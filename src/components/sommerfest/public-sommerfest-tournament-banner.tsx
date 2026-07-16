import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Megaphone,
  Newspaper,
  Radio,
  Trophy,
} from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import {
  isSommerfestLiveBanner,
  normalizeClubSiteBannerKind,
  resolveSiteBannerHref,
  type ClubSiteBannerKind,
} from "@/lib/club-site-banner";
import { SOMMERFEST_MATCH_IMPORT_KEY_PREFIX } from "@/lib/tsv-allach-sommerfest-match-sync";
import { SOMMERFEST_MATCHES } from "@/lib/tsv-allach-sommerfest-2026";
import { isSommerfestLivePulsateActive, sommerfestBannerMatchStats } from "@/lib/sommerfest-live-pulse";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20_000;

interface TournamentBannerStats {
  liveCount: number;
  finishedCount: number;
  publishedCount: number;
}

function isOnBannerDestination(pathname: string, href: string, basePath: string): boolean {
  if (!href.trim() || /^https?:\/\//i.test(href)) return false;
  const path = href.startsWith("/") ? href : `/${href}`;
  const root = (basePath || "").replace(/\/$/, "");
  const full = `${root}${path}`;
  return pathname === full || pathname.startsWith(`${full}/`);
}

function bannerShellClass(kind: ClubSiteBannerKind, opts: { hasLive: boolean; festival: boolean }): string {
  const resolved = normalizeClubSiteBannerKind(kind);
  if (resolved === "sommerfest_live") {
    return cn(
      "sommerfest-public-banner group block border-b border-[#14532d]/40 text-white",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac] focus-visible:ring-offset-2 focus-visible:ring-offset-[#052e16]",
      opts.hasLive && "sommerfest-public-banner--live",
      opts.festival && !opts.hasLive && "sommerfest-public-banner--festival",
    );
  }
  if (resolved === "news") {
    return cn(
      "group block border-b border-sky-900/30 text-white",
      "bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    );
  }
  if (resolved === "event") {
    return cn(
      "group block border-b border-amber-900/35 text-amber-50",
      "bg-gradient-to-r from-stone-950 via-amber-950 to-stone-950",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950",
    );
  }
  if (resolved === "alert") {
    return cn(
      "group block border-b border-rose-900/40 text-rose-50",
      "bg-gradient-to-r from-rose-950 via-red-900 to-rose-950",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-950",
    );
  }
  // promo (club brand)
  return cn(
    "group block border-b border-black/20 text-white",
    "bg-[linear-gradient(112deg,color-mix(in_srgb,var(--club-tertiary)_88%,#000)_0%,color-mix(in_srgb,var(--club-primary)_55%,var(--club-secondary))_45%,color-mix(in_srgb,var(--club-secondary)_90%,#000)_100%)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--club-tertiary)]",
  );
}

function BannerKindIcon({
  kind,
  hasLive,
}: {
  kind: ClubSiteBannerKind;
  hasLive: boolean;
}) {
  const resolved = normalizeClubSiteBannerKind(kind);
  const iconClass = "h-4 w-4";
  if (resolved === "sommerfest_live") {
    return hasLive ? (
      <Radio className={cn(iconClass, "text-red-100")} aria-hidden />
    ) : (
      <Trophy className={cn(iconClass, "text-[#ecfccb]")} aria-hidden />
    );
  }
  if (resolved === "news") return <Newspaper className={cn(iconClass, "text-sky-100")} aria-hidden />;
  if (resolved === "event") return <CalendarDays className={cn(iconClass, "text-amber-100")} aria-hidden />;
  if (resolved === "alert") return <AlertTriangle className={cn(iconClass, "text-rose-100")} aria-hidden />;
  return <Megaphone className={cn(iconClass, "text-white")} aria-hidden />;
}

/** Configurable top chrome banner for the public club microsite. */
export function PublicSommerfestTournamentBanner() {
  const { t } = useLanguage();
  const { club, basePath, searchSuffix } = usePublicClub();
  const location = useLocation();
  const banner = club?.siteBanner;
  const [stats, setStats] = useState<TournamentBannerStats>({
    liveCount: 0,
    finishedCount: 0,
    publishedCount: 0,
  });

  const liveMode = Boolean(banner && isSommerfestLiveBanner(banner));
  const kind = banner ? normalizeClubSiteBannerKind(banner.kind) : "promo";
  const destinationHref = useMemo(() => {
    if (!banner) return basePath || "/";
    return resolveSiteBannerHref(banner.href, basePath, searchSuffix);
  }, [banner, basePath, searchSuffix]);

  const showBanner = Boolean(
    club &&
      banner?.enabled &&
      !isOnBannerDestination(location.pathname, banner.href, basePath),
  );

  const loadStats = useCallback(async () => {
    if (!club?.id || !showBanner || !liveMode) return;
    const { data, error } = await supabase
      .from("matches")
      .select("status, match_date")
      .eq("club_id", club.id)
      .like("notes", `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}%`);

    if (error) return;

    const rows = data ?? [];
    const { liveCount, finishedCount } = sommerfestBannerMatchStats(rows);
    setStats({
      liveCount,
      finishedCount,
      publishedCount: rows.length,
    });
  }, [club?.id, liveMode, showBanner]);

  useEffect(() => {
    if (!showBanner || !liveMode) return;
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
  }, [loadStats, liveMode, showBanner]);

  if (!showBanner || !banner) return null;

  const copy = t.sommerfest2026;
  const title = banner.title.trim() || (liveMode ? copy.tournamentBannerTitle : "");
  const ctaLabel = banner.ctaLabel.trim() || (liveMode ? copy.tournamentBannerCta : "");
  if (!title) return null;

  const totalFixtures = SOMMERFEST_MATCHES.length;
  const hasLive = liveMode && stats.liveCount > 0;
  const isFestivalHighlight = liveMode && isSommerfestLivePulsateActive();
  const showProgress =
    liveMode &&
    stats.publishedCount > 0 &&
    (hasLive || stats.finishedCount > 0 || isFestivalHighlight);
  const progressLabel = showProgress
    ? copy.tournamentBannerProgress
        .replace("{finished}", String(stats.finishedCount))
        .replace("{total}", String(totalFixtures))
    : banner.subtitle.trim() || (liveMode ? copy.tournamentBannerSubtitle : "");

  const isExternal = /^https?:\/\//i.test(destinationHref);
  const className = bannerShellClass(kind, { hasLive, festival: isFestivalHighlight });

  const body = (
    <div className="relative z-[1] mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:py-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-[2px]",
          kind === "sommerfest_live" && "sommerfest-public-banner-icon",
          hasLive && "bg-red-500/30 ring-red-200/40",
          kind === "alert" && "bg-rose-500/25 ring-rose-200/30",
          kind === "event" && "bg-amber-500/20 ring-amber-200/30",
          kind === "news" && "bg-sky-500/20 ring-sky-200/30",
        )}
      >
        <BannerKindIcon kind={kind} hasLive={hasLive} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-display text-sm font-bold leading-tight tracking-tight sm:text-[15px]">
            {title}
          </span>
          {hasLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-50 ring-1 ring-red-200/35 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-200" aria-hidden />
              {copy.tournamentBannerLive.replace("{count}", String(stats.liveCount))}
            </span>
          ) : null}
        </div>
        {progressLabel ? (
          <p className="truncate text-[11px] text-white/85 sm:text-xs">{progressLabel}</p>
        ) : null}
      </div>

      {ctaLabel ? (
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-[background-color,box-shadow] group-hover:bg-white/18 sm:inline-flex",
            kind === "sommerfest_live" && "sommerfest-public-banner-cta group-hover:ring-amber-200/40",
          )}
        >
          {ctaLabel}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      ) : null}
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 text-white/80 sm:hidden",
          kind === "sommerfest_live" && "sommerfest-public-banner-cta",
        )}
        aria-hidden
      />
    </div>
  );

  if (isExternal) {
    return (
      <a
        href={destinationHref}
        className={className}
        aria-label={ctaLabel || title}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <Link to={destinationHref} className={className} aria-label={ctaLabel || title}>
      {body}
    </Link>
  );
}
