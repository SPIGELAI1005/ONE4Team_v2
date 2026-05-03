import type { ReactNode } from "react";
import type { PublicClubRecord } from "@/lib/public-club-models";
import { hexToRgb, parseHexRgb } from "@/lib/hex-to-rgb";

function mixTowardWhite(hex: string, amount: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function mixTowardBlack(hex: string, amount: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r * (1 - t));
  const g = Math.round(rgb.g * (1 - t));
  const b = Math.round(rgb.b * (1 - t));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Same surface tokens as the public microsite, from raw brand colors (e.g. admin live preview). */
export function clubBrandingSurfaceCssVars(branding: {
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  support_color: string;
}): React.CSSProperties {
  const primary = branding.primary_color?.trim() || "#C4A052";
  const secondary = branding.secondary_color?.trim() || "#1E293B";
  const tertiary = branding.tertiary_color?.trim() || "#0F172A";
  const support = branding.support_color?.trim() || "#22C55E";
  return {
    "--club-primary": primary,
    /** Comma-separated `r, g, b` for `rgba(var(--club-primary-rgb), a)` (e.g. hero tint). */
    "--club-primary-rgb": hexToRgb(primary),
    "--club-secondary": secondary,
    "--club-tertiary": tertiary,
    "--club-support": support,
    "--club-foreground": mixTowardWhite(tertiary, 0.94),
    "--club-muted": mixTowardWhite(tertiary, 0.52),
    "--club-card": `${mixTowardBlack(secondary, 0.25)}b3`,
    "--club-border": mixTowardWhite(tertiary, 0.14),
  } as React.CSSProperties;
}

export function publicClubCssVars(club: PublicClubRecord | null): React.CSSProperties {
  return clubBrandingSurfaceCssVars({
    primary_color: club?.primary_color ?? "#C4A052",
    secondary_color: club?.secondary_color ?? "#1E293B",
    tertiary_color: club?.tertiary_color ?? "#0F172A",
    support_color: club?.support_color ?? "#22C55E",
  });
}

export function ClubThemeProvider({ club, children }: { club: PublicClubRecord | null; children: ReactNode }) {
  const style = publicClubCssVars(club);
  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)] text-[color:var(--club-foreground)]"
      style={{ ...style, background: `linear-gradient(180deg, var(--club-tertiary) 0%, var(--club-secondary) 55%, var(--club-tertiary) 100%)` }}
    >
      {children}
    </div>
  );
}
