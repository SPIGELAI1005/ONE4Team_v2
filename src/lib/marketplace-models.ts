/** Marketplace & external provider portal - shared types and constants. */

import type { DashboardRole } from "@/lib/rbac-config";

export const MARKETPLACE_PROVIDER_TYPES = [
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
] as const;

export type MarketplaceProviderType = (typeof MARKETPLACE_PROVIDER_TYPES)[number];

export const MARKETPLACE_LISTING_STATUSES = [
  "draft",
  "submitted_for_review",
  "active",
  "paused",
  "rejected",
  "archived",
] as const;

export type MarketplaceListingStatus = (typeof MARKETPLACE_LISTING_STATUSES)[number];

export const MARKETPLACE_VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
] as const;

export type MarketplaceVerificationStatus = (typeof MARKETPLACE_VERIFICATION_STATUSES)[number];

export const MARKETPLACE_VISIBILITY = ["private", "marketplace_only", "public"] as const;
export type MarketplaceVisibility = (typeof MARKETPLACE_VISIBILITY)[number];

export const MARKETPLACE_AVAILABILITY_MODES = ["remote", "local", "hybrid"] as const;
export type MarketplaceAvailabilityMode = (typeof MARKETPLACE_AVAILABILITY_MODES)[number];

export const MARKETPLACE_REQUEST_STATUSES = [
  "draft",
  "open",
  "offers_received",
  "accepted",
  "closed",
  "cancelled",
] as const;

export type MarketplaceRequestStatus = (typeof MARKETPLACE_REQUEST_STATUSES)[number];

export const MARKETPLACE_REQUEST_VISIBILITY = [
  "private",
  "invited_providers_only",
  "marketplace",
] as const;

export type MarketplaceRequestVisibility = (typeof MARKETPLACE_REQUEST_VISIBILITY)[number];

export const MARKETPLACE_OFFER_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type MarketplaceOfferStatus = (typeof MARKETPLACE_OFFER_STATUSES)[number];

/** Curated categories for football-club procurement. */
export const MARKETPLACE_CATEGORIES = [
  "teamwear_jerseys",
  "sports_equipment",
  "balls_training_material",
  "goalkeeper_equipment",
  "printing_merchandise",
  "photography_video",
  "social_media_marketing",
  "website_it",
  "club_management_consulting",
  "sponsorship_consulting",
  "facility_maintenance",
  "catering_events",
  "transport",
  "medical_physio",
  "fitness_performance",
  "tournament_organization",
  "insurance_legal_tax",
  "fundraising",
  "fan_shop",
  "other_club_services",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export interface MarketplaceServicePackage {
  id: string;
  name: string;
  description?: string;
  priceIndication?: string;
  kind?: "package" | "document";
  url?: string;
}

export interface MarketplaceProviderProfileRow {
  id: string;
  owner_user_id: string;
  provider_type: MarketplaceProviderType;
  partner_id: string | null;
  provider_name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  short_description: string | null;
  detailed_description: string | null;
  categories: string[];
  location: string | null;
  service_area_km: number | null;
  availability_mode: MarketplaceAvailabilityMode | null;
  contact_person: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  packages: MarketplaceServicePackage[];
  price_indication: string | null;
  availability_notes: string | null;
  references: string[];
  visibility: MarketplaceVisibility;
  listing_status: MarketplaceListingStatus;
  verification_status: MarketplaceVerificationStatus;
  is_featured: boolean;
  rejection_reason: string | null;
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceRequestRow {
  id: string;
  club_id: string;
  created_by: string;
  title: string;
  category: string;
  provider_type_wanted: MarketplaceProviderType | null;
  description: string | null;
  quantity: string | null;
  visibility: MarketplaceRequestVisibility;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  location: string | null;
  attachments: unknown[];
  status: MarketplaceRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketplaceRequestInput {
  clubId: string;
  title: string;
  category: string;
  providerTypeWanted?: MarketplaceProviderType | null;
  description?: string;
  quantity?: string | null;
  visibility?: MarketplaceRequestVisibility;
  budgetMin?: number | null;
  budgetMax?: number | null;
  deadline?: string | null;
  location?: string | null;
  attachmentUrls?: string[];
  publish?: boolean;
}

export interface UpdateMarketplaceRequestInput extends Omit<CreateMarketplaceRequestInput, "clubId" | "publish"> {
  requestId: string;
  status?: MarketplaceRequestStatus;
  publish?: boolean;
}

export interface MarketplaceOfferRow {
  id: string;
  request_id: string;
  provider_profile_id: string;
  provider_role: MarketplaceProviderType;
  title: string;
  description: string | null;
  price_indication: string | null;
  currency: string;
  delivery_timeline: string | null;
  included_services: string[];
  attachments: unknown[];
  notes: string | null;
  status: MarketplaceOfferStatus;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketplaceOfferInput {
  requestId: string;
  providerProfileId: string;
  providerRole: MarketplaceProviderType;
  title: string;
  description?: string;
  priceIndication?: string;
  currency?: string;
  deliveryTimeline?: string;
  includedServices?: string[];
  attachmentUrls?: string[];
  notes?: string;
  asDraft?: boolean;
}

export interface UpdateMarketplaceOfferInput {
  offerId: string;
  title?: string;
  description?: string;
  priceIndication?: string;
  currency?: string;
  deliveryTimeline?: string;
  includedServices?: string[];
  attachmentUrls?: string[];
  notes?: string;
  status?: MarketplaceOfferStatus;
}

export interface MarketplaceSavedProviderRow {
  id: string;
  club_id: string;
  provider_profile_id: string;
  saved_by: string;
  created_at: string;
}

export type {
  ClubMarketplaceTab,
  ProviderPortalTab,
} from "@/lib/marketplace-product-structure";

export function providerTypeFromDashboardRole(
  role: DashboardRole | null,
): MarketplaceProviderType | null {
  switch (role) {
    case "sponsor":
      return "sponsor";
    case "supplier":
      return "supplier";
    case "service_provider":
      return "service_provider";
    case "consultant":
      return "consultant";
    default:
      return null;
  }
}

export function computeProfileCompleteness(
  profile: Partial<MarketplaceProviderProfileRow>,
): number {
  const checks = [
    Boolean(profile.provider_name?.trim()),
    Boolean(profile.short_description?.trim()),
    Boolean(profile.contact_email?.trim()),
    Boolean(profile.categories?.length),
    Boolean(profile.location?.trim()),
    Boolean(profile.logo_url),
    Boolean(profile.detailed_description?.trim()),
    Boolean(profile.packages?.length),
    Boolean(profile.contact_person?.trim()),
    Boolean(profile.availability_mode),
  ];
  const score = checks.filter(Boolean).length;
  return Math.round((score / checks.length) * 100);
}
