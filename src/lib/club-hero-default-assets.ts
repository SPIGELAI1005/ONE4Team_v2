/**
 * Premium default hero slots for clubs without an uploaded hero or cover image.
 *
 * ---------------------------------------------------------------------------
 * TODO (art / assets): Place final PNG (or WebP) files in the **repo** folder:
 *   `public/assets/club-hero-defaults/`
 * Filenames MUST match the `path` entries below (see also
 * `public/assets/club-hero-defaults/PLACEHOLDER_ASSETS_TODO.md`).
 * Until those files exist, `HeroImageTint` falls back to the CSS gradient
 * after an image load error.
 * ---------------------------------------------------------------------------
 */

export const CLUB_HERO_DEFAULT_ASSET_BASE = "/assets/club-hero-defaults";

export const CLUB_HERO_DEFAULT_FALLBACK_ID = "abstract-sports-pattern-neutral" as const;

export interface ClubHeroDefaultAsset {
  id: string;
  label: string;
  /** Public URL path (served from `public/`). */
  path: string;
  /** Rough club categories / use cases for admin hints (not enforced in code). */
  recommendedFor: string[];
}

export const DEFAULT_CLUB_HERO_ASSETS: ClubHeroDefaultAsset[] = [
  {
    id: "football-team-huddle-neutral",
    label: "Team huddle",
    path: `${CLUB_HERO_DEFAULT_ASSET_BASE}/football-team-huddle-neutral.png`,
    recommendedFor: ["football", "general"],
  },
  {
    id: "football-training-pitch-neutral",
    label: "Training pitch",
    path: `${CLUB_HERO_DEFAULT_ASSET_BASE}/football-training-pitch-neutral.png`,
    recommendedFor: ["football", "training", "general"],
  },
  {
    id: "youth-football-action-neutral",
    label: "Youth action",
    path: `${CLUB_HERO_DEFAULT_ASSET_BASE}/youth-football-action-neutral.png`,
    recommendedFor: ["youth", "football", "general"],
  },
  {
    id: "clubhouse-community-neutral",
    label: "Clubhouse & community",
    path: `${CLUB_HERO_DEFAULT_ASSET_BASE}/clubhouse-community-neutral.png`,
    recommendedFor: ["community", "general"],
  },
  {
    id: "abstract-sports-pattern-neutral",
    label: "Abstract sports pattern",
    path: `${CLUB_HERO_DEFAULT_ASSET_BASE}/abstract-sports-pattern-neutral.png`,
    recommendedFor: ["general", "abstract"],
  },
];

const KNOWN_DEFAULT_HERO_IDS = new Set(DEFAULT_CLUB_HERO_ASSETS.map((a) => a.id));

/** Returns a known default hero asset id, or the abstract fallback. */
export function normalizeDefaultHeroAssetId(raw: unknown): string {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (id && KNOWN_DEFAULT_HERO_IDS.has(id)) return id;
  return CLUB_HERO_DEFAULT_FALLBACK_ID;
}

/** Public URL for a default slot, or the fallback slot if id is unknown. */
export function getDefaultHeroAssetPublicPath(id: string | null | undefined): string {
  const normalized = normalizeDefaultHeroAssetId(id);
  const row = DEFAULT_CLUB_HERO_ASSETS.find((a) => a.id === normalized);
  if (row) return row.path;
  return DEFAULT_CLUB_HERO_ASSETS.find((a) => a.id === CLUB_HERO_DEFAULT_FALLBACK_ID)?.path ?? `${CLUB_HERO_DEFAULT_ASSET_BASE}/${CLUB_HERO_DEFAULT_FALLBACK_ID}.png`;
}
