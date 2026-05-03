import type { PublicPageSectionId, PublicPageSectionsState } from "@/lib/club-public-page-sections";

export type PublicMicroPageId = "home" | "news" | "teams" | "schedule" | "matches" | "events" | "documents" | "join" | "contact";

export type MicroPageVisibility = "public" | "members_only";

export interface MicroPageSettings {
  enabled: boolean;
  showInNav: boolean;
  /** Empty = use default i18n label on the public site */
  label: string;
  sortOrder: number;
  visibility: MicroPageVisibility;
}

export const PUBLIC_MICRO_PAGE_ORDER: PublicMicroPageId[] = [
  "home",
  "news",
  "teams",
  "schedule",
  "matches",
  "events",
  "documents",
  "join",
  "contact",
];

export function microPageToSectionId(id: PublicMicroPageId): PublicPageSectionId | null {
  if (id === "home") return null;
  if (id === "join") return "nextsteps";
  return id as PublicPageSectionId;
}

export function normalizeMicroPages(raw: unknown, sections: PublicPageSectionsState): Record<PublicMicroPageId, MicroPageSettings> {
  const base = buildMicroPagesFromSections(sections);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  for (const id of PUBLIC_MICRO_PAGE_ORDER) {
    const v = r[id];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    const sortOrder = typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder) ? o.sortOrder : base[id].sortOrder;
    const visibility = o.visibility === "members_only" ? "members_only" : "public";
    base[id] = {
      enabled: typeof o.enabled === "boolean" ? o.enabled : base[id].enabled,
      showInNav: typeof o.showInNav === "boolean" ? o.showInNav : base[id].showInNav,
      label: label.trim(),
      sortOrder,
      visibility,
    };
  }
  return base;
}

export function normalizeHomepageModuleDefs(raw: unknown): Record<HomepageModuleId, HomepageModuleSetting> {
  const base = defaultHomepageModules();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  for (const id of HOMEPAGE_MODULE_IDS) {
    const v = r[id];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    base[id] = {
      visible: typeof o.visible === "boolean" ? o.visible : base[id].visible,
      order: typeof o.order === "number" && Number.isFinite(o.order) ? o.order : base[id].order,
      maxItems:
        typeof o.maxItems === "number" && Number.isFinite(o.maxItems) ? Math.min(48, Math.max(1, o.maxItems)) : base[id].maxItems,
      source: o.source === "manual" ? "manual" : "auto",
    };
  }
  return base;
}

export interface PrivacyPack {
  show_member_count_on_public_home: boolean;
  show_coach_names_public: boolean;
  /** When true, public pages may show coach emails / phone numbers surfaced for visitors. */
  show_coach_contact_public: boolean;
  show_training_locations_public: boolean;
  show_team_training_times_public: boolean;
  show_match_results_public: boolean;
  /** Roster-style stats (e.g. registered player counts on public team pages). Off by default. */
  show_player_stats_public: boolean;
  /** Individual player names on public surfaces (off by default; youth mode always hides). */
  show_player_names_public: boolean;
  show_documents_public: boolean;
  show_contact_persons_public: boolean;
  allow_join_requests_public: boolean;
  /** Youth / child-protection preset: tightens coach contact, images, and player-related fields. */
  youth_protection_mode: boolean;
  /** When youth protection is on, allow direct coach phone numbers only if explicitly enabled. */
  youth_allow_coach_phone_public: boolean;
}

export const DEFAULT_PRIVACY: PrivacyPack = {
  show_member_count_on_public_home: true,
  show_coach_names_public: true,
  show_coach_contact_public: true,
  show_training_locations_public: true,
  show_team_training_times_public: true,
  show_match_results_public: true,
  show_player_stats_public: false,
  show_player_names_public: false,
  show_documents_public: true,
  show_contact_persons_public: true,
  allow_join_requests_public: true,
  youth_protection_mode: false,
  youth_allow_coach_phone_public: false,
};

export function normalizePrivacy(raw: unknown, visibilityRules: Record<string, boolean>): PrivacyPack {
  const p = { ...DEFAULT_PRIVACY };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const key of Object.keys(p) as (keyof PrivacyPack)[]) {
      if (typeof o[key] === "boolean") (p as Record<string, boolean>)[key] = o[key] as boolean;
    }
  }
  if (visibilityRules.hide_member_count_on_home === true) {
    p.show_member_count_on_public_home = false;
  }
  return p;
}

/** Applies youth-protection and product-wide safety caps before deriving visibility rules or public UI. */
export function effectivePrivacyPack(privacy: PrivacyPack): PrivacyPack {
  const base = { ...privacy };
  if (!base.youth_protection_mode) return base;
  return {
    ...base,
    show_player_names_public: false,
    show_player_stats_public: false,
    show_coach_contact_public: base.youth_allow_coach_phone_public ? base.show_coach_contact_public : false,
  };
}

export function privacyToVisibilityRules(privacy: PrivacyPack): Record<string, boolean> {
  const e = effectivePrivacyPack(privacy);
  return {
    hide_member_count_on_home: e.show_member_count_on_public_home !== true,
    hide_coach_names_public: e.show_coach_names_public !== true,
    hide_coach_contact_public: e.show_coach_contact_public !== true,
    hide_training_locations_public: e.show_training_locations_public !== true,
    hide_team_training_times_public: e.show_team_training_times_public !== true,
    hide_match_results_public: e.show_match_results_public !== true,
    hide_player_stats_public: e.show_player_stats_public !== true,
    hide_player_names_public: e.show_player_names_public !== true,
    hide_documents_public: e.show_documents_public !== true,
    hide_contact_persons_public: e.show_contact_persons_public !== true,
    disable_join_requests_public: e.allow_join_requests_public !== true,
    youth_protection_mode: e.youth_protection_mode === true,
    youth_hide_public_player_images: e.youth_protection_mode === true,
  };
}

export function defaultMicroPageSettings(id: PublicMicroPageId, sections: PublicPageSectionsState): MicroPageSettings {
  const section = microPageToSectionId(id);
  const enabled = id === "home" ? true : section ? Boolean(sections[section]) : true;
  const sortDefaults: Record<PublicMicroPageId, number> = {
    home: 0,
    news: 10,
    teams: 20,
    schedule: 30,
    matches: 40,
    events: 50,
    documents: 60,
    join: 70,
    contact: 80,
  };
  return {
    enabled,
    showInNav: enabled,
    label: "",
    sortOrder: sortDefaults[id],
    visibility: "public",
  };
}

export function buildMicroPagesFromSections(sections: PublicPageSectionsState): Record<PublicMicroPageId, MicroPageSettings> {
  const out = {} as Record<PublicMicroPageId, MicroPageSettings>;
  for (const id of PUBLIC_MICRO_PAGE_ORDER) {
    out[id] = defaultMicroPageSettings(id, sections);
  }
  return out;
}

export function applyMicroPagesToSections(
  micro: Record<PublicMicroPageId, MicroPageSettings>,
  base: PublicPageSectionsState
): PublicPageSectionsState {
  const next = { ...base };
  for (const id of PUBLIC_MICRO_PAGE_ORDER) {
    const section = microPageToSectionId(id);
    if (!section) continue;
    next[section] = Boolean(micro[id]?.enabled);
  }
  return next;
}

export type HomepageModuleId =
  | "stats"
  | "next_up"
  | "latest_news"
  | "featured_teams"
  | "upcoming_events"
  | "matches_preview"
  | "sponsors"
  | "join_cta"
  | "gallery";

export interface HomepageModuleSetting {
  visible: boolean;
  order: number;
  maxItems: number;
  source: "auto" | "manual";
}

export const HOMEPAGE_MODULE_IDS: HomepageModuleId[] = [
  "stats",
  "next_up",
  "latest_news",
  "featured_teams",
  "upcoming_events",
  "matches_preview",
  "sponsors",
  "join_cta",
  "gallery",
];

export function defaultHomepageModules(): Record<HomepageModuleId, HomepageModuleSetting> {
  const defaults: Record<HomepageModuleId, { order: number; max: number }> = {
    stats: { order: 10, max: 8 },
    next_up: { order: 20, max: 4 },
    latest_news: { order: 30, max: 6 },
    featured_teams: { order: 40, max: 6 },
    upcoming_events: { order: 50, max: 6 },
    matches_preview: { order: 60, max: 6 },
    join_cta: { order: 70, max: 1 },
    sponsors: { order: 80, max: 12 },
    gallery: { order: 90, max: 8 },
  };
  const out = {} as Record<HomepageModuleId, HomepageModuleSetting>;
  for (const id of HOMEPAGE_MODULE_IDS) {
    out[id] = {
      visible: id !== "gallery",
      order: defaults[id].order,
      maxItems: defaults[id].max,
      source: id === "featured_teams" || id === "latest_news" ? "manual" : "auto",
    };
  }
  out.sponsors = { ...out.sponsors, visible: false, source: "auto" };
  out.join_cta = { ...out.join_cta, visible: true, source: "auto" };
  return out;
}

/** Parse #rrggbb to RGB 0–255 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  return null;
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Minimum contrast ratio recommended when pairing primary and custom foreground accents (WCAG AA body text). */
export const PRIMARY_FOREGROUND_CONTRAST_MIN = 4.5;

/** WCAG contrast ratio between two #hex colors (1 = no contrast, 21 = max). */
export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isPrimaryForegroundContrastLow(
  primary: string,
  foreground: string,
  minRatio: number = PRIMARY_FOREGROUND_CONTRAST_MIN
): boolean {
  const r = contrastRatio(foreground.trim(), primary.trim());
  return r != null && r < minRatio;
}

export function brandingContrastWarnings(primary: string, secondary: string, tertiary: string, foreground: string): string[] {
  const warnings: string[] = [];
  const fgOnBg = contrastRatio(foreground, tertiary);
  if (fgOnBg != null && fgOnBg < 3) {
    warnings.push("Foreground on tertiary background may be hard to read (contrast below 3:1).");
  }
  const primOnBg = contrastRatio(primary, tertiary);
  if (primOnBg != null && primOnBg < 3) {
    warnings.push("Primary accent on tertiary background has low contrast.");
  }
  const fgOnSec = contrastRatio(foreground, secondary);
  if (fgOnSec != null && fgOnSec < 3) {
    warnings.push("Foreground on secondary background has low contrast.");
  }
  return warnings;
}
