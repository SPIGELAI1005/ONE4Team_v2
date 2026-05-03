import { useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, LayoutTemplate, Monitor, Newspaper, Smartphone, Tablet, Trophy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HeroImageTint } from "@/components/public-club/HeroImageTint";
import { clubBrandingSurfaceCssVars } from "@/components/public-club/club-theme-provider";
import { getDefaultHeroAssetPublicPath } from "@/lib/club-hero-default-assets";
import type { ClubPublicPageEditorFormLike } from "@/lib/club-public-page-config";
import { isPrimaryForegroundContrastLow, PUBLIC_MICRO_PAGE_ORDER, type PublicMicroPageId } from "@/lib/club-page-settings-helpers";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import logoFallback from "@/assets/one4team-logo.png";

type PreviewViewport = "desktop" | "tablet" | "mobile";

function navPillClass(active: boolean) {
  return [
    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
    active ? "text-[color:var(--club-foreground)] bg-white/10" : "text-[color:var(--club-muted)] bg-transparent",
  ].join(" ");
}

export interface ClubPageAdminLivePublicPreviewProps {
  form: ClubPublicPageEditorFormLike;
}

export function ClubPageAdminLivePublicPreview({ form }: ClubPageAdminLivePublicPreviewProps) {
  const { t } = useLanguage();
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");

  const surfaceStyle = useMemo(
    () =>
      clubBrandingSurfaceCssVars({
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        tertiary_color: form.tertiary_color,
        support_color: form.support_color,
      }),
    [form.primary_color, form.secondary_color, form.tertiary_color, form.support_color]
  );

  const heroSrc = useMemo(() => {
    const fromHero = form.hero_image_url?.trim();
    if (fromHero) return fromHero;
    const fromCover = form.cover_image_url?.trim();
    if (fromCover) return fromCover;
    return getDefaultHeroAssetPublicPath(form.default_hero_asset_id);
  }, [form.cover_image_url, form.default_hero_asset_id, form.hero_image_url]);

  const primaryTint = form.primary_color?.trim() || "#C4A052";

  const navPreviewItems = useMemo(() => {
    const micro = form.microPages;
    const defaultNavLabel = (id: PublicMicroPageId): string => {
      const custom = micro[id]?.label?.trim();
      if (custom) return custom;
      switch (id) {
        case "home":
          return t.common.home;
        case "news":
          return t.clubPage.newsSection;
        case "teams":
          return t.clubPage.teamsSection;
        case "schedule":
          return t.clubPage.scheduleSection;
        case "matches":
          return t.clubPage.matchesSection;
        case "events":
          return t.clubPage.eventsSection;
        case "documents":
          return t.clubPage.documentsSection;
        case "join":
          return t.clubPage.joinNav;
        case "contact":
          return t.clubPage.contactSection;
        default:
          return id;
      }
    };

    const out: { id: PublicMicroPageId; label: string }[] = [];
    for (const id of PUBLIC_MICRO_PAGE_ORDER) {
      const mp = micro[id];
      if (!mp?.enabled || !mp?.showInNav) continue;
      out.push({ id, label: defaultNavLabel(id) });
    }
    return out;
  }, [form.microPages, t.clubPage, t.common.home]);

  const slugPath = form.slug?.trim() ? `/club/${form.slug.trim()}` : "/club/your-club";
  const clubTitle = form.name?.trim() || t.clubPageAdmin.clubNamePlaceholder;
  const description = form.description?.trim() || t.clubPageAdmin.descriptionPlaceholder;
  const lowContrast = isPrimaryForegroundContrastLow(form.primary_color, form.foreground_color);

  const previewMaxClass =
    viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-full";

  const viewportBtn = (id: PreviewViewport, icon: ReactNode, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setViewport(id)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
        viewport === id
          ? "border-primary/40 bg-primary/15 text-foreground"
          : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/60"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 p-5 backdrop-blur-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <LayoutTemplate className="h-4.5 w-4.5 text-primary" />
        </div>
        <h2 className="font-display font-bold text-foreground">{t.clubPageAdmin.livePublicPreview}</h2>
      </div>

      <div className="mb-3 flex flex-col gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <p>{t.clubPageAdmin.livePublicPreviewDraftHint}</p>
        <p>{t.clubPageAdmin.livePublicPreviewPublishHint}</p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-[10px] text-muted-foreground">{t.clubPageAdmin.previewViewportHint}</p>
        <div className="flex flex-wrap gap-1.5">
          {viewportBtn("desktop", <Monitor className="h-3.5 w-3.5" />, t.clubPageAdmin.previewViewportDesktop)}
          {viewportBtn("tablet", <Tablet className="h-3.5 w-3.5" />, t.clubPageAdmin.previewViewportTablet)}
          {viewportBtn("mobile", <Smartphone className="h-3.5 w-3.5" />, t.clubPageAdmin.previewViewportMobile)}
        </div>
      </div>

      {lowContrast ? (
        <Alert variant="destructive" className="mb-4 border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-50">
          <AlertTitle className="text-sm">{t.clubPageAdmin.contrastWarningTitle}</AlertTitle>
          <AlertDescription className="text-sm">{t.clubPageAdmin.lowContrastPrimaryForeground}</AlertDescription>
        </Alert>
      ) : null}

      <div className={cn("mx-auto w-full overflow-hidden rounded-2xl border border-border/60 shadow-sm transition-[max-width] duration-200", previewMaxClass)} style={surfaceStyle}>
        <div className="pointer-events-none border-b border-[color:var(--club-border)] bg-[color:var(--club-tertiary)]/95 px-3 py-2.5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[color:var(--club-border)] bg-white/10">
                <img src={form.logo_url?.trim() || logoFallback} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="max-w-[9rem] truncate font-display text-sm font-bold text-[color:var(--club-foreground)] sm:max-w-[12rem]">
                {clubTitle}
              </span>
            </div>
            <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5 lg:justify-center">
              {navPreviewItems.map((item, index) => (
                <span key={item.id} className={navPillClass(index === 0)} title={item.label}>
                  {item.label}
                </span>
              ))}
            </nav>
            <span
              className="hidden shrink-0 items-center rounded-md px-3 py-1.5 text-xs font-semibold text-white sm:inline-flex"
              style={{ backgroundColor: "var(--club-primary)" }}
            >
              <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
              {t.clubPage.openDashboard}
            </span>
          </div>
        </div>

        <section className="pointer-events-none relative overflow-hidden py-8 sm:py-10">
          <HeroImageTint
            imageUrl={heroSrc}
            alt=""
            tintColor={primaryTint}
            clubTintEnabled={form.hero_club_color_overlay}
            tintStrength={form.hero_tint_strength}
            position={form.hero_object_position?.trim() || "center"}
            variant="duotone"
          />
          <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-20 sm:w-20 sm:rounded-3xl">
              <img src={form.logo_url?.trim() || logoFallback} alt="" className="h-full w-full object-cover" />
            </div>
            <h3 className="mb-2 font-display text-2xl font-bold text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] sm:text-3xl md:text-4xl">
              {clubTitle}
            </h3>
            <p className="mb-1 font-mono text-[10px] text-white/75">{slugPath}</p>
            <p className="mx-auto mb-5 max-w-xl whitespace-pre-line text-xs leading-relaxed text-white/95 sm:text-sm">
              {description}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap">
              <span
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}
              >
                <Trophy className="h-4 w-4 shrink-0" />
                {t.clubPageAdmin.previewSamplePrimaryCta}
              </span>
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm font-medium text-white/95 backdrop-blur">
                <Newspaper className="h-4 w-4 shrink-0" />
                {t.clubPageAdmin.previewSampleSecondaryCta}
              </span>
            </div>
          </div>
        </section>

        <div
          className="pointer-events-none border-t border-[color:var(--club-border)] px-3 py-4"
          style={{ background: `linear-gradient(180deg, var(--club-tertiary) 0%, var(--club-secondary) 100%)` }}
        >
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">
            {t.clubPageAdmin.previewSampleCardsHeading}
          </p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
            <div
              className="rounded-xl border border-[color:var(--club-border)] p-3 text-left"
              style={{ backgroundColor: "color-mix(in srgb, var(--club-card) 85%, transparent)" }}
            >
              <div className="mb-1 text-[10px] font-semibold text-[color:var(--club-foreground)]">{t.clubPageAdmin.previewCardTeamsTitle}</div>
              <div className="text-[9px] leading-snug text-[color:var(--club-muted)]">{t.clubPageAdmin.previewCardTeamsBody}</div>
            </div>
            <div
              className="rounded-xl border border-[color:var(--club-border)] p-3 text-left"
              style={{ backgroundColor: "color-mix(in srgb, var(--club-card) 85%, transparent)" }}
            >
              <div className="mb-1 text-[10px] font-semibold text-[color:var(--club-foreground)]">{t.clubPageAdmin.previewCardScheduleTitle}</div>
              <div className="text-[9px] leading-snug text-[color:var(--club-muted)]">{t.clubPageAdmin.previewCardScheduleBody}</div>
            </div>
            <div
              className="hidden rounded-xl border p-3 text-left sm:block"
              style={{
                borderColor: "color-mix(in srgb, var(--club-support) 55%, var(--club-border))",
                backgroundColor: "color-mix(in srgb, var(--club-support) 12%, var(--club-card))",
              }}
            >
              <div className="mb-1 text-[10px] font-semibold text-[color:var(--club-foreground)]">{t.clubPageAdmin.previewCardJoinTitle}</div>
              <div className="text-[9px] leading-snug text-[color:var(--club-muted)]">{t.clubPageAdmin.previewCardJoinBody}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
