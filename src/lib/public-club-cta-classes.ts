/**
 * Hover styles aligned with app `Button` variants (`accent` / crimson in index.css).
 * Use `!` on hovers so they win over inline `backgroundColor` / `color` from club branding.
 */
import type { CSSProperties } from "react";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";

/** Full crimson/accent fill on hover. Matches hero “View Teams” / “Next Training”. */
export const clubCtaAccentHoverClass =
  "transition-colors hover:!border-accent/50 hover:!bg-accent hover:!text-accent-foreground";

export const clubCtaFillHoverClass = clubCtaAccentHoverClass;

export const clubCtaOutlineHoverClass = clubCtaAccentHoverClass;

/** Glass hero links (View Teams, Next Training) on the home hero image. */
export const clubCtaHeroGlassLinkClass = [
  "inline-flex min-h-[44px] w-full sm:w-auto sm:min-w-[140px] items-center justify-center gap-2 rounded-full",
  "border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white",
  "shadow-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]",
  clubCtaAccentHoverClass,
].join(" ");

/** Compact filled link/button on club surfaces (events cards, etc.). */
export const clubCtaPrimaryLinkClass = [
  "inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-xs font-semibold",
  clubCtaAccentHoverClass,
].join(" ");

/** Compact outline link/button on club surfaces. */
export const clubCtaOutlineLinkClass = [
  "club-glass club-glass-interactive",
  "inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-xs font-semibold",
  "text-[color:var(--club-foreground)]",
  clubCtaAccentHoverClass,
].join(" ");

/**
 * Outline buttons on club gradient surfaces.
 * Overrides shadcn `outline` variant `bg-background` (often white) which breaks contrast with `--club-foreground`.
 */
export const clubCtaOutlineButtonClass = [
  "club-glass club-glass-interactive rounded-full",
  "border-[color:var(--club-border)]",
  "!bg-transparent",
  "text-[color:var(--club-foreground)]",
  clubCtaOutlineHoverClass,
].join(" ");

export function clubCtaPrimaryInlineStyle(primaryColor?: string | null): CSSProperties {
  return {
    backgroundColor: "var(--club-primary)",
    color: readableTextOnSolid(primaryColor || "#C4A052"),
  };
}

/**
 * Attendance RSVP: “I'm coming” on green club cards (mirrors decline button layout).
 * Standby / hover / selected: fluorescent green fill optional on hover; label always dark green.
 */
export const clubAttendanceComingStandbyClass = [
  "!border-white/70 !bg-white/95 !text-[#14532d] shadow-sm",
  "transition-colors",
  "hover:!border-[#00E676] hover:!bg-[#00E676] hover:!text-[#14532d]",
  "[&_svg]:!text-[#14532d]",
].join(" ");

export const clubAttendanceComingActiveClass = [
  "border-[#00E676] bg-[#00E676] !text-[#14532d]",
  "hover:bg-[#00E676]/90 hover:!text-[#14532d]",
  "[&_svg]:!text-[#14532d]",
  "transition-colors",
].join(" ");
