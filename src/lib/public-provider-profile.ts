import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";

/** Public SEO page may only show active listings with marketplace/public visibility. */
export function isPublicProviderListingDiscoverable(
  profile: Pick<MarketplaceProviderProfileRow, "listing_status" | "visibility">,
): boolean {
  if (profile.listing_status !== "active") return false;
  return profile.visibility === "marketplace_only" || profile.visibility === "public";
}

export function publicProviderShareUrl(slug: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/providers/${slug}`;
}
