import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Flame,
  MapPin,
  Megaphone,
  Music2,
  Newspaper,
  Users,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  SOMMERFEST_DATE,
  SOMMERFEST_PITCHES,
  sommerfestFeedSorted,
  type SommerfestFeedItem,
} from "@/lib/tsv-allach-sommerfest-2026";
import type { ClubCampEventRow } from "@/lib/club-football-camp-api";
import { ClubFootballCampCard } from "@/components/events/club-football-camp-card";
import { cn } from "@/lib/utils";

const FILTER_IDS = ["all", "club", "teams", "pitches", "news", "camps"] as const;
type FeedFilter = (typeof FILTER_IDS)[number];

const accentStyles: Record<SommerfestFeedItem["accent"], string> = {
  green: "from-[#14532d]/15 to-[#00E676]/10 border-[#00E676]/25",
  yellow: "from-amber-400/15 to-amber-200/10 border-amber-400/30",
  pink: "from-fuchsia-500/15 to-pink-300/10 border-fuchsia-400/30",
  neutral: "from-muted/50 to-muted/20 border-border",
  rose: "from-rose-500/12 to-rose-300/8 border-rose-400/25",
};

function feedIcon(item: SommerfestFeedItem) {
  switch (item.kind) {
    case "news":
      return Newspaper;
    case "evening":
      return Music2;
    case "pitch_booking":
      return MapPin;
    case "festival":
      return Flame;
    default:
      return Megaphone;
  }
}

function matchesFilter(item: SommerfestFeedItem, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "camps") return false;
  if (filter === "news") return item.kind === "news";
  if (filter === "club") return item.teamScope == null;
  if (filter === "teams") return Boolean(item.teamScope);
  if (filter === "pitches") return item.kind === "pitch_booking" || item.kind === "tournament";
  return true;
}

export function SommerfestEventsHub({ campEvents = [] }: { campEvents?: ClubCampEventRow[] }) {
  const { t, language } = useLanguage();
  const copy = t.sommerfest2026;
  const locale = language === "de" ? "de-DE" : "en-GB";
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);

  const feed = useMemo(() => {
    if (filter === "camps") return [];
    return sommerfestFeedSorted().filter((item) => matchesFilter(item, filter));
  }, [filter]);

  const showCamps = filter === "all" || filter === "camps";

  const dayLabel = new Date(`${SOMMERFEST_DATE}T12:00:00`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#14532d]/20 bg-gradient-to-b from-[#14532d] to-[#166534] p-4 text-white shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#86efac]">{copy.calendarLabel}</p>
          <p className="mt-2 font-display text-3xl font-bold leading-none">11</p>
          <p className="text-sm text-white/85">{dayLabel} 2026</p>
          <div className="mt-4 space-y-2 text-[11px] text-white/80">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {copy.dayProgram}
            </p>
            <p className="flex items-center gap-1.5">
              <Music2 className="h-3.5 w-3.5" />
              {copy.eveningProgram}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.pitchAssetsTitle}
          </p>
          <div className="space-y-1.5">
            {SOMMERFEST_PITCHES.map((pitch) => (
              <div
                key={pitch.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-2.5 py-2 text-xs"
              >
                <span className="font-medium text-foreground">
                  {language === "de" ? pitch.labelDe : pitch.labelEn}
                </span>
                <MapPin className="h-3 w-3 text-[#16a34a]" />
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap gap-2">
          {FILTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === id
                  ? "bg-[#00E676] text-[#14532d]"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {copy.feedFilters[id]}
            </button>
          ))}
        </div>

        <div className="relative space-y-0">
          {showCamps && campEvents.length > 0 ? (
            <div className="mb-5 space-y-3">
              {campEvents.map((camp) => (
                <ClubFootballCampCard key={camp.id} event={camp} />
              ))}
            </div>
          ) : null}

          {filter !== "camps" ? (
            <>
          <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" aria-hidden />
          <AnimatePresence initial={false}>
            {feed.map((item, index) => {
              const Icon = feedIcon(item);
              const title = language === "de" ? item.titleDe : item.titleEn;
              const summary = language === "de" ? item.summaryDe : item.summaryEn;
              const body = language === "de" ? item.bodyDe : item.bodyEn;
              const author = language === "de" ? item.authorDe : item.authorEn;
              const isNews = item.kind === "news";

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="relative pl-10 pb-4"
                >
                  <div className="absolute left-2.5 top-4 z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-[#16a34a]" />
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl border bg-gradient-to-br p-4 shadow-sm",
                      accentStyles[item.accent],
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.time}</span>
                        {item.endTime ? <span>– {item.endTime}</span> : null}
                        {item.pitchLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.pitchLabel}
                          </span>
                        ) : null}
                      </div>
                      {item.teamScope ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                          <Users className="h-3 w-3" />
                          {item.teamScope}
                        </span>
                      ) : (
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                          {copy.clubWide}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
                    {summary ? <p className="mt-1 text-sm text-muted-foreground">{summary}</p> : null}

                    {isNews && body ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedNewsId((current) => (current === item.id ? null : item.id))
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532d] dark:text-[#86efac]"
                        >
                          {expandedNewsId === item.id ? copy.readLess : copy.readMore}
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              expandedNewsId === item.id && "rotate-180",
                            )}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {expandedNewsId === item.id ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                                {body}
                              </p>
                              {author ? (
                                <p className="mt-3 text-xs font-medium text-muted-foreground">{author} 🍀💚⚽</p>
                              ) : null}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
            </>
          ) : filter === "camps" && campEvents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {copy.campsEmptyHint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
