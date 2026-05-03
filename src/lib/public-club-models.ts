import { parsePublicPageSections, type PublicPageSectionsState } from "@/lib/club-public-page-sections";
import { clubRowToPublicPageConfig, parseClubPublicPageConfig, type ClubPublicPageConfig } from "@/lib/club-public-page-config";
import { resolvePublicPageConfigFromClub, type PublicPageConfig } from "@/lib/public-page-flex-config";
import {
  normalizeHomepageModuleDefs,
  type HomepageModuleId,
  type HomepageModuleSetting,
} from "@/lib/club-page-settings-helpers";
import { normalizeDefaultHeroAssetId } from "@/lib/club-hero-default-assets";
import type { PublicMicrositePrivacy } from "@/lib/public-club-privacy";
import { publicMicrositePrivacyFromConfig } from "@/lib/public-club-privacy";

export type PublicClubRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  /** Hero banner (published config or row); falls back to cover in UI when empty. */
  hero_image_url: string | null;
  /** CSS `object-position` for the public hero image. */
  hero_object_position: string;
  /** When false, public hero skips club-color duotone overlays. */
  hero_club_color_overlay: boolean;
  /** 0–1 overlay strength for the public hero (club tint enabled). */
  hero_tint_strength: number;
  /** Default hero slot when no hero/cover upload (`DEFAULT_CLUB_HERO_ASSETS`). */
  default_hero_asset_id: string;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  support_color: string | null;
  reference_images: string[] | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  meta_title: string | null;
  meta_description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  /** Admin SEO Open Graph image (absolute or site-relative). */
  og_image_url: string | null;
  /** When false, public pages emit noindex and omit JSON-LD. */
  seoAllowIndexing: boolean;
  /** When false, skip SportsOrganization / NewsArticle structured data. */
  seoStructuredDataEnabled: boolean;
  /** Optional coordinates for embedded map / directions on the public contact page. */
  latitude: number | null;
  longitude: number | null;
  /** Visitor-safe location or access notes (e.g. training grounds). */
  public_location_notes: string | null;
  join_approval_mode: "manual" | "auto";
  /** When true with auto approval, only visitors with a pending email invite skip manual review. */
  join_auto_approve_invited_only: boolean;
  join_default_role: string | null;
  join_default_team: string | null;
  sectionVisibility: PublicPageSectionsState;
  /** From published (or draft preview) page config JSON. */
  featured_team_ids: string[];
  /** Homepage block visibility, order, and caps from published / draft config. */
  homepageModuleDefs: Record<HomepageModuleId, HomepageModuleSetting>;
  homepage_module_partners: boolean;
  /** When true, do not surface aggregate member counts on the public home page. */
  visibility_hide_member_count_on_home: boolean;
  /** Effective public microsite privacy (includes youth mode). */
  micrositePrivacy: PublicMicrositePrivacy;
  /** From published (or draft preview) page config: ordered news IDs for featured slot on /news. */
  featured_news_ids: string[];
  /** Optional subtitle under “News & Updates” on the public news page. */
  news_page_subtitle: string | null;
  /** Resolved flexible public nav + homepage module layout. */
  publicPageLayout: PublicPageConfig;
};

export type TeamRowLite = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
  /** When false, team is hidden from public /club/…/teams (RLS + client filter). */
  public_website_visible?: boolean;
  public_description?: string | null;
  public_training_schedule_visible?: boolean;
  public_documents_visible?: boolean;
  public_document_links?: unknown;
};

export type TrainingSessionRowLite = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at?: string | null;
  team_id: string | null;
  teams?: { name: string } | null;
  source?: "training_session" | "activity";
  publish_to_public_schedule?: boolean;
};

export type EventRowLite = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  location: string | null;
  publish_to_public_schedule?: boolean;
  image_url?: string | null;
  /** Visitor-safe text only; never use internal `description` on the public site. */
  public_summary?: string | null;
  public_registration_enabled?: boolean;
  registration_external_url?: string | null;
  public_event_detail_enabled?: boolean;
};

export type NewsRowLite = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  priority: string | null;
  publish_to_public_website?: boolean;
  public_news_category?: string | null;
  image_url?: string | null;
  excerpt?: string | null;
};

export type PublicMatchLite = {
  id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  location: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  team_id: string | null;
  teams?: { name: string } | null;
  publish_to_public_schedule?: boolean;
  competitions?: { name: string } | null;
  opponent_logo_url?: string | null;
  public_match_detail_enabled?: boolean;
};

export type ShopProductLite = {
  id: string;
  name: string;
  description: string | null;
  price_eur: number;
  image_url: string | null;
  image_urls?: unknown;
  stock: number;
  is_active: boolean;
};

export type PublicPartnerLite = {
  id: string;
  name: string;
  partner_type: string | null;
  website: string | null;
};

function homepageFieldsFromConfig(cfg: ClubPublicPageConfig | null): Pick<
  PublicClubRecord,
  | "featured_team_ids"
  | "featured_news_ids"
  | "homepageModuleDefs"
  | "homepage_module_partners"
  | "visibility_hide_member_count_on_home"
  | "news_page_subtitle"
  | "micrositePrivacy"
> {
  if (!cfg) {
    return {
      featured_team_ids: [],
      featured_news_ids: [],
      homepageModuleDefs: normalizeHomepageModuleDefs(null),
      homepage_module_partners: false,
      visibility_hide_member_count_on_home: false,
      news_page_subtitle: null,
      micrositePrivacy: publicMicrositePrivacyFromConfig(null),
    };
  }
  const sub = cfg.seo.news_page_subtitle?.trim();
  return {
    featured_team_ids: cfg.featuredTeamIds.map(String).filter(Boolean).slice(0, 12),
    featured_news_ids: cfg.featuredNewsIds.map(String).filter(Boolean).slice(0, 12),
    homepageModuleDefs: normalizeHomepageModuleDefs(cfg.homepageModuleDefs),
    homepage_module_partners: cfg.homepageModules?.partners === true,
    visibility_hide_member_count_on_home: cfg.visibilityRules?.hide_member_count_on_home === true,
    news_page_subtitle: sub ? sub : null,
    micrositePrivacy: publicMicrositePrivacyFromConfig(cfg),
  };
}

function toOptionalFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function unitIntervalOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function mapClubRow(
  record: Record<string, unknown>,
  options?: { homepageConfig?: ClubPublicPageConfig | null }
): PublicClubRecord {
  const cfg =
    options?.homepageConfig !== undefined
      ? options.homepageConfig
      : parseClubPublicPageConfig(record.public_page_published_config);
  const layoutCfg = cfg ?? clubRowToPublicPageConfig(record);
  const home = homepageFieldsFromConfig(cfg ?? null);
  return {
    id: String(record.id),
    name: String(record.name),
    slug: String(record.slug),
    description: (record.description as string | null) ?? null,
    is_public: record.is_public !== false,
    logo_url: (record.logo_url as string | null) ?? null,
    cover_image_url: (record.cover_image_url as string | null) ?? null,
    hero_image_url:
      (typeof record.hero_image_url === "string" && record.hero_image_url.trim()) ||
      (cfg?.assets?.hero_image_url?.trim() ?? "") ||
      null,
    hero_object_position: (cfg?.assets?.hero_object_position?.trim() || "center") as string,
    hero_club_color_overlay: cfg?.assets?.hero_club_color_overlay !== false,
    hero_tint_strength: unitIntervalOr(cfg?.assets?.hero_tint_strength, 0.45),
    default_hero_asset_id: normalizeDefaultHeroAssetId(cfg?.assets?.default_hero_asset_id),
    favicon_url: (record.favicon_url as string | null) ?? null,
    primary_color: (record.primary_color as string | null) ?? null,
    secondary_color: (record.secondary_color as string | null) ?? null,
    tertiary_color: (record.tertiary_color as string | null) ?? null,
    support_color: (record.support_color as string | null) ?? null,
    reference_images: Array.isArray(record.reference_images) ? record.reference_images.map(String) : [],
    address: (record.address as string | null) ?? null,
    phone: (record.phone as string | null) ?? null,
    email: (record.email as string | null) ?? null,
    website: (record.website as string | null) ?? null,
    meta_title: (record.meta_title as string | null) ?? null,
    meta_description: (record.meta_description as string | null) ?? null,
    facebook_url: (record.facebook_url as string | null) ?? null,
    instagram_url: (record.instagram_url as string | null) ?? null,
    twitter_url: (record.twitter_url as string | null) ?? null,
    youtube_url: (record.youtube_url as string | null) ?? null,
    tiktok_url: (record.tiktok_url as string | null) ?? null,
    og_image_url: (record.og_image_url as string | null) ?? null,
    seoAllowIndexing: (record as { public_seo_allow_indexing?: boolean }).public_seo_allow_indexing !== false,
    seoStructuredDataEnabled: (record as { public_seo_structured_data?: boolean }).public_seo_structured_data !== false,
    latitude: toOptionalFiniteNumber(record.latitude),
    longitude: toOptionalFiniteNumber(record.longitude),
    public_location_notes: (record.public_location_notes as string | null) ?? null,
    join_approval_mode: (record.join_approval_mode as "manual" | "auto") || "manual",
    join_auto_approve_invited_only: (record as { join_auto_approve_invited_only?: boolean }).join_auto_approve_invited_only === true,
    join_default_role: (record.join_default_role as string | null) ?? "member",
    join_default_team: (record.join_default_team as string | null) ?? null,
    sectionVisibility: parsePublicPageSections(record.public_page_sections),
    publicPageLayout: resolvePublicPageConfigFromClub(layoutCfg),
    ...home,
  };
}

export function normalizeSectionSearch(q: string) {
  return q.trim().toLowerCase();
}

export function matchesSectionFilter(query: string, ...parts: (string | null | undefined)[]) {
  const n = normalizeSectionSearch(query);
  if (!n) return true;
  return parts.some((p) => p && String(p).toLowerCase().includes(n));
}

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  if (message.includes("Could not find the table")) return true;
  if (/\brelation\b.*\bdoes not exist\b/i.test(message)) return true;
  return false;
}

export function clubScheduleLocalDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function clubScheduleParseDayKey(key: string): Date {
  const [y, mo, da] = key.split("-").map((p) => Number(p));
  return new Date(y, mo - 1, da);
}

export function clubScheduleStartOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
