import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { parseHexRgb } from "@/lib/hex-to-rgb";

export type HeroImageTintVariant = "soft" | "strong" | "duotone" | "monochrome";

export interface HeroImageTintProps {
  imageUrl: string;
  alt: string;
  tintColor: string;
  /** Overlay opacity scale, default 0.45 (combined with variant presets). */
  tintStrength?: number;
  /** When false, club-color duotone layers are skipped (image + light readability gradient only). */
  clubTintEnabled?: boolean;
  /** CSS `object-position` for the image (e.g. `center`, `50% 20%`). */
  position?: string;
  variant?: HeroImageTintVariant;
  className?: string;
}

const BASE_IMG_FILTER = "grayscale(0.9) contrast(1.05) brightness(0.85)";

const VARIANT_IMG_FILTER: Record<HeroImageTintVariant, string> = {
  soft: `${BASE_IMG_FILTER} saturate(0.85)`,
  strong: `${BASE_IMG_FILTER} contrast(1.12) brightness(0.78)`,
  duotone: `${BASE_IMG_FILTER} saturate(0.7)`,
  monochrome: "grayscale(1) contrast(1.08) brightness(0.82)",
};

const VARIANT_BLEND: Record<HeroImageTintVariant, CSSProperties["mixBlendMode"]> = {
  soft: "overlay",
  strong: "multiply",
  duotone: "color",
  monochrome: "multiply",
};

function tintOverlayBackground(tintColor: string, rgbComma: string | null, alpha: number): string {
  const trimmed = tintColor.trim();
  if (rgbComma) return `rgba(${rgbComma}, ${alpha})`;
  if (trimmed.startsWith("rgb(") || trimmed.startsWith("rgba(")) return trimmed;
  return `color-mix(in srgb, ${trimmed} ${Math.round(alpha * 100)}%, transparent)`;
}

export function HeroImageTint({
  imageUrl,
  alt,
  tintColor,
  tintStrength = 0.45,
  clubTintEnabled = true,
  position = "center",
  variant = "duotone",
  className,
}: HeroImageTintProps) {
  const trimmedUrl = imageUrl?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [trimmedUrl]);
  const hasImage = Boolean(trimmedUrl) && !imageFailed;

  const rgbComma = useMemo(() => {
    const t = tintColor.trim();
    if (t.startsWith("#")) {
      const parsed = parseHexRgb(t);
      return parsed ? `${parsed.r}, ${parsed.g}, ${parsed.b}` : null;
    }
    return null;
  }, [tintColor]);

  const tintAlpha = useMemo(() => {
    const m =
      variant === "strong" ? 0.95 : variant === "soft" ? 0.75 : variant === "monochrome" ? 0.55 : 0.85;
    return Math.min(0.95, Math.max(0.08, tintStrength * m));
  }, [tintStrength, variant]);

  const glowAlpha = useMemo(() => Math.min(0.45, tintStrength * 0.55), [tintStrength]);

  const tintLayerStyle = useMemo((): CSSProperties => {
    const base = tintOverlayBackground(tintColor, rgbComma, tintAlpha);
    return {
      mixBlendMode: VARIANT_BLEND[variant],
      background: base,
    };
  }, [rgbComma, tintAlpha, tintColor, variant]);

  const radialStyle = useMemo((): CSSProperties => {
    const core = rgbComma ?? "var(--club-primary-rgb)";
    return {
      background: `radial-gradient(circle at 72% 18%, rgba(${core}, ${glowAlpha}) 0%, transparent 52%)`,
    };
  }, [glowAlpha, rgbComma]);

  const darkGradientStyle = useMemo(
    (): CSSProperties => ({
      background: "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(0,0,0,0.35), rgba(0,0,0,0.15))",
    }),
    []
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {hasImage ? (
        <img
          src={trimmedUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: position,
            filter: clubTintEnabled ? VARIANT_IMG_FILTER[variant] : "brightness(0.96)",
          }}
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgba(var(--club-primary-rgb), 0.35) 0%, rgba(var(--club-primary-rgb), 0.08) 45%, var(--club-secondary) 100%)`,
          }}
        />
      )}
      {clubTintEnabled ? (
        <>
          <div className="absolute inset-0" style={tintLayerStyle} />
          <div className="absolute inset-0" style={radialStyle} />
          <div className="absolute inset-0" style={darkGradientStyle} />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      )}
    </div>
  );
}
