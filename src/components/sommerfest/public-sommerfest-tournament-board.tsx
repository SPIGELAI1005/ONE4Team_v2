import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock, MapPin, Radio, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import {
  buildSommerfestOpponentLogoLookup,
  buildSommerfestTournamentSlots,
  sommerfestSlotAwayName,
  sommerfestSlotHomeName,
  sommerfestSlotSideLogos,
  type SommerfestDbMatchRow,
  type SommerfestTournamentSlot,
} from "@/lib/tsv-allach-sommerfest-competition";
import { publicMatchStatusBadge, type PublicMatchStatusBadge } from "@/lib/public-club-match-display";
import { sommerfestMatchDateIso } from "@/lib/tsv-allach-sommerfest-match-sync";
import { type SommerfestMatchCategory } from "@/lib/tsv-allach-sommerfest-2026";
import { isSommerfestTournamentInProgress } from "@/lib/sommerfest-live-pulse";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: (SommerfestMatchCategory | "all")[] = [
  "all",
  "kleinfeld",
  "kompaktfeld",
  "damen",
  "herren",
];

const LIVE_SECTION_ID = "sommerfest-live-now";
const LIVE_MOBILE_BAR_DOC_FLAG = "data-sommerfest-live-bar";

function groupSlotsByTime(slots: SommerfestTournamentSlot[]) {
  const map = new Map<string, SommerfestTournamentSlot[]>();
  for (const slot of slots) {
    const time = slot.template.time;
    const bucket = map.get(time) ?? [];
    bucket.push(slot);
    map.set(time, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function slotStatusBadge(slot: SommerfestTournamentSlot): PublicMatchStatusBadge {
  return slot.match ? publicMatchStatusBadge(slot.match.status) : "upcoming";
}

function countTournamentStats(slots: SommerfestTournamentSlot[]) {
  const stats = { live: 0, finished: 0, upcoming: 0, total: slots.length, goals: 0 };
  for (const slot of slots) {
    const badge = slotStatusBadge(slot);
    if (badge === "live") stats.live++;
    else if (badge === "finished") stats.finished++;
    else stats.upcoming++;

    const home = slot.match?.home_score;
    const away = slot.match?.away_score;
    if (home != null && away != null) {
      stats.goals += home + away;
    }
  }
  return stats;
}

function formatSlotKickoff(slot: SommerfestTournamentSlot, locale: string) {
  return new Date(slot.match?.match_date ?? sommerfestMatchDateIso(slot.template.time)).toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ScoreProps {
  slot: SommerfestTournamentSlot;
  badge: PublicMatchStatusBadge;
  liveLabel: string;
  size?: "default" | "compact" | "mobile-bar";
}

interface SommerfestTeamSideProps {
  name: string;
  logo: string | null;
  align: "left" | "right";
}

function SommerfestTeamSide({ name, logo, align }: SommerfestTeamSideProps) {
  const logoNode = logo ? (
    <img
      src={logo}
      alt=""
      className="h-7 w-7 shrink-0 rounded-md border border-[color:var(--club-border)] object-cover sm:h-8 sm:w-8"
    />
  ) : (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-[9px] font-bold text-[color:var(--club-muted)] sm:h-8 sm:w-8">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );

  if (align === "right") {
    return (
      <div className="flex w-full min-w-0 items-center justify-end gap-1.5">
        <p className="min-w-0 truncate text-right text-[13px] font-semibold leading-snug text-[color:var(--club-foreground)] sm:text-sm sm:text-[15px]">
          {name}
        </p>
        {logoNode}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      {logoNode}
      <p className="min-w-0 truncate text-left text-[13px] font-semibold leading-snug text-[color:var(--club-foreground)] sm:text-sm sm:text-[15px]">
        {name}
      </p>
    </div>
  );
}

function SommerfestScorePill({ slot, badge, liveLabel, size = "default" }: ScoreProps) {
  const compact = size === "compact" || size === "mobile-bar";
  const scoreText = compact ? "text-lg" : "text-xl";

  if (slot.match && badge === "finished" && slot.match.home_score != null && slot.match.away_score != null) {
    return (
      <div
        className={cn(
          "flex flex-col items-center rounded-xl bg-[color:var(--club-tertiary)]/50 ring-1 ring-[color:var(--club-border)]/60",
          compact ? "min-w-[3.75rem] px-2.5 py-1" : "min-w-[4.5rem] px-3 py-1.5",
        )}
      >
        <span className={cn("font-display font-bold tabular-nums leading-none text-[color:var(--club-foreground)]", scoreText)}>
          {slot.match.home_score}:{slot.match.away_score}
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">FT</span>
      </div>
    );
  }

  if (badge === "live" && slot.match) {
    const home = slot.match.home_score ?? 0;
    const away = slot.match.away_score ?? 0;
    return (
      <div
        className={cn(
          "sommerfest-tournament-live-score flex flex-col items-center rounded-xl",
          compact ? "min-w-[3.75rem] px-2.5 py-1" : "min-w-[4.5rem] px-3 py-1.5",
        )}
      >
        <span className={cn("font-display font-bold tabular-nums leading-none", scoreText)}>
          {home}:{away}
        </span>
        <span className="sommerfest-tournament-live-score-label mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide">
          <Radio className="h-2.5 w-2.5" />
          {liveLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-[color:var(--club-border)] text-xs font-semibold text-[color:var(--club-muted)]",
        compact ? "min-w-[3.75rem] px-2 py-1.5" : "min-w-[4.5rem] px-3 py-2",
      )}
    >
      vs
    </div>
  );
}

interface PublicSommerfestTournamentBoardProps {
  teams?: { id: string; name: string }[];
  dbMatches: SommerfestDbMatchRow[];
  matchDetailBasePath?: string;
  searchSuffix?: string;
}

export function PublicSommerfestTournamentBoard({
  teams = [],
  dbMatches,
  matchDetailBasePath,
  searchSuffix = "",
}: PublicSommerfestTournamentBoardProps) {
  const { t, language } = useLanguage();
  const { club } = usePublicClub();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const copy = t.sommerfest2026;
  const [category, setCategory] = useState<SommerfestMatchCategory | "all">("all");

  const slots = useMemo(() => buildSommerfestTournamentSlots(dbMatches), [dbMatches]);
  const opponentLogoLookup = useMemo(
    () => buildSommerfestOpponentLogoLookup(dbMatches, teams),
    [dbMatches, teams],
  );
  const stats = useMemo(() => countTournamentStats(slots), [slots]);
  const liveSlots = useMemo(() => slots.filter((slot) => slotStatusBadge(slot) === "live"), [slots]);
  const hasLive = liveSlots.length > 0;
  const tournamentInProgress = isSommerfestTournamentInProgress(stats.finished, stats.total);

  useEffect(() => {
    if (!hasLive) {
      document.documentElement.removeAttribute(LIVE_MOBILE_BAR_DOC_FLAG);
      document.documentElement.style.removeProperty("--sommerfest-live-bar-offset");
      return;
    }
    document.documentElement.setAttribute(LIVE_MOBILE_BAR_DOC_FLAG, "");
    document.documentElement.style.setProperty("--sommerfest-live-bar-offset", "6.75rem");
    return () => {
      document.documentElement.removeAttribute(LIVE_MOBILE_BAR_DOC_FLAG);
      document.documentElement.style.removeProperty("--sommerfest-live-bar-offset");
    };
  }, [hasLive]);

  const filtered = useMemo(() => {
    if (category === "all") return slots;
    return slots.filter((slot) => slot.template.category === category);
  }, [category, slots]);

  const grouped = useMemo(() => groupSlotsByTime(filtered), [filtered]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SommerfestMatchCategory | "all", number> = {
      all: slots.length,
      kleinfeld: 0,
      kompaktfeld: 0,
      damen: 0,
      herren: 0,
    };
    for (const slot of slots) {
      counts[slot.template.category]++;
    }
    return counts;
  }, [slots]);

  function renderMetaRow(slot: SommerfestTournamentSlot, badge: PublicMatchStatusBadge, matchNumber: string) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[color:var(--club-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">
            <Trophy className="h-3 w-3 shrink-0" />
            <span className="truncate">{copy.categories[slot.template.category]}</span>
          </span>
          <span className="shrink-0 text-[10px] font-medium text-[color:var(--club-muted)]">
            {copy.tournamentMatchLabel} {matchNumber}
          </span>
          {badge === "finished" ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-[color:var(--club-primary)]">
              <CheckCircle2 className="h-3 w-3" />
              {t.clubPage.matchStatusFinished}
            </span>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-[color:var(--club-muted)]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{slot.template.pitchLabel}</span>
        </span>
      </div>
    );
  }

  function renderSlot(slot: SommerfestTournamentSlot, interactive?: boolean) {
    const home = sommerfestSlotHomeName(slot.template, teams, slot.match);
    const away = sommerfestSlotAwayName(slot.template, teams, slot.match);
    const { homeLogo, awayLogo } = sommerfestSlotSideLogos(slot, teams, club?.logo_url, opponentLogoLookup);
    const badge = slotStatusBadge(slot);
    const detailHref =
      slot.match?.public_match_detail_enabled && matchDetailBasePath
        ? `${matchDetailBasePath}/${slot.match.id}${searchSuffix}`
        : null;
    const matchNumber = slot.template.id.toUpperCase();
    const kickoff = formatSlotKickoff(slot, locale);

    const inner = (
      <div
        className={cn(
          "border-l-[3px] px-3 py-3 sm:px-4 sm:py-3.5",
          badge === "finished" && "border-l-[color:var(--club-primary)]/70 opacity-90",
          badge === "live" && "sommerfest-tournament-live-row border-l-[3px]",
          badge === "upcoming" && "border-l-[color:var(--club-border)]",
        )}
      >
        <div className="min-w-0 space-y-2 sm:space-y-2.5">
          {renderMetaRow(slot, badge, matchNumber)}

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 sm:gap-x-4">
            <SommerfestTeamSide name={home} logo={homeLogo} align="left" />
            <SommerfestScorePill slot={slot} badge={badge} liveLabel={t.clubPage.matchStatusLive} size="compact" />
            <SommerfestTeamSide name={away} logo={awayLogo} align="right" />
          </div>

          <p className="text-left text-[10px] text-[color:var(--club-muted)] sm:text-[11px]">{kickoff}</p>
        </div>
      </div>
    );

    const rowClass =
      "block min-h-[44px] transition-colors hover:bg-[color:var(--club-primary)]/[0.06] active:bg-[color:var(--club-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)] focus-visible:ring-inset";

    if (detailHref && interactive !== false) {
      return (
        <Link key={slot.template.id} to={detailHref} className={rowClass}>
          {inner}
        </Link>
      );
    }

    return (
      <div key={slot.template.id} className="block">
        {inner}
      </div>
    );
  }

  const statItems = [
    {
      key: "live" as const,
      label: copy.tournamentStatsLive,
      value: stats.live,
      pulse: hasLive || tournamentInProgress,
    },
    { key: "finished" as const, label: copy.tournamentStatsFinished, value: stats.finished, pulse: false },
    { key: "upcoming" as const, label: copy.tournamentStatsUpcoming, value: stats.upcoming, pulse: false },
    { key: "total" as const, label: copy.tournamentStatsTotal, value: stats.total, pulse: false },
    { key: "goals" as const, label: copy.tournamentStatsGoals, value: stats.goals, pulse: false },
  ];

  return (
    <div className={cn("space-y-4 sm:space-y-5", hasLive && "pb-28 md:pb-0")}>
      {/* Stats — full-width grid aligned with category filters below */}
      <div className="rounded-2xl border border-[color:var(--club-border)]/50 bg-[color:var(--club-background)]/92 p-2 sm:p-2.5">
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
          {statItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "sommerfest-tournament-stat-card min-w-0 rounded-xl px-1 py-2 text-center sm:rounded-2xl sm:px-2 sm:py-2.5",
                item.pulse ? "sommerfest-tournament-live-stat" : "sommerfest-tournament-stat-card--default",
              )}
            >
              <div
                className={cn(
                  "sommerfest-live-stat-value font-display text-lg font-bold tabular-nums leading-none sm:text-2xl",
                  !item.pulse && "text-[color:var(--club-foreground)]",
                )}
              >
                {item.value}
              </div>
              <div
                className={cn(
                  "sommerfest-live-stat-label mt-1 text-[9px] font-medium leading-tight sm:text-[11px]",
                  !item.pulse && "text-[color:var(--club-muted)]",
                )}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live block — compact on mobile; full detail from md */}
      {hasLive ? (
        <div
          id={LIVE_SECTION_ID}
          className="sommerfest-tournament-live-section scroll-mt-28 rounded-2xl p-3 sm:p-5 md:scroll-mt-24"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
            <div className="sommerfest-tournament-live-heading flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="sommerfest-tournament-live-dot-ping absolute inline-flex h-full w-full animate-ping rounded-full opacity-90" />
                <span className="sommerfest-tournament-live-dot relative inline-flex h-2.5 w-2.5 rounded-full" />
              </span>
              <Radio className="h-4 w-4" />
              {copy.liveNowTitle}
            </div>
            <span className="sommerfest-tournament-live-count rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              {liveSlots.length} {liveSlots.length === 1 ? copy.matchSingular : copy.matchPlural}
            </span>
          </div>
          <div className="sommerfest-tournament-live-panel overflow-hidden rounded-xl bg-[color:var(--club-card)]/90 shadow-sm">
            <div className="divide-y divide-[rgba(248,113,113,0.28)]">{liveSlots.map((slot) => renderSlot(slot))}</div>
          </div>
        </div>
      ) : null}

      {/* Category filters — single row; equal-width pills on sm+, swipe row on phone */}
      <div className="sticky top-[7.25rem] z-20 rounded-2xl border border-[color:var(--club-border)]/50 bg-[color:var(--club-background)]/92 p-2 backdrop-blur-md sm:top-16 sm:p-2.5">
        <div
          className="flex flex-nowrap items-stretch gap-1 overflow-x-auto overscroll-x-contain scroll-px-3 px-1 py-0.5 [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:gap-1.5 sm:overflow-visible sm:px-0 sm:py-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={copy.scheduleTitle}
        >
          {CATEGORY_ORDER.map((id) => {
            const count = categoryCounts[id];
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(id)}
                className={cn(
                  "inline-flex min-h-10 min-w-[4.75rem] shrink-0 snap-start items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all touch-manipulation sm:min-h-11 sm:min-w-0 sm:w-full sm:px-1.5 sm:text-[11px] md:px-2 md:text-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--club-background)]",
                  active
                    ? "bg-[color:var(--club-primary)] text-white shadow-md"
                    : "bg-[color:var(--club-card)]/90 text-[color:var(--club-muted)] active:bg-[color:var(--club-tertiary)]/50",
                )}
              >
                <span className="truncate">{copy.categories[id]}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums leading-none",
                    active ? "bg-white/20 text-white" : "bg-[color:var(--club-tertiary)]/45 text-[color:var(--club-foreground)]/80",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {hasLive ? (
          <a
            href={`#${LIVE_SECTION_ID}`}
            className="sommerfest-tournament-live-link mt-1.5 inline-flex min-h-9 items-center text-[11px] font-semibold active:underline md:hidden"
          >
            {copy.tournamentJumpToLive}
          </a>
        ) : null}
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-2xl club-glass px-4 py-8 text-center text-sm text-[color:var(--club-muted)]">
          {copy.tournamentFilterEmpty}
        </p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {grouped.map(([time, timeSlots], groupIndex) => (
            <motion.div
              key={time}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.02 }}
              className="overflow-hidden rounded-2xl border border-[color:var(--club-border)]/60 bg-[color:var(--club-card)]/90 shadow-sm"
            >
              <div className="flex items-start justify-start gap-2 border-b border-[color:var(--club-border)]/60 bg-[color:var(--club-tertiary)]/35 px-3 py-2.5 text-left sm:gap-2.5 sm:px-4 sm:py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--club-primary)] sm:mt-1" />
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold leading-tight text-[color:var(--club-foreground)] sm:text-base">
                    {time}
                  </div>
                  <div className="text-[10px] leading-tight text-[color:var(--club-muted)] sm:text-[11px]">
                    {timeSlots.length} {timeSlots.length === 1 ? copy.matchSingular : copy.matchPlural}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-[color:var(--club-border)]/50">
                {timeSlots.map((slot) => renderSlot(slot))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-[color:var(--club-muted)] sm:text-[11px]">{copy.tournamentAutoRefreshHint}</p>

      {/* Mobile: fixed bottom live scoreboard while scrolling the schedule */}
      {hasLive ? (
        <div className="sommerfest-tournament-live-mobile-bar fixed inset-x-0 bottom-0 z-40 border-t bg-[color:var(--club-background)]/95 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-between gap-2 px-3 pt-2">
            <div className="sommerfest-tournament-live-heading flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="sommerfest-tournament-live-dot-ping absolute inline-flex h-full w-full animate-ping rounded-full opacity-90" />
                <span className="sommerfest-tournament-live-dot relative inline-flex h-2 w-2 rounded-full" />
              </span>
              {copy.liveNowTitle}
            </div>
            <span className="text-[10px] text-[color:var(--club-muted)]">{copy.tournamentMobileLiveSwipe}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 pr-[4.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {liveSlots.map((slot) => {
              const home = sommerfestSlotHomeName(slot.template, teams, slot.match);
              const away = sommerfestSlotAwayName(slot.template, teams, slot.match);
              const { homeLogo, awayLogo } = sommerfestSlotSideLogos(slot, teams, club?.logo_url, opponentLogoLookup);
              const badge = slotStatusBadge(slot);
              const detailHref =
                slot.match?.public_match_detail_enabled && matchDetailBasePath
                  ? `${matchDetailBasePath}/${slot.match.id}${searchSuffix}`
                  : `#${LIVE_SECTION_ID}`;

              const card = (
                <div className="sommerfest-tournament-live-mobile-card flex min-w-[min(100%,20rem)] shrink-0 snap-center items-center gap-3 rounded-xl px-3 py-2.5 touch-manipulation">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {homeLogo ? (
                      <img src={homeLogo} alt="" className="h-7 w-7 shrink-0 rounded-md border border-red-500/20 object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-500/20 bg-[color:var(--club-tertiary)] text-[9px] font-bold text-[color:var(--club-muted)]">
                        {home.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[color:var(--club-foreground)]">{home}</p>
                      <p className="truncate text-xs text-[color:var(--club-muted)]">{away}</p>
                    </div>
                    {awayLogo ? (
                      <img src={awayLogo} alt="" className="h-7 w-7 shrink-0 rounded-md border border-red-500/20 object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-500/20 bg-[color:var(--club-tertiary)] text-[9px] font-bold text-[color:var(--club-muted)]">
                        {away.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <SommerfestScorePill
                    slot={slot}
                    badge={badge}
                    liveLabel={t.clubPage.matchStatusLive}
                    size="mobile-bar"
                  />
                  <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--club-muted)]" aria-hidden />
                </div>
              );

              return detailHref.startsWith("#") ? (
                <a key={slot.template.id} href={detailHref} className="block">
                  {card}
                </a>
              ) : (
                <Link key={slot.template.id} to={detailHref} className="block">
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
