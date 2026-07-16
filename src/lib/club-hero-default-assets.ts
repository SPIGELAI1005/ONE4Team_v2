/**
 * Premium default hero slots for clubs without an uploaded hero or cover image.
 *
 * IMPORTANT (multi-tenant): These paths must be **club-neutral** stock assets only.
 * Never point platform-wide fallbacks at pilot-club photography (e.g. TSV Allach camps).
 *
 * Place final PNG (or WebP) files in:
 *   `public/assets/club-hero-defaults/`
 * Filenames MUST match the `path` entries below (see also
 * `public/assets/club-hero-defaults/PLACEHOLDER_ASSETS_TODO.md`).
 * Until those files exist, `HeroImageTint` falls back to the CSS gradient after
 * an image load error.
 */

export const CLUB_HERO_DEFAULT_ASSET_BASE = "/assets/club-hero-defaults";

export const CLUB_HERO_DEFAULT_FALLBACK_ID = "abstract-sports-pattern-neutral" as const;

/** Pilot- or club-branded paths that must never be used as platform-wide hero defaults. */
export const FORBIDDEN_PLATFORM_HERO_PATH_PATTERNS = [
  /\/images\/camps\//i,
  /sommer-fussball-camp/i,
  /tsv-allach/i,
  /allach/i,
] as const;

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

function resolveDefaultHeroAsset(id: string): ClubHeroDefaultAsset {
  return (
    DEFAULT_CLUB_HERO_ASSETS.find((asset) => asset.id === id) ??
    DEFAULT_CLUB_HERO_ASSETS.find((asset) => asset.id === CLUB_HERO_DEFAULT_FALLBACK_ID) ??
    DEFAULT_CLUB_HERO_ASSETS[DEFAULT_CLUB_HERO_ASSETS.length - 1]
  );
}

/** Public URL for a default slot, or the abstract fallback slot if id is unknown. */
export function getDefaultHeroAssetPublicPath(id: string | null | undefined): string {
  const normalized = normalizeDefaultHeroAssetId(id);
  return resolveDefaultHeroAsset(normalized).path;
}

/** Guardrail for tests and CI — platform hero defaults must stay club-neutral. */
export function assertClubNeutralHeroPublicPath(path: string): void {
  for (const pattern of FORBIDDEN_PLATFORM_HERO_PATH_PATTERNS) {
    if (pattern.test(path)) {
      throw new Error(`Platform hero path must be club-neutral: ${path}`);
    }
  }
  if (!path.startsWith(`${CLUB_HERO_DEFAULT_ASSET_BASE}/`)) {
    throw new Error(`Platform hero path must live under ${CLUB_HERO_DEFAULT_ASSET_BASE}/: ${path}`);
  }
}
