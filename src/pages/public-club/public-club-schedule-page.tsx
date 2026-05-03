import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, LayoutList, Loader2, MapPin, Trophy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { encodePublicTeamPathSegment } from "@/lib/public-club-team-slug";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import {
  clubScheduleLocalDayKey,
  clubScheduleParseDayKey,
  clubScheduleStartOfLocalDay,
  matchesSectionFilter,
} from "@/lib/public-club-models";
import {
  buildPublicScheduleEntries,
  filterScheduleEntriesByRange,
  getPublicScheduleRangeBounds,
  type PublicScheduleEntry,
  type PublicScheduleEntryKind,
  type PublicScheduleRangePreset,
} from "@/lib/public-schedule-page";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type ScheduleViewMode = "list" | "calendar";

function scheduleTypeLabel(kind: PublicScheduleEntryKind, t: ReturnType<typeof useLanguage>["t"]) {
  if (kind === "training") return t.clubPage.scheduleTypeTraining;
  if (kind === "match") return t.clubPage.scheduleTypeMatch;
  return t.clubPage.scheduleTypeEvent;
}

function badgeClass(kind: PublicScheduleEntryKind) {
  if (kind === "training") return "bg-[color:var(--club-primary)]/15 text-[color:var(--club-primary)] border-[color:var(--club-primary)]/35";
  if (kind === "match") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
}

export default function PublicClubSchedulePage() {
  const { t, language } = useLanguage();
  const { club, teams, sessions, events, publicMatches, publicMatchesUpcoming, loadingData, basePath, searchSuffix } =
    usePublicClub();
  const scheduleLocale = language === "de" ? "de-DE" : "en-GB";

  const [viewMode, setViewMode] = useState<ScheduleViewMode>("list");
  const [typeFilter, setTypeFilter] = useState<"all" | PublicScheduleEntryKind>("all");
  const [teamFilterId, setTeamFilterId] = useState<string>("");
  const [rangePreset, setRangePreset] = useState<PublicScheduleRangePreset>("this_week");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarDay, setCalendarDay] = useState<Date | undefined>(undefined);

  const rangeBounds = useMemo(() => getPublicScheduleRangeBounds(rangePreset), [rangePreset]);

  useEffect(() => {
    setCalendarMonth(rangeBounds.start);
    setCalendarDay(undefined);
  }, [rangeBounds.start, rangePreset]);

  const matchesMerged = useMemo(() => {
    const byId = new Map<string, (typeof publicMatches)[0]>();
    for (const m of publicMatches) byId.set(m.id, m);
    for (const m of publicMatchesUpcoming) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [publicMatches, publicMatchesUpcoming]);

  const allEntries = useMemo(
    () =>
      buildPublicScheduleEntries({
        club,
        teams,
        sessions,
        events,
        matches: matchesMerged,
      }),
    [club, teams, sessions, events, matchesMerged]
  );

  const rangeFiltered = useMemo(
    () => filterScheduleEntriesByRange(allEntries, rangeBounds.start, rangeBounds.end),
    [allEntries, rangeBounds.end, rangeBounds.start]
  );

  const typeFiltered = useMemo(() => {
    if (typeFilter === "all") return rangeFiltered;
    return rangeFiltered.filter((e) => e.kind === typeFilter);
  }, [rangeFiltered, typeFilter]);

  const teamFiltered = useMemo(() => {
    if (!teamFilterId) return typeFiltered;
    return typeFiltered.filter((e) => e.teamId === teamFilterId);
  }, [teamFilterId, typeFiltered]);

  const searchFiltered = useMemo(() => {
    const q = scheduleSearch.trim();
    if (!q) return teamFiltered;
    return teamFiltered.filter((e) =>
      matchesSectionFilter(q, e.title, e.location ?? undefined, e.teamName ?? undefined, scheduleTypeLabel(e.kind, t))
    );
  }, [scheduleSearch, teamFiltered, t]);

  const calendarScoped = useMemo(() => {
    if (viewMode !== "calendar" || !calendarDay) return searchFiltered;
    const key = clubScheduleLocalDayKey(calendarDay.toISOString());
    return searchFiltered.filter((e) => clubScheduleLocalDayKey(e.startsAt) === key);
  }, [calendarDay, searchFiltered, viewMode]);

  const displayEntries = viewMode === "calendar" && calendarDay ? calendarScoped : searchFiltered;

  const entriesByDay = useMemo(() => {
    const map = new Map<string, PublicScheduleEntry[]>();
    for (const e of displayEntries) {
      const key = clubScheduleLocalDayKey(e.startsAt);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, dayEntries]) => ({ dateKey, dayEntries }));
  }, [displayEntries]);

  const scheduleDayHeading = useCallback(
    (dateKey: string) => {
      const d = clubScheduleStartOfLocalDay(clubScheduleParseDayKey(dateKey));
      const today = clubScheduleStartOfLocalDay(new Date());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.getTime() === today.getTime()) {
        return {
          title: t.common.today,
          subtitle: d.toLocaleDateString(scheduleLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        };
      }
      if (d.getTime() === tomorrow.getTime()) {
        return {
          title: t.clubPage.scheduleTomorrow,
          subtitle: d.toLocaleDateString(scheduleLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        };
      }
      return {
        title: d.toLocaleDateString(scheduleLocale, { weekday: "long" }),
        subtitle: d.toLocaleDateString(scheduleLocale, { month: "long", day: "numeric", year: "numeric" }),
      };
    },
    [scheduleLocale, t.clubPage.scheduleTomorrow, t.common.today]
  );

  const modifiers = useMemo(() => {
    const withItems = new Set<string>();
    for (const e of searchFiltered) {
      withItems.add(clubScheduleLocalDayKey(e.startsAt));
    }
    return {
      hasSchedule: (d: Date) => withItems.has(clubScheduleLocalDayKey(d.toISOString())),
    };
  }, [searchFiltered]);

  const hasDedicatedEmpty = !loadingData && allEntries.length === 0;
  const hasNoMatchesForFilters = !loadingData && allEntries.length > 0 && displayEntries.length === 0;
  const calendarDayEmpty =
    !loadingData &&
    viewMode === "calendar" &&
    Boolean(calendarDay) &&
    calendarScoped.length === 0 &&
    searchFiltered.length > 0;

  const teamOptions = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  function resolveTeamName(teamId: string | null, fallback: string | null) {
    if (fallback) return fallback;
    if (!teamId) return null;
    return teamOptions.find((tm) => tm.id === teamId)?.name ?? null;
  }

  function detailCta(entry: PublicScheduleEntry) {
    const suffix = searchSuffix;
    if (entry.kind === "training" && entry.teamId) {
      const name = resolveTeamName(entry.teamId, entry.teamName);
      const seg = encodePublicTeamPathSegment({ id: entry.teamId, name: name || "Team" });
      return {
        href: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}/${seg}${suffix}`,
        label: t.clubPage.scheduleCtaTeamOverview,
      };
    }
    if (entry.kind === "match") {
      return {
        href: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${suffix}`,
        label: t.clubPage.scheduleCtaMatches,
      };
    }
    if (entry.kind === "event") {
      return {
        href: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.events}${suffix}`,
        label: t.clubPage.scheduleCtaEvents,
      };
    }
    return null;
  }

  const filterBtn = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
      active
        ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
        : "border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]"
    );

  return (
    <PublicClubPageGate section="schedule">
      <PublicClubSection title={<span className="text-[color:var(--club-foreground)]">{t.clubPage.schedulePageTitle}</span>}>
        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : hasDedicatedEmpty ? (
          <div className="mx-auto max-w-md rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-6 py-10 text-center">
            <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-[color:var(--club-muted)] opacity-80" />
            <p className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.scheduleEmptyDedicated}</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={filterBtn(viewMode === "list")} onClick={() => setViewMode("list")}>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutList className="h-3.5 w-3.5" />
                  {t.clubPage.scheduleViewList}
                </span>
              </button>
              <button type="button" className={filterBtn(viewMode === "calendar")} onClick={() => setViewMode("calendar")}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {t.clubPage.scheduleViewCalendar}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", t.clubPage.scheduleFilterAll],
                  ["training", t.clubPage.scheduleFilterTraining],
                  ["match", t.clubPage.scheduleFilterMatches],
                  ["event", t.clubPage.scheduleFilterEvents],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={filterBtn(typeFilter === id)}
                  onClick={() => setTypeFilter(id === "all" ? "all" : id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
                  {t.clubPage.scheduleTeamFilterLabel}
                </label>
                <select
                  value={teamFilterId}
                  onChange={(e) => setTeamFilterId(e.target.value)}
                  className="h-10 w-full max-w-md rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-3 text-sm text-[color:var(--club-foreground)]"
                >
                  <option value="">{t.clubPage.scheduleTeamAll}</option>
                  {teamOptions.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
                  {t.clubPage.scheduleRangeLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
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

            <Input
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder={t.clubPage.scheduleSearchPlaceholder}
              className="max-w-md border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)]"
            />

            {viewMode === "calendar" ? (
              <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-3 sm:p-4">
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={calendarDay}
                  onSelect={setCalendarDay}
                  modifiers={modifiers}
                  modifiersClassNames={{
                    hasSchedule: "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[color:var(--club-primary)]",
                  }}
                  className="mx-auto w-fit text-[color:var(--club-foreground)]"
                />
                <p className="mt-2 text-center text-xs text-[color:var(--club-muted)]">{t.clubPage.scheduleCalendarHint}</p>
              </div>
            ) : null}

            {hasNoMatchesForFilters || calendarDayEmpty ? (
              <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-center text-sm text-[color:var(--club-muted)]">
                {calendarDayEmpty ? t.clubPage.scheduleEmptyCalendarDay : t.clubPage.scheduleEmptyFilters}
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10">
                {entriesByDay.map(({ dateKey, dayEntries }) => {
                  const { title: dayTitle, subtitle: daySubtitle } = scheduleDayHeading(dateKey);
                  const dayDate = clubScheduleStartOfLocalDay(clubScheduleParseDayKey(dateKey));
                  return (
                    <div key={dateKey} className="text-left">
                      <div
                        className="mb-3 flex flex-col gap-1 rounded-l-md border-l-4 pl-3 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:pl-4"
                        style={{ borderColor: "var(--club-primary)" }}
                      >
                        <div>
                          <div className="font-display text-lg font-bold tracking-tight text-[color:var(--club-foreground)] sm:text-xl">
                            {dayTitle}
                          </div>
                          <div className="text-xs text-[color:var(--club-muted)] sm:text-sm">{daySubtitle}</div>
                        </div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)] tabular-nums sm:text-xs">
                          {dayEntries.length} {dayEntries.length === 1 ? t.clubPage.scheduleEntrySingular : t.clubPage.scheduleEntryPlural}
                        </div>
                      </div>
                      <div className="space-y-2 sm:space-y-2.5">
                        {dayEntries.map((entry) => {
                          const cta = detailCta(entry);
                          const timeLabel = new Date(entry.startsAt).toLocaleTimeString(scheduleLocale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const dateLine = dayDate.toLocaleDateString(scheduleLocale, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });
                          return (
                            <div
                              key={`${entry.kind}-${entry.id}`}
                              className="flex flex-col gap-2 rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-3 py-2.5 shadow-sm sm:flex-row sm:gap-4 sm:px-4 sm:py-3"
                            >
                              <div className="flex shrink-0 gap-3 sm:w-36 sm:flex-col sm:items-end sm:gap-0.5 sm:text-right">
                                <div
                                  className="text-xs font-semibold tabular-nums text-[color:var(--club-primary)] sm:text-sm"
                                  title={dateLine}
                                >
                                  {timeLabel}
                                </div>
                                <div className="text-[10px] text-[color:var(--club-muted)] sm:hidden">{dateLine}</div>
                              </div>
                              <div className="min-w-0 flex-1 border-l border-[color:var(--club-border)]/50 pl-0 sm:border-l sm:pl-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                      badgeClass(entry.kind)
                                    )}
                                  >
                                    {scheduleTypeLabel(entry.kind, t)}
                                  </span>
                                  <div className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-[color:var(--club-foreground)] sm:text-base">
                                    {entry.title}
                                  </div>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--club-muted)]">
                                  <span className="tabular-nums text-[color:var(--club-muted)]">{dateLine}</span>
                                  {resolveTeamName(entry.teamId, entry.teamName) ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Trophy className="h-3 w-3 shrink-0 opacity-80" style={{ color: "var(--club-primary)" }} />
                                      {resolveTeamName(entry.teamId, entry.teamName)}
                                    </span>
                                  ) : null}
                                  {entry.location ? (
                                    <span className="inline-flex min-w-0 items-start gap-1">
                                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
                                      <span className="break-words">{entry.location}</span>
                                    </span>
                                  ) : null}
                                </div>
                                {cta ? (
                                  <div className="mt-2">
                                    <Link
                                      to={cta.href}
                                      className="inline-flex items-center text-xs font-semibold text-[color:var(--club-primary)] hover:underline"
                                    >
                                      {cta.label}
                                    </Link>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
