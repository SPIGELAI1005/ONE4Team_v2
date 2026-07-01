/**
 * Role-specific marketplace listing copy and section labels.
 */

import type { MarketplaceProviderType } from "@/lib/marketplace-models";

export interface ProviderListingSectionLabels {
  packages: string;
  packagesHint: string;
  roleNotes: string;
  roleNotesHint: string;
  priceIndication: string;
  references: string;
  referencesHint: string;
  documents: string;
  documentsHint: string;
}

const LISTING_SECTIONS: Record<MarketplaceProviderType, ProviderListingSectionLabels> = {
  sponsor: {
    packages: "Sponsorship packages",
    packagesHint: "Define tiers clubs can choose from (e.g. kit sponsor, main sponsor).",
    roleNotes: "Public placement preferences",
    roleNotesHint: "Where and how you prefer your logo to appear on club channels.",
    priceIndication: "Typical sponsorship range",
    references: "Sponsorship examples",
    referencesHint: "Clubs or events you have supported — one per line.",
    documents: "Brand assets & brochures",
    documentsHint: "Links to logo packs, brand guidelines, or sponsorship decks.",
  },
  supplier: {
    packages: "Products & price packages",
    packagesHint: "Product lines, bundles, or standard price packages for clubs.",
    roleNotes: "Delivery areas & timeline",
    roleNotesHint: "Regions you deliver to and typical lead times.",
    priceIndication: "Price indication",
    references: "Club references",
    referencesHint: "Teams or clubs you supply — one per line.",
    documents: "Catalogues & brochures",
    documentsHint: "Links to product catalogues or spec sheets.",
  },
  service_provider: {
    packages: "Service packages",
    packagesHint: "Fixed packages clubs can book (e.g. photo day, pitch maintenance).",
    roleNotes: "Availability & deliverables",
    roleNotesHint: "When you are available and what each engagement includes.",
    priceIndication: "Typical rates",
    references: "Portfolio references",
    referencesHint: "Past club projects — one per line.",
    documents: "Portfolio documents",
    documentsHint: "Links to sample work or service brochures.",
  },
  consultant: {
    packages: "Consulting packages",
    packagesHint: "Advisory packages (e.g. governance review, sponsorship strategy).",
    roleNotes: "Expertise & engagement model",
    roleNotesHint: "How you work with clubs — remote, on-site, or hybrid.",
    priceIndication: "Rates or day rate indication",
    references: "Case studies & project references",
    referencesHint: "Brief case studies or club names — one per line.",
    documents: "Case study documents",
    documentsHint: "Links to case studies or methodology PDFs.",
  },
};

export function providerListingSectionLabels(
  providerType: MarketplaceProviderType,
): ProviderListingSectionLabels {
  return LISTING_SECTIONS[providerType];
}

export function canSubmitListingForReview(status: string | undefined): boolean {
  return status === "draft" || status === "rejected";
}

export function canPauseListing(status: string | undefined): boolean {
  return status === "active";
}

export function canReactivateListing(status: string | undefined): boolean {
  return status === "paused";
}

export function isListingEditable(status: string | undefined): boolean {
  return status !== "submitted_for_review" && status !== "archived";
}
