import { CalendarDays, MapPin } from "lucide-react";
import { SommerfestShareButton } from "@/components/sommerfest/sommerfest-share-button";
import { useLanguage } from "@/hooks/use-language";
import { SOMMERFEST_DATE, SOMMERFEST_LOCATION } from "@/lib/tsv-allach-sommerfest-2026";
import { cn } from "@/lib/utils";

interface SommerfestHeroProps {
  variant: "matches" | "events";
  className?: string;
  /** When set, shows a share button for the tournament page link. */
  shareUrl?: string;
  /** Pulsating live glow behind the poster when fixtures are in progress. */
  isLive?: boolean;
}

export function SommerfestHero({ variant, className, shareUrl, isLive = false }: SommerfestHeroProps) {
  const { t, language } = useLanguage();
  const copy = t.sommerfest2026;
  const locale = language === "de" ? "de-DE" : "en-GB";
  const dateLabel = new Date(`${SOMMERFEST_DATE}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#14532d]/20 bg-gradient-to-br from-[#14532d] via-[#166534] to-[#052e16] text-white shadow-lg sm:rounded-3xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#00E676]/20 blur-3xl sm:h-40 sm:w-40" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-[#fbbf24]/15 blur-3xl sm:h-32 sm:w-32" />

      <div className="relative flex min-h-[140px] items-stretch sm:min-h-[168px] lg:grid lg:min-h-[17rem] lg:grid-cols-[1fr_0.95fr] lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2 p-4 pr-3 text-left sm:gap-2.5 sm:p-6 sm:pr-4 lg:py-6">
          <div className="inline-flex max-w-full items-center self-start rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#d9f99d] ring-1 ring-white/15 sm:px-2.5 sm:py-1 sm:text-[10px] lg:px-3 lg:text-[11px]">
            <span className="truncate">{copy.badge}</span>
          </div>
          <h2 className="w-full text-left font-display text-base font-bold leading-tight sm:text-xl md:text-2xl lg:text-3xl">{copy.title}</h2>
          <p className="line-clamp-3 w-full max-w-xl text-left text-[12px] leading-snug text-white/85 sm:line-clamp-none sm:text-sm sm:leading-relaxed md:text-[15px]">
            {variant === "matches" ? copy.matchesLead : copy.eventsLead}
          </p>
          <div className="flex w-full flex-col items-start gap-1.5 text-[10px] text-white/90 sm:gap-2 sm:text-xs lg:flex-row lg:flex-wrap lg:gap-3">
            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-black/20 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
              <CalendarDays className="h-3 w-3 shrink-0 text-[#86efac] sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{dateLabel}</span>
            </span>
            <span className="inline-flex min-w-0 items-start gap-1 rounded-full bg-black/20 px-2 py-1 sm:items-center sm:gap-1.5 sm:px-3 sm:py-1.5">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#86efac] sm:mt-0 sm:h-3.5 sm:w-3.5" />
              <span className="line-clamp-2 sm:truncate">{SOMMERFEST_LOCATION}</span>
            </span>
          </div>
          {shareUrl ? (
            <SommerfestShareButton url={shareUrl} title={copy.title} message={copy.shareMessage} />
          ) : null}
        </div>

        <div
          className={cn(
            "relative w-[46%] min-w-[108px] max-w-[150px] shrink-0 self-stretch overflow-visible rounded-l-xl sm:max-w-[200px] sm:rounded-l-2xl lg:w-auto lg:max-w-none lg:rounded-l-3xl lg:rounded-r-none",
            isLive && "sommerfest-hero-poster-live-wrap",
          )}
        >
          <div className="relative z-[1] h-full overflow-hidden rounded-l-xl bg-[#14532d] sm:rounded-l-2xl lg:rounded-l-3xl lg:rounded-r-none">
            <img
              src="/images/sommerfest/poster-day.png"
              alt={copy.posterAlt}
              className="relative z-[1] h-full w-full object-cover object-right"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
