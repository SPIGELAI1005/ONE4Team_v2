import type {
  MarketplaceAvailabilityMode,
  MarketplaceProviderProfileRow,
  MarketplaceProviderType,
  MarketplaceServicePackage,
  MarketplaceVisibility,
} from "@/lib/marketplace-models";
import { computeProfileCompleteness } from "@/lib/marketplace-models";

/** Normalize a supplier public-page slug (lowercase, hyphen-separated). */
export function normalizeProviderSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** In-memory listing form state for provider editor. */
export interface MarketplaceListingDraft {
  slug: string;
  provider_name: string;
  logo_url: string;
  cover_image_url: string;
  short_description: string;
  detailed_description: string;
  location: string;
  service_area_km: string;
  availability_mode: MarketplaceAvailabilityMode | "";
  contact_person: string;
  contact_email: string;
  phone: string;
  website: string;
  categories: string[];
  visibility: MarketplaceVisibility;
  packages: MarketplaceServicePackage[];
  price_indication: string;
  availability_notes: string;
  references: string[];
  document_urls: string[];
}

export function emptyListingDraft(email?: string | null): MarketplaceListingDraft {
  return {
    slug: "",
    provider_name: "",
    logo_url: "",
    cover_image_url: "",
    short_description: "",
    detailed_description: "",
    location: "",
    service_area_km: "",
    availability_mode: "",
    contact_person: "",
    contact_email: email ?? "",
    phone: "",
    website: "",
    categories: [],
    visibility: "private",
    packages: [],
    price_indication: "",
    availability_notes: "",
    references: [],
    document_urls: [],
  };
}

function documentPackagesFromProfile(packages: MarketplaceServicePackage[]): {
  servicePackages: MarketplaceServicePackage[];
  documentUrls: string[];
} {
  const servicePackages: MarketplaceServicePackage[] = [];
  const documentUrls: string[] = [];
  for (const pkg of packages) {
    if (pkg.kind === "document" && pkg.url) {
      documentUrls.push(pkg.url);
    } else {
      servicePackages.push(pkg);
    }
  }
  return { servicePackages, documentUrls };
}

export function listingDraftFromProfile(
  profile: MarketplaceProviderProfileRow | null,
  fallbackEmail?: string | null,
): MarketplaceListingDraft {
  if (!profile) return emptyListingDraft(fallbackEmail);
  const { servicePackages, documentUrls } = documentPackagesFromProfile(profile.packages);
  return {
    slug: profile.slug ?? "",
    provider_name: profile.provider_name,
    logo_url: profile.logo_url ?? "",
    cover_image_url: profile.cover_image_url ?? "",
    short_description: profile.short_description ?? "",
    detailed_description: profile.detailed_description ?? "",
    location: profile.location ?? "",
    service_area_km: profile.service_area_km != null ? String(profile.service_area_km) : "",
    availability_mode: profile.availability_mode ?? "",
    contact_person: profile.contact_person ?? "",
    contact_email: profile.contact_email ?? "",
    phone: profile.phone ?? "",
    website: profile.website ?? "",
    categories: [...profile.categories],
    visibility: profile.visibility,
    packages: servicePackages,
    price_indication: profile.price_indication ?? "",
    availability_notes: profile.availability_notes ?? "",
    references: [...profile.references],
    document_urls: documentUrls,
  };
}

export function listingDraftToProfilePayload(
  draft: MarketplaceListingDraft,
  providerType: MarketplaceProviderType,
  existingStatus?: MarketplaceProviderProfileRow["listing_status"],
): Partial<MarketplaceProviderProfileRow> {
  const documentPackages: MarketplaceServicePackage[] = draft.document_urls
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({
      id: `doc-${index}`,
      name: url,
      kind: "document" as const,
      url,
    }));

  const serviceAreaKm = draft.service_area_km.trim()
    ? Number.parseInt(draft.service_area_km, 10)
    : null;

  const normalizedSlug = normalizeProviderSlug(draft.slug);

  const payload: Partial<MarketplaceProviderProfileRow> = {
    provider_type: providerType,
    slug: normalizedSlug || null,
    provider_name: draft.provider_name.trim() || "My listing",
    logo_url: draft.logo_url.trim() || null,
    cover_image_url: draft.cover_image_url.trim() || null,
    short_description: draft.short_description.trim() || null,
    detailed_description: draft.detailed_description.trim() || null,
    location: draft.location.trim() || null,
    service_area_km: Number.isFinite(serviceAreaKm) ? serviceAreaKm : null,
    availability_mode: draft.availability_mode || null,
    contact_person: draft.contact_person.trim() || null,
    contact_email: draft.contact_email.trim() || null,
    phone: draft.phone.trim() || null,
    website: draft.website.trim() || null,
    categories: draft.categories,
    visibility: draft.visibility,
    packages: [...draft.packages, ...documentPackages],
    price_indication: draft.price_indication.trim() || null,
    availability_notes: draft.availability_notes.trim() || null,
    references: draft.references.map((r) => r.trim()).filter(Boolean),
    listing_status: existingStatus ?? "draft",
  };

  payload.profile_completeness = computeProfileCompleteness(payload);
  return payload;
}

export function draftAsPreviewProfile(
  draft: MarketplaceListingDraft,
  providerType: MarketplaceProviderType,
  profile: MarketplaceProviderProfileRow | null,
): MarketplaceProviderProfileRow {
  const payload = listingDraftToProfilePayload(draft, providerType, profile?.listing_status ?? "draft");
  return {
    id: profile?.id ?? "preview",
    owner_user_id: profile?.owner_user_id ?? "",
    partner_id: profile?.partner_id ?? null,
    slug: normalizeProviderSlug(draft.slug) || profile?.slug || null,
    verification_status: profile?.verification_status ?? "unverified",
    is_featured: profile?.is_featured ?? false,
    rejection_reason: profile?.rejection_reason ?? null,
    created_at: profile?.created_at ?? "",
    updated_at: profile?.updated_at ?? "",
    listing_status: profile?.listing_status ?? "draft",
    ...payload,
    provider_name: payload.provider_name!,
    categories: payload.categories ?? [],
    packages: payload.packages ?? [],
    references: payload.references ?? [],
    visibility: payload.visibility ?? "private",
    profile_completeness: payload.profile_completeness ?? 0,
  } as MarketplaceProviderProfileRow;
}
