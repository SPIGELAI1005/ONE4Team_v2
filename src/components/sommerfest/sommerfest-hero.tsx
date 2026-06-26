import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { SOMMERFEST_DATE, SOMMERFEST_LOCATION } from "@/lib/tsv-allach-sommerfest-2026";
import { cn } from "@/lib/utils";

interface SommerfestHeroProps {
  variant: "matches" | "events";
  className?: string;
}

export function SommerfestHero({ variant, className }: SommerfestHeroProps) {
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
        "relative overflow-hidden rounded-3xl border border-[#14532d]/20 bg-gradient-to-br from-[#14532d] via-[#166534] to-[#052e16] p-5 sm:p-6 text-white shadow-lg",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#00E676]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-[#fbbf24]/15 blur-3xl" />

      <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#d9f99d] ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.badge}
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{copy.title}</h2>
          <p className="max-w-xl text-sm text-white/85 sm:text-[15px]">
            {variant === "matches" ? copy.matchesLead : copy.eventsLead}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-white/90">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[#86efac]" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#86efac]" />
              {SOMMERFEST_LOCATION}
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <div className="overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-md">
            <img
              src="/images/sommerfest/poster-day.png"
              alt={copy.posterAlt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
