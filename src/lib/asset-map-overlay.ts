import type { CSSProperties } from "react";

export type AssetMapOverlayFit = "contain" | "cover";
export type AssetMapPitchDisplay = "cells" | "outlines" | "both";

export interface AssetMapOverlay {
  url: string | null;
  opacity: number;
  scale: number;
  offset_x: number;
  offset_y: number;
  /** Clockwise rotation in degrees (0–359). */
  rotation: number;
  /** contain = full image visible; cover = crop to fill the grid. */
  fit: AssetMapOverlayFit;
  /** How pitches render on the Combined map. */
  pitch_display: AssetMapPitchDisplay;
}

export const ASSET_MAP_OVERLAY_OPACITY_DEFAULT = 0.45;
export const ASSET_MAP_OVERLAY_SCALE_DEFAULT = 1;
export const ASSET_MAP_OVERLAY_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const ASSET_MAP_OVERLAY_ACCEPT = "image/jpeg,image/png,image/webp";

export function defaultAssetMapOverlay(): AssetMapOverlay {
  return {
    url: null,
    opacity: ASSET_MAP_OVERLAY_OPACITY_DEFAULT,
    scale: ASSET_MAP_OVERLAY_SCALE_DEFAULT,
    offset_x: 0,
    offset_y: 0,
    rotation: 0,
    fit: "contain",
    pitch_display: "cells",
  };
}

export function normalizePitchDisplay(value: unknown): AssetMapPitchDisplay {
  if (value === "outlines" || value === "both") return value;
  return "cells";
}

export function clampOverlayOpacity(value: number): number {
  if (!Number.isFinite(value)) return ASSET_MAP_OVERLAY_OPACITY_DEFAULT;
  return Math.min(1, Math.max(0, value));
}

export function clampOverlayScale(value: number): number {
  if (!Number.isFinite(value)) return ASSET_MAP_OVERLAY_SCALE_DEFAULT;
  return Math.min(3, Math.max(0.5, value));
}

export function clampOverlayOffset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, value));
}

/** Normalize to [0, 360) degrees. */
export function clampOverlayRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const mod = ((Math.round(value) % 360) + 360) % 360;
  return mod;
}

export function normalizeOverlayFit(value: unknown): AssetMapOverlayFit {
  return value === "cover" ? "cover" : "contain";
}

/** Next clockwise 90° step (convenience). */
export function nextOverlayRotation(current: number): number {
  return clampOverlayRotation(current + 90);
}

function asNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function parseAssetMapOverlay(raw: unknown): AssetMapOverlay {
  const base = defaultAssetMapOverlay();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" && o.url.trim() ? o.url.trim() : null;
  return {
    url,
    opacity: clampOverlayOpacity(asNumber(o.opacity, base.opacity)),
    scale: clampOverlayScale(asNumber(o.scale, base.scale)),
    offset_x: clampOverlayOffset(asNumber(o.offset_x, base.offset_x)),
    offset_y: clampOverlayOffset(asNumber(o.offset_y, base.offset_y)),
    rotation: clampOverlayRotation(asNumber(o.rotation, base.rotation)),
    fit: normalizeOverlayFit(o.fit ?? base.fit),
    pitch_display: normalizePitchDisplay(o.pitch_display ?? base.pitch_display),
  };
}

export function serializeAssetMapOverlay(overlay: AssetMapOverlay): Record<string, unknown> {
  const pitch_display = normalizePitchDisplay(overlay.pitch_display);
  if (!overlay.url) {
    return pitch_display === "cells" ? {} : { pitch_display };
  }
  return {
    url: overlay.url,
    opacity: clampOverlayOpacity(overlay.opacity),
    scale: clampOverlayScale(overlay.scale),
    offset_x: clampOverlayOffset(overlay.offset_x),
    offset_y: clampOverlayOffset(overlay.offset_y),
    rotation: clampOverlayRotation(overlay.rotation),
    fit: normalizeOverlayFit(overlay.fit),
    pitch_display,
  };
}

/** CSS for absolute inset-0 underlay image (pan/scale/rotate). */
export function overlayImageStyle(
  overlay: Pick<AssetMapOverlay, "opacity" | "scale" | "offset_x" | "offset_y" | "rotation">,
): CSSProperties {
  const rotation = clampOverlayRotation(overlay.rotation);
  return {
    opacity: clampOverlayOpacity(overlay.opacity),
    transform: `translate(${clampOverlayOffset(overlay.offset_x)}%, ${clampOverlayOffset(overlay.offset_y)}%) rotate(${rotation}deg) scale(${clampOverlayScale(overlay.scale)})`,
    transformOrigin: "center center",
  };
}

export function isAllowedAssetMapOverlayFile(file: File): { ok: true } | { ok: false; reason: "type" | "size" } {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (file.type && !allowed.includes(file.type.toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return { ok: false, reason: "type" };
  }
  if (file.size > ASSET_MAP_OVERLAY_MAX_FILE_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}
