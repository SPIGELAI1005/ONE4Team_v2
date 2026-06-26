import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Radio, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import {
  buildSommerfestTournamentSlots,
  sommerfestSlotAwayName,
  sommerfestSlotHomeName,
  type SommerfestDbMatchRow,
  type SommerfestTournamentSlot,
} from "@/lib/tsv-allach-sommerfest-competition";
import { publicMatchStatusBadge } from "@/lib/public-club-match-display";
import { sommerfestMatchDateIso } from "@/lib/tsv-allach-sommerfest-match-sync";
import {
  sommerfestMatchesByCategory,
  type SommerfestMatchCategory,
} from "@/lib/tsv-allach-sommerfest-2026";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: (SommerfestMatchCategory | "all")[] = [
  "all",
  "kleinfeld",
  "kompaktfeld",
  "damen",
  "herren",
];

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
  const locale = language === "de" ? "de-DE" : "en-GB";
  const copy = t.sommerfest2026;
  const [category, setCategory] = useState<SommerfestMatchCategory | "all">("all");

  const slots = useMemo(() => buildSommerfestTournamentSlots(dbMatches), [dbMatches]);
  const liveSlots = useMemo(
    () => slots.filter((slot) => slot.match && publicMatchStatusBadge(slot.match.status) === "live"),
    [slots],
  );

  const filtered = useMemo(() => {
    if (category === "all") return slots;
    return slots.filter((slot) => slot.template.category === category);
  }, [category, slots]);

  const grouped = useMemo(() => groupSlotsByTime(filtered), [filtered]);

  function renderScore(slot: SommerfestTournamentSlot) {
    const badge = slot.match ? publicMatchStatusBadge(slot.match.status) : "upcoming";
    if (slot.match && badge === "finished" && slot.match.home_score != null && slot.match.away_score != null) {
      return (
        <span className="font-display text-lg font-bold tabular-nums text-[color:var(--club-foreground)]">
          {slot.match.home_score}:{slot.match.away_score}
        </span>
      );
    }
    if (badge === "live" && slot.match) {
      const home = slot.match.home_score ?? 0;
      const away = slot.match.away_score ?? 0;
      return (
        <span className="font-display text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
          {home}:{away}
        </span>
      );
    }
    return <span className="text-sm text-[color:var(--club-muted)]">vs</span>;
  }

  function renderSlot(slot: SommerfestTournamentSlot, interactive?: boolean) {
    const home = sommerfestSlotHomeName(slot.template, teams, slot.match);
    const away = sommerfestSlotAwayName(slot.template, teams, slot.match);
    const badge = slot.match ? publicMatchStatusBadge(slot.match.status) : "upcoming";
    const detailHref =
      slot.match?.public_match_detail_enabled && matchDetailBasePath
        ? `${matchDetailBasePath}/${slot.match.id}${searchSuffix}`
        : null;

    const inner = (
      <>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--club-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">
            <Trophy className="h-3 w-3" />
            {copy.categories[slot.template.category]}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--club-muted)]">
            <MapPin className="h-3 w-3" />
            {slot.template.pitchLabel}
          </span>
          {badge === "live" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              <Radio className="h-3 w-3" />
              {t.clubPage.matchStatusLive}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--club-foreground)]">{home}</div>
          <div className="shrink-0 px-2">{renderScore(slot)}</div>
          <div className="min-w-0 flex-1 text-right text-sm font-semibold text-[color:var(--club-foreground)]">{away}</div>
        </div>
        <div className="mt-1 text-[11px] text-[color:var(--club-muted)]">
          {new Date(slot.match?.match_date ?? sommerfestMatchDateIso(slot.template.time)).toLocaleString(locale, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </>
    );

    if (detailHref && interactive !== false) {
      return (
        <Link
          key={slot.template.id}
          to={detailHref}
          className="block px-4 py-3 transition-colors hover:bg-[color:var(--club-primary)]/5"
        >
          {inner}
        </Link>
      );
    }

    return (
      <div key={slot.template.id} className="px-4 py-3">
        {inner}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {liveSlots.length > 0 ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
            <Radio className="h-4 w-4" />
            {t.sommerfest2026.liveNowTitle}
          </div>
          <div className="divide-y divide-red-500/20 rounded-xl border border-red-500/20 bg-[color:var(--club-card)]/80">
            {liveSlots.map((slot) => renderSlot(slot))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border",
              category === id
                ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
                : "club-glass text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]",
            )}
          >
            {copy.categories[id]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {grouped.map(([time, timeSlots], groupIndex) => (
          <motion.div
            key={time}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.02 }}
            className="overflow-hidden rounded-2xl club-glass"
          >
            <div className="flex items-center gap-2 border-b border-[color:var(--club-border)] bg-[color:var(--club-tertiary)]/40 px-4 py-2.5">
              <Clock className="h-4 w-4 text-[color:var(--club-primary)]" />
              <span className="font-display text-sm font-bold text-[color:var(--club-foreground)]">{time}</span>
              <span className="text-[11px] text-[color:var(--club-muted)]">
                {timeSlots.length} {timeSlots.length === 1 ? copy.matchSingular : copy.matchPlural}
              </span>
            </div>
            <div className="divide-y divide-[color:var(--club-border)]/60">{timeSlots.map((slot) => renderSlot(slot))}</div>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-[11px] text-[color:var(--club-muted)]">
        {t.sommerfest2026.tournamentAutoRefreshHint}
      </p>
    </div>
  );
}
