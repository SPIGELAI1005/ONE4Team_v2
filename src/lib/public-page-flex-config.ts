import type { PublicPageSectionsState } from "@/lib/club-public-page-sections";
import {
  HOMEPAGE_MODULE_IDS,
  microPageToSectionId,
  type HomepageModuleId,
  type HomepageModuleSetting,
  type MicroPageSettings,
  type PublicMicroPageId,
  PUBLIC_MICRO_PAGE_ORDER,
} from "@/lib/club-page-settings-helpers";

/** Public nav / URL segments (matches `PublicMicroPageId`). */
export type PublicPageNavId = PublicMicroPageId;

export interface PublicNavPageSetting {
  /** Route + page gate: micro page enabled and dashboard section on. */
  enabled: boolean;
  /** When false, page may still be reachable by URL but is hidden from the public nav. */
  showInNav: boolean;
  /** Empty string = use default i18n label in UI */
  navLabel: string;
  order: number;
}

export type PublicPageConfigPages = Record<PublicPageNavId, PublicNavPageSetting>;

export type HomepageFlexModuleId =
  | "stats"
  | "nextUp"
  | "latestNews"
  | "featuredTeams"
  | "upcomingEvents"
  | "matchesPreview"
  | "joinCta"
  | "partners"
  | "gallery";

export interface PublicHomepageModuleSetting {
  enabled: boolean;
  order: number;
  maxItems?: number;
}

export type PublicPageConfigHomepageModules = Record<HomepageFlexModuleId, PublicHomepageModuleSetting>;

/** Resolved flexible layout for nav + homepage (always fully populated). */
export interface PublicPageConfig {
  pages: PublicPageConfigPages;
  homepageModules: PublicPageConfigHomepageModules;
}

/** Optional patch stored on published/draft JSON (`publicPageConfig`). */
export interface PublicPageConfigPatch {
  pages?: Partial<Record<PublicPageNavId, Partial<PublicNavPageSetting>>>;
  homepageModules?: Partial<Record<HomepageFlexModuleId, Partial<PublicHomepageModuleSetting>>>;
}

const FLEX_TO_INTERNAL: Record<HomepageFlexModuleId, HomepageModuleId> = {
  stats: "stats",
  nextUp: "next_up",
  latestNews: "latest_news",
  featuredTeams: "featured_teams",
  upcomingEvents: "upcoming_events",
  matchesPreview: "matches_preview",
  joinCta: "join_cta",
  partners: "sponsors",
  gallery: "gallery",
};

const INTERNAL_TO_FLEX: Record<HomepageModuleId, HomepageFlexModuleId> = {
  stats: "stats",
  next_up: "nextUp",
  latest_news: "latestNews",
  featured_teams: "featuredTeams",
  upcoming_events: "upcomingEvents",
  matches_preview: "matchesPreview",
  sponsors: "partners",
  join_cta: "joinCta",
  gallery: "gallery",
};

const DEFAULT_PAGE_ORDERS: Record<PublicPageNavId, number> = {
  home: 1,
  news: 2,
  teams: 3,
  schedule: 4,
  matches: 5,
  events: 6,
  documents: 7,
  join: 8,
  contact: 9,
};

const DEFAULT_HOMEPAGE_ORDERS: Record<HomepageFlexModuleId, number> = {
  stats: 10,
  nextUp: 20,
  latestNews: 30,
  featuredTeams: 40,
  upcomingEvents: 50,
  matchesPreview: 60,
  joinCta: 70,
  partners: 80,
  gallery: 90,
};

/** Default layout (camelCase module ids). */
export const DEFAULT_PUBLIC_PAGE_CONFIG: PublicPageConfig = {
  pages: {
    home: { enabled: true, showInNav: true, navLabel: "Home", order: 1 },
    news: { enabled: true, showInNav: true, navLabel: "News", order: 2 },
    teams: { enabled: true, showInNav: true, navLabel: "Teams", order: 3 },
    schedule: { enabled: true, showInNav: true, navLabel: "Schedule", order: 4 },
    matches: { enabled: true, showInNav: true, navLabel: "Matches", order: 5 },
    events: { enabled: true, showInNav: true, navLabel: "Events", order: 6 },
    documents: { enabled: true, showInNav: true, navLabel: "Documents", order: 7 },
    join: { enabled: true, showInNav: true, navLabel: "Join", order: 8 },
    contact: { enabled: true, showInNav: true, navLabel: "Contact", order: 9 },
  },
  homepageModules: {
    stats: { enabled: true, order: 10, maxItems: 8 },
    nextUp: { enabled: true, order: 20, maxItems: 4 },
    latestNews: { enabled: true, order: 30, maxItems: 3 },
    featuredTeams: { enabled: true, order: 40, maxItems: 6 },
    upcomingEvents: { enabled: true, order: 50, maxItems: 3 },
    matchesPreview: { enabled: true, order: 60, maxItems: 3 },
    joinCta: { enabled: true, order: 70 },
    partners: { enabled: true, order: 80 },
    gallery: { enabled: false, order: 90, maxItems: 8 },
  },
};

export interface PublicClubPageLayoutInput {
  microPages: Record<PublicMicroPageId, MicroPageSettings>;
  publicPageSections: PublicPageSectionsState;
  homepageModuleDefs: Record<HomepageModuleId, HomepageModuleSetting>;
  homepageModules?: Record<string, boolean>;
  publicPageConfig?: PublicPageConfigPatch;
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || 0);
}

function deepMergePages(base: PublicPageConfigPages, patch?: PublicPageConfigPatch["pages"]): PublicPageConfigPages {
  const out = { ...base };
  if (!patch) return out;
  for (const id of PUBLIC_MICRO_PAGE_ORDER) {
    const p = patch[id];
    if (!p || typeof p !== "object") continue;
    out[id] = {
      enabled: typeof p.enabled === "boolean" ? p.enabled : out[id].enabled,
      showInNav: typeof p.showInNav === "boolean" ? p.showInNav : out[id].showInNav,
      navLabel: typeof p.navLabel === "string" ? p.navLabel : out[id].navLabel,
      order: typeof p.order === "number" && Number.isFinite(p.order) ? p.order : out[id].order,
    };
  }
  return out;
}

function deepMergeHomepageModules(
  base: PublicPageConfigHomepageModules,
  patch?: PublicPageConfigPatch["homepageModules"]
): PublicPageConfigHomepageModules {
  const keys = Object.keys(base) as HomepageFlexModuleId[];
  const out = { ...base };
  if (!patch) return out;
  for (const id of keys) {
    const p = patch[id];
    if (!p || typeof p !== "object") continue;
    out[id] = {
      enabled: typeof p.enabled === "boolean" ? p.enabled : out[id].enabled,
      order: typeof p.order === "number" && Number.isFinite(p.order) ? p.order : out[id].order,
      maxItems:
        typeof p.maxItems === "number" && Number.isFinite(p.maxItems)
          ? Math.min(48, Math.max(1, Math.floor(p.maxItems)))
          : out[id].maxItems,
    };
  }
  return out;
}

function pageEnabledFromSections(id: PublicPageNavId, sections: PublicPageSectionsState): boolean {
  if (id === "home") return true;
  const sec = microPageToSectionId(id);
  if (!sec) return true;
  return Boolean(sections[sec]);
}

function buildPagesFromMicro(
  micro: Record<PublicMicroPageId, MicroPageSettings>,
  sections: PublicPageSectionsState,
  patch?: PublicPageConfigPatch["pages"]
): PublicPageConfigPages {
  const base = {} as PublicPageConfigPages;
  for (const id of PUBLIC_MICRO_PAGE_ORDER) {
    const m = micro[id];
    const sectionOn = pageEnabledFromSections(id, sections);
    const routeOn = Boolean(m?.enabled) && sectionOn;
    const navOn = id === "home" ? routeOn : routeOn && Boolean(m?.showInNav);
    base[id] = {
      enabled: routeOn,
      showInNav: navOn,
      navLabel: (m?.label ?? "").trim(),
      order: typeof m?.sortOrder === "number" && Number.isFinite(m.sortOrder) ? m.sortOrder : DEFAULT_PAGE_ORDERS[id],
    };
  }
  return deepMergePages(base, patch);
}

function buildHomepageFromDefs(
  defs: Record<HomepageModuleId, HomepageModuleSetting>,
  homepageModulesLegacy: Record<string, boolean> | undefined,
  patch?: PublicPageConfigPatch["homepageModules"]
): PublicPageConfigHomepageModules {
  const flexIds = Object.keys(FLEX_TO_INTERNAL) as HomepageFlexModuleId[];
  const legacyPartners = homepageModulesLegacy?.partners === true;
  const base = {} as PublicPageConfigHomepageModules;
  for (const flexId of flexIds) {
    const internal = FLEX_TO_INTERNAL[flexId];
    const d = defs[internal];
    const enabledDefault =
      flexId === "partners"
        ? legacyPartners && d.visible !== false
        : flexId === "gallery"
          ? d.visible !== false
          : d.visible !== false;
    base[flexId] = {
      enabled: enabledDefault,
      order: typeof d.order === "number" && Number.isFinite(d.order) ? d.order : DEFAULT_HOMEPAGE_ORDERS[flexId],
      maxItems: d.maxItems,
    };
  }
  return deepMergeHomepageModules(base, patch);
}

/** Merge stored `publicPageConfig` patch with micro pages, sections, and homepage defs. */
export function resolvePublicPageConfigFromClub(cfg: PublicClubPageLayoutInput): PublicPageConfig {
  const patch = cfg.publicPageConfig;
  const pages = buildPagesFromMicro(cfg.microPages, cfg.publicPageSections, patch?.pages);
  const homepageModules = buildHomepageFromDefs(cfg.homepageModuleDefs, cfg.homepageModules, patch?.homepageModules);
  return { pages, homepageModules };
}

export interface EnabledPublicNavEntry {
  id: PublicPageNavId;
  navLabel: string;
  order: number;
}

export function getEnabledPublicPages(config: PublicPageConfig): EnabledPublicNavEntry[] {
  const items = PUBLIC_MICRO_PAGE_ORDER.filter((id) => config.pages[id].enabled && config.pages[id].showInNav).map((id) => ({
    id,
    navLabel: config.pages[id].navLabel,
    order: config.pages[id].order,
  }));
  return sortByOrder(items);
}

export interface EnabledHomepageModuleEntry {
  flexId: HomepageFlexModuleId;
  internalId: HomepageModuleId;
  order: number;
  enabled: boolean;
  maxItems?: number;
}

export function getEnabledHomepageModules(config: PublicPageConfig): EnabledHomepageModuleEntry[] {
  const items = (Object.keys(config.homepageModules) as HomepageFlexModuleId[])
    .map((flexId) => ({
      flexId,
      internalId: FLEX_TO_INTERNAL[flexId],
      order: config.homepageModules[flexId].order,
      enabled: config.homepageModules[flexId].enabled,
      maxItems: config.homepageModules[flexId].maxItems,
    }))
    .filter((x) => x.enabled);
  return sortByOrder(items);
}

export function getEnabledHomepageInternalModuleIds(config: PublicPageConfig): HomepageModuleId[] {
  return getEnabledHomepageModules(config).map((x) => x.internalId);
}

export function flexModuleToInternal(flexId: HomepageFlexModuleId): HomepageModuleId {
  return FLEX_TO_INTERNAL[flexId];
}

export function internalModuleToFlex(internalId: HomepageModuleId): HomepageFlexModuleId {
  return INTERNAL_TO_FLEX[internalId];
}

export interface HomepageModuleRenderClubSlice {
  sectionVisibility: PublicPageSectionsState;
  homepageModuleDefs: Record<HomepageModuleId, HomepageModuleSetting>;
}

export interface HomepageModuleRenderData {
  club: HomepageModuleRenderClubSlice;
  showStats: boolean;
  nextUpItemsLength: number;
  latestNewsCount: number;
  featuredTeamsCount: number;
  homeEventsPreviewCount: number;
  homeMatchesPreviewCount: number;
  showPartnersStrip: boolean;
  showJoinCta: boolean;
  gallerySliceCount: number;
}

export function shouldRenderHomepageModule(
  moduleId: HomepageModuleId,
  layout: PublicPageConfig,
  data: HomepageModuleRenderData,
  isAdminPreview: boolean
): boolean {
  const flexId = INTERNAL_TO_FLEX[moduleId];
  const flex = layout.homepageModules[flexId];
  if (!flex?.enabled) return false;
  const def = data.club.homepageModuleDefs[moduleId];
  if (def.visible === false) return false;

  switch (moduleId) {
    case "stats":
      if (data.showStats) return true;
      return isAdminPreview;
    case "next_up":
      if (data.nextUpItemsLength > 0) return true;
      return isAdminPreview;
    case "latest_news":
      if (!data.club.sectionVisibility.news) return false;
      if (data.latestNewsCount > 0) return true;
      return isAdminPreview;
    case "featured_teams":
      if (!data.club.sectionVisibility.teams) return false;
      if (data.featuredTeamsCount > 0) return true;
      return isAdminPreview;
    case "upcoming_events":
      if (!data.club.sectionVisibility.events) return false;
      if (data.homeEventsPreviewCount > 0) return true;
      return isAdminPreview;
    case "matches_preview":
      if (!data.club.sectionVisibility.matches) return false;
      if (data.homeMatchesPreviewCount > 0) return true;
      return isAdminPreview;
    case "sponsors":
      if (data.showPartnersStrip) return true;
      return isAdminPreview && def.visible !== false;
    case "join_cta":
      return data.showJoinCta;
    case "gallery":
      if (!data.club.sectionVisibility.media) return false;
      if (data.gallerySliceCount > 0) return true;
      return isAdminPreview;
    default:
      return false;
  }
}

export function effectiveHomepageMaxItems(
  moduleId: HomepageModuleId,
  layout: PublicPageConfig,
  defs: Record<HomepageModuleId, HomepageModuleSetting>
): number {
  const flexId = INTERNAL_TO_FLEX[moduleId];
  const flexMax = layout.homepageModules[flexId]?.maxItems;
  const defMax = defs[moduleId]?.maxItems;
  const raw = flexMax ?? defMax ?? 6;
  return Math.min(48, Math.max(1, raw));
}

export function parsePublicPageConfigPatch(raw: unknown): PublicPageConfigPatch | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const pages = o.pages && typeof o.pages === "object" && !Array.isArray(o.pages) ? (o.pages as PublicPageConfigPatch["pages"]) : undefined;
  const homepageModules =
    o.homepageModules && typeof o.homepageModules === "object" && !Array.isArray(o.homepageModules)
      ? (o.homepageModules as PublicPageConfigPatch["homepageModules"])
      : undefined;
  if (!pages && !homepageModules) return undefined;
  return { pages, homepageModules };
}

export function publicNavIdToPathSegment(id: PublicPageNavId): string | null {
  if (id === "home") return null;
  const map: Record<Exclude<PublicPageNavId, "home">, string> = {
    news: "news",
    teams: "teams",
    schedule: "schedule",
    matches: "matches",
    events: "events",
    documents: "documents",
    join: "join",
    contact: "contact",
  };
  return map[id as Exclude<PublicPageNavId, "home">] ?? null;
}

export function isPublicMicroRouteEnabled(
  layout: PublicPageConfig,
  sections: PublicPageSectionsState,
  id: PublicPageNavId
): boolean {
  const sec = microPageToSectionId(id);
  const sectionOk = id === "home" ? true : sec ? Boolean(sections[sec]) : true;
  return sectionOk && Boolean(layout.pages[id]?.enabled);
}

/** All homepage blocks in flex order (includes disabled flex modules). */
export function getHomepageRenderOrder(layout: PublicPageConfig): HomepageModuleId[] {
  return (HOMEPAGE_MODULE_IDS as HomepageModuleId[])
    .map((internalId) => ({
      internalId,
      order: layout.homepageModules[INTERNAL_TO_FLEX[internalId]]?.order ?? 999,
    }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.internalId);
}
