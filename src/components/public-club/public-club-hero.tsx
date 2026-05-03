import type { ReactNode } from "react";
import type { PublicClubRecord } from "@/lib/public-club-models";
import logo from "@/assets/one4team-logo.png";
import { Link } from "react-router-dom";
import { HeroImageTint } from "@/components/public-club/HeroImageTint";
import { getDefaultHeroAssetPublicPath } from "@/lib/club-hero-default-assets";
import { publicClubSectionContainer } from "@/components/public-club/public-club-section";
import { useLanguage } from "@/hooks/use-language";

interface PublicClubHeroProps {
  club: PublicClubRecord;
  /** When set, replaces the default `club.name` main heading (e.g. “Join …”). */
  headline?: string | null;
  subtitle?: string | null;
  children?: ReactNode;
  /** Quick links row (e.g. schedule / teams) */
  quickLinks?: ReactNode;
  /** When set, replaces the default primary + secondary CTA row (e.g. multi-button home hero). */
  heroActions?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  footNote?: ReactNode;
}

export function PublicClubHero({
  club,
  headline,
  subtitle,
  children,
  quickLinks,
  heroActions,
  primaryAction,
  secondaryAction,
  footNote,
}: PublicClubHeroProps) {
  const { t } = useLanguage();
  const primary = club.primary_color?.trim() || "#C4A052";
  /** 1) uploaded hero 2) uploaded cover 3) configured default slot 4) missing file → HeroImageTint gradient */
  const heroSrc =
    club.hero_image_url?.trim() ||
    club.cover_image_url?.trim() ||
    getDefaultHeroAssetPublicPath(club.default_hero_asset_id);
  const heroAlt = `${club.name} — ${t.clubPage.heroImageAltContext}`;

  return (
    <section className="relative py-12 sm:py-16 md:py-24 lg:py-28 overflow-hidden">
      <HeroImageTint
        imageUrl={heroSrc}
        alt={heroAlt}
        tintColor={primary}
        clubTintEnabled={club.hero_club_color_overlay}
        tintStrength={club.hero_tint_strength}
        position={club.hero_object_position || "center"}
        variant="duotone"
      />
      <div className={`${publicClubSectionContainer} relative z-10`}>
        <div className="text-center max-w-4xl mx-auto max-md:flex max-md:flex-col max-md:min-h-[min(52dvh,24rem)] md:block">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mx-auto mb-5 sm:mb-6 border border-white/20 bg-white/10 backdrop-blur overflow-hidden flex items-center justify-center">
            <img
              src={club.logo_url || logo}
              alt={t.clubPage.clubLogoAlt.replace("{name}", club.name)}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-1 text-white drop-shadow-[0_2px_28px_rgba(0,0,0,0.55)] [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
            {headline?.trim() ? headline.trim() : club.name}
          </h1>
          {subtitle?.trim() ? (
            <p className="text-base sm:text-lg md:text-xl text-white/95 max-w-2xl mx-auto mb-5 sm:mb-6 leading-relaxed whitespace-pre-line px-1 drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
              {subtitle}
            </p>
          ) : (
            children
          )}
          {quickLinks ? <div className="mb-5 sm:mb-6 w-full max-w-md mx-auto px-1">{quickLinks}</div> : null}
          {heroActions ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              {heroActions}
            </div>
          ) : (
            <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 flex-wrap md:w-auto">
              {primaryAction}
              {secondaryAction}
            </div>
          )}
          {footNote ? <div className="mt-6 text-xs text-white/70">{footNote}</div> : null}
          <Link
            to="/"
            className="group mt-8 sm:mt-10 max-md:mt-auto max-md:pt-6 flex flex-col items-center gap-2 text-center text-[0.65rem] text-white/60 hover:text-white/85"
          >
            <span className="underline-offset-2 group-hover:underline">{t.clubPage.heroPoweredBy}</span>
            <img src={logo} alt="" width={28} height={28} className="h-7 w-7 object-contain opacity-80" />
          </Link>
        </div>
      </div>
    </section>
  );
}
