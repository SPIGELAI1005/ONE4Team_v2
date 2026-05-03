import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Loader2, MapPin, Radio } from "lucide-react";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import type { PublicMatchLite } from "@/lib/public-club-models";
import {
  mergePublicMatchLists,
  publicMatchInDateRange,
  publicMatchStatusBadge,
} from "@/lib/public-club-match-display";
import { getPublicScheduleRangeBounds, type PublicScheduleRangePreset } from "@/lib/public-schedule-page";
import { cn } from "@/lib/utils";
import { startOfDay } from "date-fns";

type DateRangeFilter = "all" | PublicScheduleRangePreset;

function filterBtn(active: boolean) {
  return cn(
    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
    active
      ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
      : "border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]"
  );
}

function isPublicListedMatch(m: PublicMatchLite) {
  return m.publish_to_public_schedule !== false;
}

export default function PublicClubMatchesPage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { club, teams, publicMatches, publicMatchesUpcoming, loadingData, basePath, searchSuffix, showAdminDraftEmptyHints } =
    usePublicClub();
  const [teamFilterId, setTeamFilterId] = useState("");
  const [rangePreset, setRangePreset] = useState<DateRangeFilter>("this_month");

  const allMatches = useMemo(() => {
    const merged = mergePublicMatchLists(publicMatches, publicMatchesUpcoming);
    return merged.filter(isPublicListedMatch);
  }, [publicMatches, publicMatchesUpcoming]);

  const rangeBounds = useMemo(() => {
    if (rangePreset === "all") return { start: new Date(0), end: new Date(8.64e15) };
    return getPublicScheduleRangeBounds(rangePreset);
  }, [rangePreset]);

  const teamFiltered = useMemo(() => {
    if (!teamFilterId) return allMatches;
    return allMatches.filter((m) => m.team_id === teamFilterId);
  }, [allMatches, teamFilterId]);

  const rangeFiltered = useMemo(() => {
    const startMs = rangeBounds.start.getTime();
    const endMs = rangeBounds.end.getTime();
    return teamFiltered.filter((m) => publicMatchInDateRange(m, startMs, endMs));
  }, [teamFiltered, rangeBounds]);

  const startToday = startOfDay(new Date()).getTime();

  const liveMatches = useMemo(
    () => teamFiltered.filter((m) => publicMatchStatusBadge(m.status) === "live"),
    [teamFiltered]
  );

  const liveIds = useMemo(() => new Set(liveMatches.map((m) => m.id)), [liveMatches]);

  const upcomingMatches = useMemo(() => {
    return rangeFiltered
      .filter((m) => {
        if (liveIds.has(m.id)) return false;
        const b = publicMatchStatusBadge(m.status);
        if (b === "finished" || b === "cancelled" || b === "live") return false;
        return new Date(m.match_date).getTime() >= startToday - 36e5;
      })
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [rangeFiltered, startToday, liveIds]);

  const recentResults = useMemo(() => {
    return rangeFiltered
      .filter((m) => {
        if (liveIds.has(m.id)) return false;
        return publicMatchStatusBadge(m.status) === "finished";
      })
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, 36);
  }, [rangeFiltered, liveIds]);

  const teamOptions = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const renderCard = (m: PublicMatchLite) => {
    const badge = publicMatchStatusBadge(m.status);
    const fixtureHomeName = club ? (m.is_home ? club.name : m.opponent) : m.opponent;
    const fixtureAwayName = club ? (m.is_home ? m.opponent : club.name) : "";
    const fixtureHomeLogo = m.is_home ? club?.logo_url ?? null : m.opponent_logo_url ?? null;
    const fixtureAwayLogo = m.is_home ? m.opponent_logo_url ?? null : club?.logo_url ?? null;
    const detailHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}/${m.id}${searchSuffix}`;
    const showDetailCta = m.public_match_detail_enabled === true;

    return (
      <div
        key={m.id}
        className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-4 py-4 text-left shadow-sm sm:px-5"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
            {m.competitions?.name || t.clubPage.matchesCardCompetitionFallback}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              badge === "live"
                ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                : badge === "finished"
                  ? "border-[color:var(--club-border)] text-[color:var(--club-muted)]"
                  : badge === "cancelled"
                    ? "border-[color:var(--club-border)] text-[color:var(--club-muted)]"
                    : "border-[color:var(--club-primary)]/40 bg-[color:var(--club-primary)]/15 text-[color:var(--club-primary)]"
            )}
          >
            {badge === "live"
              ? t.clubPage.matchStatusLive
              : badge === "finished"
                ? t.clubPage.matchStatusFinished
                : badge === "cancelled"
                  ? t.clubPage.matchStatusCancelled
                  : t.clubPage.matchStatusUpcoming}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            {fixtureHomeLogo ? (
              <img src={fixtureHomeLogo} alt="" className="h-10 w-10 rounded-lg border border-[color:var(--club-border)] object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-[10px] font-bold text-[color:var(--club-muted)]">
                {fixtureHomeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-xs font-semibold leading-tight text-[color:var(--club-foreground)]">{fixtureHomeName}</div>
          </div>
          <div className="shrink-0 font-display text-xl font-bold tabular-nums text-[color:var(--club-foreground)]">
            {badge === "finished" && m.home_score != null && m.away_score != null ? (
              <>
                {m.home_score}:{m.away_score}
              </>
            ) : (
              <span className="text-sm text-[color:var(--club-muted)]">vs</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            {fixtureAwayLogo ? (
              <img src={fixtureAwayLogo} alt="" className="h-10 w-10 rounded-lg border border-[color:var(--club-border)] object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-[10px] font-bold text-[color:var(--club-muted)]">
                {fixtureAwayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-xs font-semibold leading-tight text-[color:var(--club-foreground)]">{fixtureAwayName}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--club-muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(m.match_date).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          {m.location ? (
            <span className="inline-flex min-w-0 items-start gap-1">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="break-words">{m.location}</span>
            </span>
          ) : null}
        </div>
        {showDetailCta ? (
          <div className="mt-3">
            <Link to={detailHref} className="text-xs font-semibold text-[color:var(--club-primary)] hover:underline">
              {t.clubPage.matchesCtaDetail}
            </Link>
          </div>
        ) : null}
      </div>
    );
  };

  const hasAny = allMatches.length > 0;
  const emptyAfterFilters = hasAny && rangeFiltered.length === 0;

  return (
    <PublicClubPageGate section="matches">
      <PublicClubSection
        title={
          <>
            {t.clubPage.matchesPageTitle}{" "}
            <span className="text-[color:var(--club-primary)]">{t.clubPage.matchesPageHighlight}</span>
          </>
        }
        subtitle={<span className="text-[color:var(--club-muted)]">{t.clubPage.matchesPageSubtitle}</span>}
      >
        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : !hasAny ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-8 text-center">
            <div className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.matchesEmptyDedicated}</div>
            {showAdminDraftEmptyHints ? (
              <div className="mt-4 text-left">
                <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintMatches}</PublicClubDraftEmptyHint>
              </div>
            ) : (
              <div className="mt-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.matchesWillAppear}</div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
                  {t.clubPage.matchesTeamFilterLabel}
                </label>
                <select
                  value={teamFilterId}
                  onChange={(e) => setTeamFilterId(e.target.value)}
                  className="h-10 w-full max-w-md rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-3 text-sm text-[color:var(--club-foreground)]"
                >
                  <option value="">{t.clubPage.matchesTeamAll}</option>
                  {teamOptions.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
                  {t.clubPage.matchesDateRangeLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", t.clubPage.matchesRangeAll],
                      ["this_week", t.clubPage.scheduleRangeThisWeek],
                      ["next_week", t.clubPage.scheduleRangeNextWeek],
                      ["this_month", t.clubPage.scheduleRangeThisMonth],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} type="button" className={filterBtn(rangePreset === id)} onClick={() => setRangePreset(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {emptyAfterFilters ? (
              <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-center text-sm text-[color:var(--club-muted)]">
                {t.clubPage.matchesEmptyFilters}
              </div>
            ) : (
              <>
                {liveMatches.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <h3 className="font-display text-lg font-bold text-[color:var(--club-foreground)]">{t.clubPage.matchesLiveTeaser}</h3>
                    </div>
                    <div className="space-y-3">{liveMatches.map((m) => renderCard(m))}</div>
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-3 font-display text-lg font-bold text-[color:var(--club-foreground)]">{t.clubPage.matchesUpcomingTitle}</h3>
                  {upcomingMatches.length === 0 ? (
                    <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.matchesUpcomingEmpty}</p>
                  ) : (
                    <div className="space-y-3">{upcomingMatches.map((m) => renderCard(m))}</div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-display text-lg font-bold text-[color:var(--club-foreground)]">{t.clubPage.matchesRecentTitle}</h3>
                  {recentResults.length === 0 ? (
                    <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.matchesRecentEmpty}</p>
                  ) : (
                    <div className="space-y-3">{recentResults.map((m) => renderCard(m))}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
