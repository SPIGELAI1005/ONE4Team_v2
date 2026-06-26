import { ExternalLink, Mail, MapPin, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { ClubCampEventRow } from "@/lib/club-football-camp-api";
import { getClubFootballCampTemplate } from "@/lib/club-football-camp-templates";
import { cn } from "@/lib/utils";

interface ClubFootballCampCardProps {
  event: ClubCampEventRow;
  className?: string;
}

export function ClubFootballCampCard({ event, className }: ClubFootballCampCardProps) {
  const { t, language } = useLanguage();
  const copy = t.clubFootballCamps;
  const locale = language === "de" ? "de-DE" : "en-GB";
  const template = event.import_key ? getClubFootballCampTemplate(event.import_key) : undefined;
  const highlights = language === "de" ? template?.highlightsDe : template?.highlightsEn;

  const dateRange =
    event.ends_at != null
      ? language === "de"
        ? `${new Date(event.starts_at).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })} bis ${new Date(event.ends_at).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}`
        : `${new Date(event.starts_at).toLocaleDateString(locale, { day: "numeric", month: "short" })} to ${new Date(event.ends_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
      : new Date(event.starts_at).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-[#1e3a5f]/30 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white shadow-lg",
        className,
      )}
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {event.image_url ? (
          <div className="relative min-h-[200px] md:min-h-full">
            <img src={event.image_url} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0f172a]/40" />
          </div>
        ) : null}

        <div className="space-y-3 p-5 sm:p-6">
          <div className="inline-flex rounded-full bg-[#9f1239]/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#fda4af] ring-1 ring-[#fda4af]/30">
            {copy.badge}
          </div>
          <h3 className="font-display text-xl font-bold leading-tight sm:text-2xl">{event.title}</h3>
          {event.public_summary ? (
            <p className="text-sm text-white/80">{event.public_summary}</p>
          ) : event.description ? (
            <p className="line-clamp-3 text-sm text-white/80">{event.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-[11px] text-white/85">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              {dateRange}
            </span>
            {event.target_audience ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <Users className="h-3 w-3" />
                {event.target_audience}
              </span>
            ) : null}
            {event.location ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            ) : null}
          </div>

          {event.partner_name ? (
            <p className="text-xs text-[#fda4af]">
              {copy.partner}: {event.partner_name}
            </p>
          ) : null}

          {highlights?.length ? (
            <ul className="space-y-1 text-xs text-white/85">
              {highlights.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-[#00E676]">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {event.registration_external_url ? (
              <a
                href={event.registration_external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#00E676] px-4 py-2 text-xs font-semibold text-[#14532d] transition hover:brightness-105"
              >
                {copy.register}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {event.contact_email ? (
              <a
                href={`mailto:${event.contact_email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                <Mail className="h-3.5 w-3.5" />
                {event.contact_email}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
