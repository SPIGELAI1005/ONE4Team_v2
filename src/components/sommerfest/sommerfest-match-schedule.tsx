import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Trophy } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";
import {
  sommerfestMatchesByCategory,
  type SommerfestMatch,
  type SommerfestMatchCategory,
} from "@/lib/tsv-allach-sommerfest-2026";
import { sommerfestEffectiveKickoffTime } from "@/lib/tsv-allach-sommerfest-match-sync";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: (SommerfestMatchCategory | "all")[] = [
  "all",
  "kleinfeld",
  "kompaktfeld",
  "damen",
  "herren",
];

function groupByEffectiveTime(
  matches: SommerfestMatch[],
  dbMatches?: ReadonlyMap<string, { match_date: string }>,
) {
  const map = new Map<string, SommerfestMatch[]>();
  for (const match of matches) {
    const time = sommerfestEffectiveKickoffTime(match, dbMatches?.get(match.id));
    const bucket = map.get(time) ?? [];
    bucket.push(match);
    map.set(time, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

interface SommerfestMatchScheduleProps {
  teams?: { id: string; name: string }[];
  dbMatches?: ReadonlyMap<string, { match_date: string }>;
  onMatchClick?: (match: SommerfestMatch) => void;
  interactive?: boolean;
}

export function SommerfestMatchSchedule({
  teams = [],
  dbMatches,
  onMatchClick,
  interactive = false,
}: SommerfestMatchScheduleProps) {
  const { t } = useLanguage();
  const copy = t.sommerfest2026;
  const [category, setCategory] = useState<SommerfestMatchCategory | "all">("all");

  const filtered = useMemo(() => sommerfestMatchesByCategory(category), [category]);
  const grouped = useMemo(() => groupByEffectiveTime(filtered, dbMatches), [filtered, dbMatches]);

  function displayTeamName(label: string) {
    return resolveCanonicalYouthTeamName(teams, label);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              category === id
                ? "bg-[#00E676] text-[#14532d] shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:border-[#00E676]/40 hover:text-foreground",
            )}
          >
            {copy.categories[id]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {grouped.map(([time, slotMatches], groupIndex) => (
          <motion.div
            key={time}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.03 }}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-4 py-2.5">
              <Clock className="h-4 w-4 text-[#16a34a]" />
              <span className="font-display text-sm font-bold text-foreground">{time}</span>
              <span className="text-[11px] text-muted-foreground">
                {slotMatches.length} {slotMatches.length === 1 ? copy.matchSingular : copy.matchPlural}
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {slotMatches.map((match) => (
                <article
                  key={match.id}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => onMatchClick?.(match) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onMatchClick?.(match);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                    interactive &&
                      "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#14532d]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#14532d] dark:text-[#86efac]">
                        <Trophy className="h-3 w-3" />
                        {copy.categories[match.category]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {match.pitchLabel}
                      </span>
                    </div>
                    <p className="font-display text-base font-semibold text-foreground">
                      {displayTeamName(match.homeTeam)}
                      <span className="mx-2 text-muted-foreground font-normal">vs</span>
                      {displayTeamName(match.awayTeam)}
                    </p>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:self-center">
                    {copy.duration[match.durationLabelKey]}
                  </span>
                </article>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
