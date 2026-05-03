import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PUBLIC_PAGE_SECTIONS,
  parsePublicPageSections,
  toPublicPageSectionsJson,
  type PublicPageSectionsState,
} from "@/lib/club-public-page-sections";
import {
  applyMicroPagesToSections,
  buildMicroPagesFromSections,
  defaultHomepageModules,
  normalizeHomepageModuleDefs,
  normalizeMicroPages,
  normalizePrivacy,
  privacyToVisibilityRules,
  DEFAULT_PRIVACY,
  type HomepageModuleId,
  type HomepageModuleSetting,
  type MicroPageSettings,
  type PrivacyPack,
  type PublicMicroPageId,
} from "@/lib/club-page-settings-helpers";
import { normalizeDefaultHeroAssetId } from "@/lib/club-hero-default-assets";
import { parsePublicPageConfigPatch, type PublicPageConfigPatch } from "@/lib/public-page-flex-config";

export type { HomepageModuleId, HomepageModuleSetting, MicroPageSettings, PrivacyPack, PublicMicroPageId } from "@/lib/club-page-settings-helpers";

export const CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION = 1 as const;

/** Full snapshot stored in draft / published JSON and mirrored to `clubs` on publish. */
export interface ClubPublicPageConfig {
  schemaVersion: typeof CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION;
  general: {
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean;
    default_language: string;
    timezone: string;
    club_category: string;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    tertiary_color: string;
    support_color: string;
    foreground_color: string;
    theme_preference: "system" | "light" | "dark";
  };
  assets: {
    logo_url: string;
    favicon_url: string;
    cover_image_url: string;
    hero_image_url: string;
    reference_images: string[];
    logo_alt: string;
    favicon_alt: string;
    cover_alt: string;
    hero_alt: string;
    cover_object_position: string;
    hero_object_position: string;
    default_generated_asset: string;
    /** Slot id from `DEFAULT_CLUB_HERO_ASSETS` when no hero/cover upload. */
    default_hero_asset_id: string;
    /** Club primary color duotone + overlays on the public hero (when false, a neutral readability gradient is used). */
    hero_club_color_overlay: boolean;
    /** 0–1 strength for the club-color hero overlay (ignored when `hero_club_color_overlay` is false). */
    hero_tint_strength: number;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    website: string;
    latitude: string;
    longitude: string;
    public_location_notes: string;
  };
  social: {
    facebook_url: string;
    instagram_url: string;
    twitter_url: string;
    youtube_url: string;
    tiktok_url: string;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    /** Shown under the “News & Updates” heading on the public club news page. */
    news_page_subtitle: string | null;
    og_image_url: string;
    allow_indexing: boolean;
    structured_data_enabled: boolean;
  };
  onboarding: {
    join_approval_mode: "manual" | "auto";
    join_reviewer_policy: "admin_only" | "admin_trainer";
    join_default_role: string;
    join_default_team: string;
    join_notify_emails: string;
    join_auto_approve_invited_only: boolean;
  };
  publicPageSections: PublicPageSectionsState;
  /** Optional homepage module toggles (legacy boolean map). */
  homepageModules: Record<string, boolean>;
  /** Rich homepage module controls (order, caps, source). */
  homepageModuleDefs: Record<HomepageModuleId, HomepageModuleSetting>;
  featuredTeamIds: string[];
  featuredNewsIds: string[];
  featuredSponsorIds: string[];
  /** Legacy boolean map merged with `privacy` on save. */
  visibilityRules: Record<string, boolean>;
  /** Public microsite page + navigation settings. */
  microPages: Record<PublicMicroPageId, MicroPageSettings>;
  /** Fine-grained visibility for the public microsite (best-effort enforcement on the public app). */
  privacy: PrivacyPack;
  /** Optional flexible nav labels, order, and homepage module toggles (merged with microPages / homepageModuleDefs). */
  publicPageConfig?: PublicPageConfigPatch;
}

export interface ClubPublicPageDraftRow {
  club_id: string;
  config: ClubPublicPageConfig;
  updated_at: string;
  updated_by: string | null;
}

export interface PublishedClubPageRow {
  record: Record<string, unknown>;
}

function asTrimmedString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function asUnitInterval(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function numOrStringToCoordString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

export function parseClubPublicPageConfig(raw: unknown): ClubPublicPageConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (Number(o.schemaVersion) !== CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION) return null;
  const g = o.general as Record<string, unknown> | undefined;
  const b = o.branding as Record<string, unknown> | undefined;
  const a = o.assets as Record<string, unknown> | undefined;
  const ct = o.contact as Record<string, unknown> | undefined;
  const so = o.social as Record<string, unknown> | undefined;
  const se = o.seo as Record<string, unknown> | undefined;
  const ob = o.onboarding as Record<string, unknown> | undefined;
  if (!g || !b || !a || !ct || !so || !se || !ob) return null;
  const jam = asTrimmedString(ob.join_approval_mode, "manual");
  const jrp = asTrimmedString(ob.join_reviewer_policy, "admin_only");
  const themeRaw = asTrimmedString(b.theme_preference, "system");
  const theme_preference = themeRaw === "light" || themeRaw === "dark" ? themeRaw : "system";
  const sections = parsePublicPageSections(o.publicPageSections);
  const visibilityRules: Record<string, boolean> =
    o.visibilityRules && typeof o.visibilityRules === "object" && !Array.isArray(o.visibilityRules)
      ? { ...(o.visibilityRules as Record<string, boolean>) }
      : {};
  const privacy = normalizePrivacy(o.privacy, visibilityRules);
  const microPages = normalizeMicroPages(o.microPages, sections);
  const mergedSections = applyMicroPagesToSections(microPages, sections);
  return {
    schemaVersion: CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION,
    general: {
      name: asTrimmedString(g.name, "Club"),
      slug: asTrimmedString(g.slug, "club"),
      description: g.description == null || g.description === "" ? null : String(g.description),
      is_public: asBool(g.is_public, true),
      default_language: asTrimmedString(g.default_language, "en"),
      timezone: asTrimmedString(g.timezone, "Europe/Berlin"),
      club_category: asTrimmedString(g.club_category),
    },
    branding: {
      primary_color: asTrimmedString(b.primary_color, "#C4A052"),
      secondary_color: asTrimmedString(b.secondary_color, "#1E293B"),
      tertiary_color: asTrimmedString(b.tertiary_color, "#0F172A"),
      support_color: asTrimmedString(b.support_color, "#22C55E"),
      foreground_color: asTrimmedString(b.foreground_color, "#F8FAFC"),
      theme_preference,
    },
    assets: {
      logo_url: asTrimmedString(a.logo_url),
      favicon_url: asTrimmedString(a.favicon_url),
      cover_image_url: asTrimmedString(a.cover_image_url),
      hero_image_url: asTrimmedString(a.hero_image_url),
      reference_images: asStringArray(a.reference_images).slice(0, 8),
      logo_alt: asTrimmedString(a.logo_alt),
      favicon_alt: asTrimmedString(a.favicon_alt),
      cover_alt: asTrimmedString(a.cover_alt),
      hero_alt: asTrimmedString(a.hero_alt),
      cover_object_position: asTrimmedString(a.cover_object_position, "center"),
      hero_object_position: asTrimmedString(a.hero_object_position, "center"),
      default_generated_asset: asTrimmedString(a.default_generated_asset, "cover"),
      default_hero_asset_id: normalizeDefaultHeroAssetId(a.default_hero_asset_id),
      hero_club_color_overlay: asBool(a.hero_club_color_overlay, true),
      hero_tint_strength: asUnitInterval(a.hero_tint_strength, 0.45),
    },
    contact: {
      address: asTrimmedString(ct.address),
      phone: asTrimmedString(ct.phone),
      email: asTrimmedString(ct.email),
      website: asTrimmedString(ct.website),
      latitude: numOrStringToCoordString(ct.latitude),
      longitude: numOrStringToCoordString(ct.longitude),
      public_location_notes: asTrimmedString(ct.public_location_notes),
    },
    social: {
      facebook_url: asTrimmedString(so.facebook_url),
      instagram_url: asTrimmedString(so.instagram_url),
      twitter_url: asTrimmedString(so.twitter_url),
      youtube_url: asTrimmedString(so.youtube_url),
      tiktok_url: asTrimmedString(so.tiktok_url),
    },
    seo: {
      meta_title: asTrimmedString(se.meta_title),
      meta_description: asTrimmedString(se.meta_description),
      news_page_subtitle:
        se.news_page_subtitle == null || String(se.news_page_subtitle).trim() === ""
          ? null
          : String(se.news_page_subtitle).trim(),
      og_image_url: asTrimmedString(se.og_image_url),
      allow_indexing: asBool(se.allow_indexing, true),
      structured_data_enabled: asBool(se.structured_data_enabled, true),
    },
    onboarding: {
      join_approval_mode: jam === "auto" ? "auto" : "manual",
      join_reviewer_policy: jrp === "admin_trainer" ? "admin_trainer" : "admin_only",
      join_default_role: asTrimmedString(ob.join_default_role, "member"),
      join_default_team: asTrimmedString(ob.join_default_team),
      join_notify_emails: asTrimmedString(ob.join_notify_emails),
      join_auto_approve_invited_only: asBool(ob.join_auto_approve_invited_only, false),
    },
    publicPageSections: mergedSections,
    homepageModules:
      o.homepageModules && typeof o.homepageModules === "object" && !Array.isArray(o.homepageModules)
        ? { ...(o.homepageModules as Record<string, boolean>) }
        : {},
    homepageModuleDefs: normalizeHomepageModuleDefs(o.homepageModuleDefs),
    featuredTeamIds: asStringArray(o.featuredTeamIds),
    featuredNewsIds: asStringArray(o.featuredNewsIds),
    featuredSponsorIds: asStringArray(o.featuredSponsorIds),
    visibilityRules: { ...visibilityRules, ...privacyToVisibilityRules(privacy) },
    microPages,
    privacy,
    publicPageConfig: parsePublicPageConfigPatch(o.publicPageConfig),
  };
}

/** Build a full config object from a `clubs` row (legacy columns). */
export function clubRowToPublicPageConfig(row: Record<string, unknown>): ClubPublicPageConfig {
  const referenceImages = Array.isArray(row.reference_images)
    ? row.reference_images.map((item) => String(item)).filter(Boolean)
    : [];
  const sections = parsePublicPageSections(row.public_page_sections);
  const microPages = normalizeMicroPages(null, sections);
  const mergedSections = applyMicroPagesToSections(microPages, sections);
  const privacy = normalizePrivacy(null, {});
  return {
    schemaVersion: CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION,
    general: {
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      description: (row.description as string | null) ?? null,
      is_public: row.is_public !== false,
      default_language: asTrimmedString(row.default_language, "en"),
      timezone: asTrimmedString(row.timezone, "Europe/Berlin"),
      club_category: asTrimmedString(row.club_category),
    },
    branding: {
      primary_color: asTrimmedString(row.primary_color, "#C4A052"),
      secondary_color: asTrimmedString(row.secondary_color, "#1E293B"),
      tertiary_color: asTrimmedString(row.tertiary_color, "#0F172A"),
      support_color: asTrimmedString(row.support_color, "#22C55E"),
      foreground_color: "#F8FAFC",
      theme_preference: "system",
    },
    assets: {
      logo_url: asTrimmedString(row.logo_url),
      favicon_url: asTrimmedString(row.favicon_url),
      cover_image_url: asTrimmedString(row.cover_image_url),
      hero_image_url: "",
      reference_images: referenceImages.slice(0, 8),
      logo_alt: "",
      favicon_alt: "",
      cover_alt: "",
      hero_alt: "",
      cover_object_position: "center",
      hero_object_position: "center",
      default_generated_asset: "cover",
      default_hero_asset_id: normalizeDefaultHeroAssetId(null),
      hero_club_color_overlay: true,
      hero_tint_strength: 0.45,
    },
    contact: {
      address: asTrimmedString(row.address),
      phone: asTrimmedString(row.phone),
      email: asTrimmedString(row.email),
      website: asTrimmedString(row.website),
      latitude: numOrStringToCoordString(row.latitude),
      longitude: numOrStringToCoordString(row.longitude),
      public_location_notes: asTrimmedString(row.public_location_notes),
    },
    social: {
      facebook_url: asTrimmedString(row.facebook_url),
      instagram_url: asTrimmedString(row.instagram_url),
      twitter_url: asTrimmedString(row.twitter_url),
      youtube_url: asTrimmedString(row.youtube_url),
      tiktok_url: asTrimmedString(row.tiktok_url),
    },
    seo: {
      meta_title: asTrimmedString(row.meta_title),
      meta_description: asTrimmedString(row.meta_description),
      news_page_subtitle: null,
      og_image_url: asTrimmedString(row.og_image_url),
      allow_indexing: row.public_seo_allow_indexing !== false,
      structured_data_enabled: row.public_seo_structured_data !== false,
    },
    onboarding: {
      join_approval_mode: (row.join_approval_mode as "manual" | "auto") || "manual",
      join_reviewer_policy: (row.join_reviewer_policy as "admin_only" | "admin_trainer") || "admin_only",
      join_default_role: asTrimmedString(row.join_default_role, "member"),
      join_default_team: asTrimmedString(row.join_default_team),
      join_notify_emails: "",
      join_auto_approve_invited_only: false,
    },
    publicPageSections: mergedSections,
    homepageModules: {},
    homepageModuleDefs: normalizeHomepageModuleDefs(null),
    featuredTeamIds: [],
    featuredNewsIds: [],
    featuredSponsorIds: [],
    visibilityRules: { ...privacyToVisibilityRules(privacy) },
    microPages,
    privacy,
    publicPageConfig: undefined,
  };
}

export function publicPageConfigToJson(config: ClubPublicPageConfig): Record<string, unknown> {
  const micro = Object.fromEntries(
    (Object.keys(config.microPages) as PublicMicroPageId[]).map((id) => [id, { ...config.microPages[id] }])
  );
  const hdefs = Object.fromEntries(
    (Object.keys(config.homepageModuleDefs) as HomepageModuleId[]).map((id) => [id, { ...config.homepageModuleDefs[id] }])
  );
  return {
    schemaVersion: config.schemaVersion,
    general: { ...config.general },
    branding: { ...config.branding },
    assets: {
      ...config.assets,
      reference_images: [...config.assets.reference_images],
    },
    contact: { ...config.contact },
    social: { ...config.social },
    seo: { ...config.seo },
    onboarding: { ...config.onboarding },
    publicPageSections: toPublicPageSectionsJson(config.publicPageSections),
    homepageModules: { ...config.homepageModules },
    homepageModuleDefs: hdefs,
    featuredTeamIds: [...config.featuredTeamIds],
    featuredNewsIds: [...config.featuredNewsIds],
    featuredSponsorIds: [...config.featuredSponsorIds],
    visibilityRules: { ...config.visibilityRules },
    microPages: micro,
    privacy: { ...config.privacy },
    ...(config.publicPageConfig
      ? { publicPageConfig: JSON.parse(JSON.stringify(config.publicPageConfig)) as PublicPageConfigPatch }
      : {}),
  };
}

/** Synthetic `clubs`-shaped fields for `mapClubRow` / team theme after applying a page config. */
export function publicPageConfigToClubRowPatch(config: ClubPublicPageConfig): Record<string, unknown> {
  const lat = config.contact.latitude.trim();
  const lon = config.contact.longitude.trim();
  const latNum = lat === "" ? null : Number(lat);
  const lonNum = lon === "" ? null : Number(lon);
  return {
    name: config.general.name,
    slug: config.general.slug,
    description: config.general.description,
    is_public: config.general.is_public,
    default_language: config.general.default_language || null,
    timezone: config.general.timezone || null,
    club_category: config.general.club_category || null,
    primary_color: config.branding.primary_color || null,
    secondary_color: config.branding.secondary_color || null,
    tertiary_color: config.branding.tertiary_color || null,
    support_color: config.branding.support_color || null,
    logo_url: config.assets.logo_url || null,
    favicon_url: config.assets.favicon_url || null,
    cover_image_url: config.assets.cover_image_url || null,
    reference_images: config.assets.reference_images,
    address: config.contact.address || null,
    phone: config.contact.phone || null,
    email: config.contact.email || null,
    website: config.contact.website || null,
    latitude: latNum != null && Number.isFinite(latNum) ? latNum : null,
    longitude: lonNum != null && Number.isFinite(lonNum) ? lonNum : null,
    public_location_notes: config.contact.public_location_notes || null,
    facebook_url: config.social.facebook_url || null,
    instagram_url: config.social.instagram_url || null,
    twitter_url: config.social.twitter_url || null,
    youtube_url: config.social.youtube_url || null,
    tiktok_url: config.social.tiktok_url || null,
    meta_title: config.seo.meta_title || null,
    meta_description: config.seo.meta_description || null,
    og_image_url: config.seo.og_image_url || null,
    public_seo_allow_indexing: config.seo.allow_indexing,
    public_seo_structured_data: config.seo.structured_data_enabled,
    join_approval_mode: config.onboarding.join_approval_mode,
    join_reviewer_policy: config.onboarding.join_reviewer_policy,
    join_default_role: config.onboarding.join_default_role || "member",
    join_default_team: config.onboarding.join_default_team || null,
    join_auto_approve_invited_only: config.onboarding.join_auto_approve_invited_only === true,
    public_page_sections: toPublicPageSectionsJson(config.publicPageSections),
  };
}

export function mergeClubRowWithPublicPageConfig(
  baseRow: Record<string, unknown>,
  config: ClubPublicPageConfig | null
): Record<string, unknown> {
  if (!config) return { ...baseRow };
  return { ...baseRow, ...publicPageConfigToClubRowPatch(config) };
}

export function mergeRowWithEffectivePublished(row: Record<string, unknown>): Record<string, unknown> {
  const snap = row.public_page_published_config;
  if (snap == null) return { ...row };
  const parsed = parseClubPublicPageConfig(snap);
  if (!parsed) return { ...row };
  return mergeClubRowWithPublicPageConfig(row, parsed);
}

export function stableConfigFingerprint(config: ClubPublicPageConfig): string {
  return JSON.stringify(publicPageConfigToJson(config));
}

export const CLUB_PUBLIC_PAGE_ROW_SELECT =
  "id, name, slug, description, is_public, default_language, timezone, club_category, logo_url, cover_image_url, favicon_url, primary_color, secondary_color, tertiary_color, support_color, reference_images, address, phone, email, website, meta_title, meta_description, facebook_url, instagram_url, twitter_url, youtube_url, tiktok_url, og_image_url, public_seo_allow_indexing, public_seo_structured_data, join_approval_mode, join_default_role, join_default_team, join_reviewer_policy, join_auto_approve_invited_only, public_page_sections, public_page_published_config, public_page_published_at, public_page_publish_version, latitude, longitude, public_location_notes";

const CLUB_PUBLIC_SELECT_FOR_SLUG = CLUB_PUBLIC_PAGE_ROW_SELECT;

/**
 * Load club by slug and return the row merged with the latest **published** page config when present.
 * Legacy clubs (`public_page_published_config` null) keep column-only behavior.
 */
export async function getPublishedClubPageBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  const { data, error } = await supabase.from("clubs").select(CLUB_PUBLIC_SELECT_FOR_SLUG).eq("slug", slug).maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  const row = data as Record<string, unknown> | null;
  if (!row) return { data: null, error: null };
  return { data: mergeRowWithEffectivePublished(row), error: null };
}

/** Draft JSON for a club, or null if none saved yet. */
export async function getClubPageDraftConfig(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ data: ClubPublicPageConfig | null; error: Error | null }> {
  const { data, error } = await supabase.from("club_public_page_drafts").select("config").eq("club_id", clubId).maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  const raw = (data as { config?: unknown } | null)?.config;
  if (raw == null) return { data: null, error: null };
  const parsed = parseClubPublicPageConfig(raw);
  return { data: parsed, error: parsed ? null : new Error("invalid_draft_config") };
}

export async function saveClubPageDraftConfig(
  supabase: SupabaseClient,
  clubId: string,
  config: ClubPublicPageConfig,
  adminUserId: string | null
): Promise<{ error: Error | null }> {
  const payload = {
    club_id: clubId,
    config: publicPageConfigToJson(config),
    updated_by: adminUserId,
  };
  const { error } = await supabase.from("club_public_page_drafts").upsert(payload, { onConflict: "club_id" });
  return { error: error ? new Error(error.message) : null };
}

export async function publishClubPageConfig(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ data: unknown; error: Error | null }> {
  const { data, error } = await supabase.rpc("publish_club_public_page_config", { p_club_id: clubId });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

export async function unpublishClubPublicWebsite(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ data: unknown; error: Error | null }> {
  const { data, error } = await supabase.rpc("unpublish_club_public_website", { p_club_id: clubId });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

/** Verify admin and return merged row for draft preview (same shape as published merge). */
export async function getDraftClubPagePreview(
  supabase: SupabaseClient,
  clubId: string,
  adminUserId: string
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_club_admin", {
    _club_id: clubId,
    _user_id: adminUserId,
  });
  if (rpcError) return { data: null, error: new Error(rpcError.message) };
  if (!isAdmin) return { data: null, error: new Error("not_authorized") };

  const { data: club, error: clubError } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();
  if (clubError) return { data: null, error: new Error(clubError.message) };
  if (!club) return { data: null, error: new Error("club_not_found") };

  const base = mergeRowWithEffectivePublished(club as Record<string, unknown>);
  const { data: draftRaw } = await supabase.from("club_public_page_drafts").select("config").eq("club_id", clubId).maybeSingle();
  const draftConfig = parseClubPublicPageConfig((draftRaw as { config?: unknown } | null)?.config);
  if (!draftConfig) return { data: base, error: null };
  return { data: mergeClubRowWithPublicPageConfig(base, draftConfig), error: null };
}

/** Baseline published config for dirty-checking in admin (published JSON or row-derived). */
export function getPublishedBaselineConfig(row: Record<string, unknown>): ClubPublicPageConfig {
  const published = row.public_page_published_config;
  if (published == null) return clubRowToPublicPageConfig(row);
  return parseClubPublicPageConfig(published) ?? clubRowToPublicPageConfig(row);
}

export function defaultPublicPageConfigFromPartial(row: Record<string, unknown>): ClubPublicPageConfig {
  const base = clubRowToPublicPageConfig(row);
  return {
    ...base,
    publicPageSections: { ...DEFAULT_PUBLIC_PAGE_SECTIONS, ...base.publicPageSections },
  };
}

/** Flat shape matching `ClubPageAdmin` form fields for round-tripping. */
export interface ClubPublicPageEditorFormLike {
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
  default_language: string;
  timezone: string;
  club_category: string;
  logo_url: string;
  favicon_url: string;
  cover_image_url: string;
  hero_image_url: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  support_color: string;
  foreground_color: string;
  theme_preference: "system" | "light" | "dark";
  logo_alt: string;
  favicon_alt: string;
  cover_alt: string;
  hero_alt: string;
  cover_object_position: string;
  hero_object_position: string;
  default_generated_asset: string;
  default_hero_asset_id: string;
  hero_club_color_overlay: boolean;
  hero_tint_strength: number;
  reference_images: string[];
  address: string;
  phone: string;
  email: string;
  website: string;
  contact_latitude: string;
  contact_longitude: string;
  public_location_notes: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  tiktok_url: string;
  meta_title: string;
  meta_description: string;
  news_page_subtitle: string;
  seo_og_image_url: string;
  seo_allow_indexing: boolean;
  seo_structured_data_enabled: boolean;
  join_approval_mode: "manual" | "auto";
  join_reviewer_policy: "admin_only" | "admin_trainer";
  join_default_role: string;
  join_default_team: string;
  join_notify_emails: string;
  join_auto_approve_invited_only: boolean;
  publicPageSections: PublicPageSectionsState;
  microPages: Record<PublicMicroPageId, MicroPageSettings>;
  homepageModuleDefs: Record<HomepageModuleId, HomepageModuleSetting>;
  privacy: PrivacyPack;
  /** Up to ~12 team UUIDs featured on the public home page (order preserved). */
  featured_team_ids: string[];
  /** When true, `homepageModules.partners` is set so the home page can show a public partners strip. */
  homepage_show_partners: boolean;
  /** Optional flexible public layout (nav labels, order, homepage blocks). */
  publicPageConfig?: PublicPageConfigPatch;
}

export function publicPageConfigToEditorForm(c: ClubPublicPageConfig): ClubPublicPageEditorFormLike {
  return {
    name: c.general.name,
    slug: c.general.slug,
    description: c.general.description ?? "",
    is_public: c.general.is_public,
    default_language: c.general.default_language,
    timezone: c.general.timezone,
    club_category: c.general.club_category,
    logo_url: c.assets.logo_url,
    favicon_url: c.assets.favicon_url,
    cover_image_url: c.assets.cover_image_url,
    hero_image_url: c.assets.hero_image_url,
    primary_color: c.branding.primary_color,
    secondary_color: c.branding.secondary_color,
    tertiary_color: c.branding.tertiary_color,
    support_color: c.branding.support_color,
    foreground_color: c.branding.foreground_color,
    theme_preference: c.branding.theme_preference,
    logo_alt: c.assets.logo_alt,
    favicon_alt: c.assets.favicon_alt,
    cover_alt: c.assets.cover_alt,
    hero_alt: c.assets.hero_alt,
    cover_object_position: c.assets.cover_object_position,
    hero_object_position: c.assets.hero_object_position,
    default_generated_asset: c.assets.default_generated_asset,
    default_hero_asset_id: c.assets.default_hero_asset_id,
    hero_club_color_overlay: c.assets.hero_club_color_overlay !== false,
    hero_tint_strength: asUnitInterval(c.assets.hero_tint_strength, 0.45),
    reference_images: [...c.assets.reference_images],
    address: c.contact.address,
    phone: c.contact.phone,
    email: c.contact.email,
    website: c.contact.website,
    contact_latitude: c.contact.latitude,
    contact_longitude: c.contact.longitude,
    public_location_notes: c.contact.public_location_notes,
    facebook_url: c.social.facebook_url,
    instagram_url: c.social.instagram_url,
    twitter_url: c.social.twitter_url,
    youtube_url: c.social.youtube_url,
    tiktok_url: c.social.tiktok_url,
    meta_title: c.seo.meta_title,
    meta_description: c.seo.meta_description,
    news_page_subtitle: c.seo.news_page_subtitle ?? "",
    seo_og_image_url: c.seo.og_image_url,
    seo_allow_indexing: c.seo.allow_indexing,
    seo_structured_data_enabled: c.seo.structured_data_enabled,
    join_approval_mode: c.onboarding.join_approval_mode,
    join_reviewer_policy: c.onboarding.join_reviewer_policy,
    join_default_role: c.onboarding.join_default_role,
    join_default_team: c.onboarding.join_default_team,
    join_notify_emails: c.onboarding.join_notify_emails,
    join_auto_approve_invited_only: c.onboarding.join_auto_approve_invited_only,
    publicPageSections: { ...c.publicPageSections },
    microPages: JSON.parse(JSON.stringify(c.microPages)) as Record<PublicMicroPageId, MicroPageSettings>,
    homepageModuleDefs: JSON.parse(JSON.stringify(c.homepageModuleDefs)) as Record<HomepageModuleId, HomepageModuleSetting>,
    privacy: { ...c.privacy },
    featured_team_ids: [...c.featuredTeamIds].slice(0, 12),
    homepage_show_partners: c.homepageModules?.partners === true,
    publicPageConfig: c.publicPageConfig ? (JSON.parse(JSON.stringify(c.publicPageConfig)) as PublicPageConfigPatch) : undefined,
  };
}

export function editorFormToPublicPageConfig(
  f: ClubPublicPageEditorFormLike,
  preserve?: ClubPublicPageConfig | null
): ClubPublicPageConfig {
  const p = preserve ?? null;
  const featuredTeamIds = (f.featured_team_ids ?? []).map((id) => String(id).trim()).filter(Boolean).slice(0, 12);
  const microPages = JSON.parse(JSON.stringify(f.microPages)) as Record<PublicMicroPageId, MicroPageSettings>;
  const baseSections = { ...DEFAULT_PUBLIC_PAGE_SECTIONS, ...f.publicPageSections };
  const mergedSections = applyMicroPagesToSections(microPages, baseSections);
  const privacy = { ...f.privacy };
  return {
    schemaVersion: CLUB_PUBLIC_PAGE_CONFIG_SCHEMA_VERSION,
    general: {
      name: f.name.trim(),
      slug: f.slug.trim(),
      description: f.description.trim() || null,
      is_public: f.is_public,
      default_language: f.default_language.trim() || "en",
      timezone: f.timezone.trim() || "Europe/Berlin",
      club_category: f.club_category.trim(),
    },
    branding: {
      primary_color: f.primary_color.trim() || "#C4A052",
      secondary_color: f.secondary_color.trim() || "#1E293B",
      tertiary_color: f.tertiary_color.trim() || "#0F172A",
      support_color: f.support_color.trim() || "#22C55E",
      foreground_color: f.foreground_color.trim() || "#F8FAFC",
      theme_preference: f.theme_preference === "light" || f.theme_preference === "dark" ? f.theme_preference : "system",
    },
    assets: {
      logo_url: f.logo_url.trim(),
      favicon_url: f.favicon_url.trim(),
      cover_image_url: f.cover_image_url.trim(),
      hero_image_url: f.hero_image_url.trim(),
      reference_images: f.reference_images.filter((u) => u.trim()).slice(0, 8),
      logo_alt: f.logo_alt.trim(),
      favicon_alt: f.favicon_alt.trim(),
      cover_alt: f.cover_alt.trim(),
      hero_alt: f.hero_alt.trim(),
      cover_object_position: f.cover_object_position.trim() || "center",
      hero_object_position: f.hero_object_position.trim() || "center",
      default_generated_asset: f.default_generated_asset.trim() || "cover",
      default_hero_asset_id: normalizeDefaultHeroAssetId(f.default_hero_asset_id),
      hero_club_color_overlay: f.hero_club_color_overlay !== false,
      hero_tint_strength: asUnitInterval(f.hero_tint_strength, 0.45),
    },
    contact: {
      address: f.address.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      website: f.website.trim(),
      latitude: f.contact_latitude.trim(),
      longitude: f.contact_longitude.trim(),
      public_location_notes: f.public_location_notes.trim(),
    },
    social: {
      facebook_url: f.facebook_url.trim(),
      instagram_url: f.instagram_url.trim(),
      twitter_url: f.twitter_url.trim(),
      youtube_url: f.youtube_url.trim(),
      tiktok_url: f.tiktok_url.trim(),
    },
    seo: {
      meta_title: f.meta_title.trim(),
      meta_description: f.meta_description.trim(),
      news_page_subtitle: f.news_page_subtitle.trim() || null,
      og_image_url: f.seo_og_image_url.trim(),
      allow_indexing: f.seo_allow_indexing,
      structured_data_enabled: f.seo_structured_data_enabled,
    },
    onboarding: {
      join_approval_mode: f.join_approval_mode,
      join_reviewer_policy: f.join_reviewer_policy,
      join_default_role: f.join_default_role || "member",
      join_default_team: f.join_default_team.trim(),
      join_notify_emails: f.join_notify_emails.trim(),
      join_auto_approve_invited_only: f.join_auto_approve_invited_only,
    },
    publicPageSections: mergedSections,
    homepageModules: { ...(p?.homepageModules ?? {}), partners: f.homepage_show_partners === true },
    homepageModuleDefs: JSON.parse(JSON.stringify(f.homepageModuleDefs)) as Record<HomepageModuleId, HomepageModuleSetting>,
    featuredTeamIds,
    featuredNewsIds: p ? [...p.featuredNewsIds] : [],
    featuredSponsorIds: p ? [...p.featuredSponsorIds] : [],
    visibilityRules: {
      ...(p?.visibilityRules ?? {}),
      ...privacyToVisibilityRules(privacy),
    },
    microPages,
    privacy,
    publicPageConfig: f.publicPageConfig ?? p?.publicPageConfig,
  };
}

export function emptyClubPublicPageEditorForm(): ClubPublicPageEditorFormLike {
  const sections = { ...DEFAULT_PUBLIC_PAGE_SECTIONS };
  return {
    name: "",
    slug: "",
    description: "",
    is_public: true,
    default_language: "en",
    timezone: "Europe/Berlin",
    club_category: "",
    logo_url: "",
    favicon_url: "",
    cover_image_url: "",
    hero_image_url: "",
    primary_color: "#C4A052",
    secondary_color: "#1E293B",
    tertiary_color: "#0F172A",
    support_color: "#22C55E",
    foreground_color: "#F8FAFC",
    theme_preference: "system",
    logo_alt: "",
    favicon_alt: "",
    cover_alt: "",
    hero_alt: "",
    cover_object_position: "center",
    hero_object_position: "center",
    default_generated_asset: "cover",
    default_hero_asset_id: normalizeDefaultHeroAssetId(null),
    hero_club_color_overlay: true,
    hero_tint_strength: 0.45,
    reference_images: [],
    address: "",
    phone: "",
    email: "",
    website: "",
    contact_latitude: "",
    contact_longitude: "",
    public_location_notes: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    youtube_url: "",
    tiktok_url: "",
    meta_title: "",
    meta_description: "",
    news_page_subtitle: "",
    seo_og_image_url: "",
    seo_allow_indexing: true,
    seo_structured_data_enabled: true,
    join_approval_mode: "manual",
    join_reviewer_policy: "admin_only",
    join_default_role: "member",
    join_default_team: "",
    join_notify_emails: "",
    join_auto_approve_invited_only: false,
    publicPageSections: sections,
    microPages: buildMicroPagesFromSections(sections),
    homepageModuleDefs: defaultHomepageModules(),
    privacy: { ...DEFAULT_PRIVACY },
    featured_team_ids: [],
    homepage_show_partners: false,
    publicPageConfig: undefined,
  };
}
