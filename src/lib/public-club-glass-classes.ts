import type { CSSProperties } from "react";

import { clubBrandingSurfaceCssVars } from "@/components/public-club/club-theme-provider";

/**
 * Apple-style liquid glass surfaces for the public club microsite.
 * CSS: `club-glass` / `club-glass-interactive` in `index.css` (theme tokens from ClubThemeProvider).
 */

/** Static panels (stats, empty states, accordions). */
export const clubGlassPanelClass = "club-glass rounded-2xl";

/** Tappable cards and list rows - subtle hover glow, no scale lift. */
export const clubGlassInteractiveClass =
  "club-glass club-glass-interactive rounded-2xl transition-[box-shadow,border-color] duration-300";

/** Large hero-style panels (news feature, modals). */
export const clubGlassPanelLgClass = "club-glass rounded-3xl";

/** Panel tint opacity (5% white glass - dark brand fills looked opaque with backdrop-blur). */
export const clubMobileMenuGlassOpacity = 0.05;

export const clubMobileMenuGlassOverlayClass = "bg-black/25";

/** Hamburger sheet - translucent club-themed glass. */
export const clubMobileMenuGlassPanelClass = [
  "border border-white/15 !bg-transparent shadow-none",
  "text-[color:var(--club-foreground)] backdrop-blur-xl backdrop-saturate-150",
].join(" ");

/** AI 4 T modal on public club pages - bright white glass (readable on any club theme). */
export const clubAi4tModalPanelClass = [
  "rounded-3xl border border-white/80",
  "bg-white/90 backdrop-blur-2xl",
  "shadow-[0_24px_80px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]",
].join(" ");

export const clubAi4tModalOverlayClass = "bg-white/40 backdrop-blur-md";

/** Messages hub modal - same readable white glass as AI 4 T. */
export const clubMessagesHubPanelClass = clubAi4tModalPanelClass;

/** Compact modals (request invite, etc.) - readable white glass on any club theme. */
export const clubReadableModalPanelClass = clubAi4tModalPanelClass;

export const clubReadableModalOverlayClass = clubAi4tModalOverlayClass;

/** Portaled menus/popovers above club modals (overlay z-[60], nested dialogs z-[70]). */
export const clubModalPopoverContentClass = "z-[80]";

/** Form fields on white-glass modals — high contrast on busy club backgrounds. */
export const clubModalFormLabelClass = "text-sm font-medium text-neutral-900";

export const clubModalFormInputClass =
  "border-neutral-300 bg-white text-neutral-900 shadow-sm placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)] focus-visible:ring-offset-0";

export const clubModalFormTextareaClass = [
  "w-full rounded-xl border px-3 py-2 text-sm",
  clubModalFormInputClass,
  "resize-y min-h-[100px]",
].join(" ");

/** List rows inside the messages hub (light surface). */
export const clubMessagesHubCardClass =
  "rounded-2xl border border-neutral-200/90 bg-neutral-50 transition-[background-color,border-color,box-shadow] duration-200 hover:border-neutral-300 hover:bg-white hover:shadow-sm";

/** Compact chips and filter pills on glass surfaces. */
export const clubGlassChipClass =
  "club-glass club-glass-interactive rounded-full border border-[color:var(--club-border)]";

/** Search / text inputs on club pages. */
export const clubGlassInputClass =
  "club-glass rounded-xl border border-[color:var(--club-border)] bg-transparent text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)]";

/** White-surface inputs inside embedded Communication (modal on public club). */
export const clubEmbeddedLightInputShellClass =
  "border border-neutral-200/90 bg-white text-neutral-900 shadow-sm";

export const clubEmbeddedLightInputFieldClass =
  "border-0 bg-transparent shadow-none focus-visible:ring-0 text-neutral-900 placeholder:text-neutral-500 caret-neutral-900 [color-scheme:light]";

export function clubMobileMenuGlassStyle(
  branding: Parameters<typeof clubBrandingSurfaceCssVars>[0],
): CSSProperties {
  return {
    ...clubBrandingSurfaceCssVars(branding),
    backgroundColor: `rgba(255, 255, 255, ${clubMobileMenuGlassOpacity})`,
    backgroundImage: "none",
  };
}
