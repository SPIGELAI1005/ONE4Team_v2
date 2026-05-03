/** Default approximates `#C4A052` (ONE4Team gold) when parsing fails. */
export const FALLBACK_PRIMARY_RGB_STRING = "196, 160, 82";

/**
 * Parses `#rgb` or `#rrggbb` into channel values.
 * Returns null if the string is not a valid hex color.
 */
export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "").trim();
  if (!raw) return null;
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  return null;
}

/**
 * Returns comma-separated RGB values for use in `rgba(${hexToRgb(hex)}, a)`.
 * Falls back to {@link FALLBACK_PRIMARY_RGB_STRING} when `hex` is not parseable.
 */
export function hexToRgb(hex: string): string {
  const v = parseHexRgb(hex);
  return v ? `${v.r}, ${v.g}, ${v.b}` : FALLBACK_PRIMARY_RGB_STRING;
}
