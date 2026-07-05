import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { SommerfestShareButton } from "@/components/sommerfest/sommerfest-share-button";
import { useOptionalPublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { SOMMERFEST_LOCATION } from "@/lib/tsv-allach-sommerfest-2026";
import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/one4team-logo.png";

interface SommerfestHeroProps {
  variant: "matches" | "events";
  className?: string;
  /** When set, shows a share button for the tournament page link. */
  shareUrl?: string;
  /** Pulsating live glow when fixtures are in progress. */
  isLive?: boolean;
  clubLogoUrl?: string | null;
  clubName?: string | null;
}

export function SommerfestHero({
  variant,
  className,
  shareUrl,
  isLive = false,
  clubLogoUrl,
  clubName,
}: SommerfestHeroProps) {
  const { t } = useLanguage();
  const copy = t.sommerfest2026;
  const publicClub = useOptionalPublicClub();
  const { clubId } = useClubId();
  const [fetchedClubBranding, setFetchedClubBranding] = useState<{ logoUrl: string | null; name: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (clubLogoUrl?.trim() || publicClub?.club?.logo_url?.trim() || publicClub || !clubId) {
      setFetchedClubBranding(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("clubs")
      .select("logo_url, name")
      .eq("id", clubId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setFetchedClubBranding({
          logoUrl: data?.logo_url?.trim() || null,
          name: data?.name?.trim() || null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, clubLogoUrl, publicClub?.club?.logo_url]);

  const resolvedLogoUrl =
    clubLogoUrl?.trim() || publicClub?.club?.logo_url?.trim() || fetchedClubBranding?.logoUrl || defaultLogo;
  const resolvedClubName = clubName?.trim() || publicClub?.club?.name?.trim() || fetchedClubBranding?.name || "";
  const logoAlt = resolvedClubName
    ? t.clubPage.clubLogoAlt.replace("{name}", resolvedClubName)
    : copy.posterAlt;

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
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2 p-4 pr-2 text-left sm:gap-2.5 sm:p-6 sm:pr-4 lg:py-6">
          <div className="inline-flex max-w-full items-center self-start rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#d9f99d] ring-1 ring-white/15 sm:px-2.5 sm:py-1 sm:text-[10px] lg:px-3 lg:text-[11px]">
            <span className="truncate">{copy.badge}</span>
          </div>
          <h2 className="w-full text-left font-display text-base font-bold leading-tight sm:text-xl md:text-2xl lg:text-3xl">{copy.title}</h2>
          <p className="line-clamp-3 w-full max-w-xl text-left text-[12px] leading-snug text-white/85 sm:line-clamp-none sm:text-sm sm:leading-relaxed md:text-[15px]">
            {variant === "matches" ? copy.matchesLead : copy.eventsLead}
          </p>
          <div className="flex w-full flex-col items-start gap-1.5 text-[10px] text-white/90 sm:gap-2 sm:text-xs">
            <span className="inline-flex min-w-0 items-start gap-1 rounded-full bg-black/20 px-2 py-1 sm:items-center sm:gap-1.5 sm:px-3 sm:py-1.5">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#86efac] sm:mt-0 sm:h-3.5 sm:w-3.5" />
              <span className="line-clamp-2 sm:truncate">{SOMMERFEST_LOCATION}</span>
            </span>
          </div>
          {shareUrl ? (
            <SommerfestShareButton url={shareUrl} title={copy.title} message={copy.shareMessage} />
          ) : null}
        </div>

        {/* Mobile: club logo — circular, transparent to hero; live glow hugs the logo */}
        <div className="relative flex w-[38%] min-w-[88px] max-w-[128px] shrink-0 items-center justify-center self-stretch overflow-visible pr-4 sm:hidden">
          <div
            className={cn(
              "relative aspect-square w-full max-w-[6.75rem] bg-transparent",
              isLive && "sommerfest-hero-logo-live-wrap",
            )}
          >
            <img
              src={resolvedLogoUrl}
              alt={logoAlt}
              className="relative z-[1] h-full w-full rounded-full bg-transparent object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>

        {/* Tablet/desktop: event poster */}
        <div
          className={cn(
            "relative hidden aspect-auto w-[46%] min-w-[108px] max-w-[200px] shrink-0 self-stretch overflow-visible rounded-l-2xl sm:block lg:w-auto lg:max-w-none lg:rounded-l-3xl lg:rounded-r-none",
            isLive && "sommerfest-hero-poster-live-wrap",
          )}
        >
          <div className="relative z-[1] h-full overflow-hidden rounded-l-2xl bg-[#14532d] lg:rounded-l-3xl lg:rounded-r-none">
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
