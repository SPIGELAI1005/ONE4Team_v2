import type { ReactNode } from "react";
import type { PublicClubRecord } from "@/lib/public-club-models";
import { hexToRgb, parseHexRgb, relativeLuminance } from "@/lib/hex-to-rgb";

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
  foreground_color?: string | null;
  /** When empty, muted text is derived from brand surfaces. */
  muted_color?: string | null;
}): React.CSSProperties {
  const primary = branding.primary_color?.trim() || "#C4A052";
  const secondary = branding.secondary_color?.trim() || "#1E293B";
  const tertiary = branding.tertiary_color?.trim() || "#0F172A";
  const support = branding.support_color?.trim() || "#22C55E";

  const surfaceL = Math.max(relativeLuminance(tertiary), relativeLuminance(secondary));
  /** Bright brand surfaces need dark body copy; dark surfaces keep light text. */
  const lightBrand = surfaceL > 0.48;
  const vividSecondary = relativeLuminance(secondary) > 0.28;

  const autoForeground = lightBrand ? mixTowardBlack(tertiary, 0.88) : mixTowardWhite(tertiary, 0.94);
  const autoMuted = lightBrand
    ? mixTowardBlack(secondary, 0.58)
    : vividSecondary
      ? mixTowardWhite(autoForeground, 0.06)
      : mixTowardWhite(tertiary, 0.68);

  const foreground = branding.foreground_color?.trim() || autoForeground;
  const muted = branding.muted_color?.trim() || autoMuted;

  const glassTokens = lightBrand
    ? {
        "--club-card": "rgba(255,255,255,0.52)",
        "--club-border": "rgba(255,255,255,0.68)",
        "--club-nav-glass": "rgba(255,255,255,0.62)",
        "--club-glass-blur": "32px",
        "--club-glass-saturate": "185%",
        "--club-glass-shadow":
          "0 8px 32px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
        "--club-glass-shadow-hover":
          "0 12px 40px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.62), inset 0 1px 0 rgba(255,255,255,0.65)",
        "--club-glass-nav-shadow": "0 4px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.5)",
        "--club-glass-border-hover": "rgba(255,255,255,0.78)",
        "--club-glass-edge-top": "rgba(255,255,255,0.85)",
        "--club-glass-edge-mid": "rgba(255,255,255,0.35)",
        "--club-glass-edge-bottom": "rgba(255,255,255,0.55)",
        "--club-glass-shine-top": "rgba(255,255,255,0.35)",
        "--club-glass-inset-top": "rgba(255,255,255,0.45)",
      }
    : {
        "--club-card": "rgba(255,255,255,0.10)",
        "--club-border": "rgba(255,255,255,0.22)",
        "--club-nav-glass": "rgba(255,255,255,0.08)",
        "--club-glass-blur": "32px",
        "--club-glass-saturate": "180%",
        "--club-glass-shadow":
          "0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.16)",
        "--club-glass-shadow-hover":
          "0 12px 44px rgba(0,0,0,0.26), 0 0 0 1px rgba(255,255,255,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
        "--club-glass-nav-shadow": "0 4px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.12)",
        "--club-glass-border-hover": "rgba(255,255,255,0.34)",
        "--club-glass-edge-top": "rgba(255,255,255,0.50)",
        "--club-glass-edge-mid": "rgba(255,255,255,0.14)",
        "--club-glass-edge-bottom": "rgba(255,255,255,0.28)",
        "--club-glass-shine-top": "rgba(255,255,255,0.18)",
        "--club-glass-inset-top": "rgba(255,255,255,0.12)",
      };

  const brandTokens = {
    "--club-primary": primary,
    "--club-primary-rgb": hexToRgb(primary),
    "--club-secondary": secondary,
    "--club-tertiary": tertiary,
    "--club-support": support,
    "--club-foreground": foreground,
    "--club-muted": muted,
  };

  return {
    ...brandTokens,
    ...glassTokens,
  } as React.CSSProperties;
}

export function publicClubCssVars(club: PublicClubRecord | null): React.CSSProperties {
  return clubBrandingSurfaceCssVars({
    primary_color: club?.primary_color ?? "#C4A052",
    secondary_color: club?.secondary_color ?? "#1E293B",
    tertiary_color: club?.tertiary_color ?? "#0F172A",
    support_color: club?.support_color ?? "#22C55E",
    foreground_color: club?.foreground_color,
    muted_color: club?.muted_color,
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
