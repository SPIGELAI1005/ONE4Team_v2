import type { MarketplaceOfferRow } from "@/lib/marketplace-models";
import type { PartnerTaskRow } from "@/lib/partner-workflow-models";

/** Club-side relationship between a marketplace provider profile and the active club. */
export type ClubProviderRelationshipStatus =
  | "none"
  | "saved"
  | "offer_sent"
  | "active_partner"
  | "completed";

export interface ClubProviderRelationshipContext {
  savedProviderIds: ReadonlySet<string>;
  offers: readonly MarketplaceOfferRow[];
  providerPartnerIds: ReadonlyMap<string, string | null>;
  partnerTasks: readonly Pick<
    PartnerTaskRow,
    "partner_id" | "marketplace_offer_id" | "marketplace_request_id" | "task_status"
  >[];
}

const PENDING_OFFER_STATUSES = new Set<MarketplaceOfferRow["status"]>(["draft", "sent", "viewed"]);
const TERMINAL_TASK_STATUSES = new Set<PartnerTaskRow["task_status"]>(["done", "cancelled"]);

function marketplaceTasksForPartner(
  partnerId: string | null | undefined,
  tasks: ClubProviderRelationshipContext["partnerTasks"],
) {
  if (!partnerId) return [];
  return tasks.filter(
    (task) => task.partner_id === partnerId && (task.marketplace_offer_id != null || task.marketplace_request_id != null),
  );
}

export function relationshipStatusForProvider(
  providerProfileId: string,
  ctx: ClubProviderRelationshipContext,
): ClubProviderRelationshipStatus {
  const partnerId = ctx.providerPartnerIds.get(providerProfileId) ?? null;
  const providerOffers = ctx.offers.filter((o) => o.provider_profile_id === providerProfileId);
  const linkedTasks = marketplaceTasksForPartner(partnerId, ctx.partnerTasks);

  const hasAcceptedOffer = providerOffers.some((o) => o.status === "accepted");
  const hasPendingOffer = providerOffers.some((o) => PENDING_OFFER_STATUSES.has(o.status));
  const hasOpenEngagement = linkedTasks.some((t) => !TERMINAL_TASK_STATUSES.has(t.task_status));
  const hasCompletedEngagement =
    linkedTasks.length > 0 && linkedTasks.every((t) => TERMINAL_TASK_STATUSES.has(t.task_status));

  if (hasAcceptedOffer && hasCompletedEngagement && !hasOpenEngagement) {
    return "completed";
  }
  if (hasAcceptedOffer || (partnerId && hasOpenEngagement)) {
    return "active_partner";
  }
  if (hasPendingOffer) {
    return "offer_sent";
  }
  if (ctx.savedProviderIds.has(providerProfileId)) {
    return "saved";
  }
  return "none";
}

export function buildClubProviderRelationshipMap(
  providerProfileIds: readonly string[],
  ctx: ClubProviderRelationshipContext,
): Map<string, ClubProviderRelationshipStatus> {
  const map = new Map<string, ClubProviderRelationshipStatus>();
  for (const id of providerProfileIds) {
    map.set(id, relationshipStatusForProvider(id, ctx));
  }
  return map;
}

export function marketplacePartnerPath(partnerId: string): string {
  return `/partners?tab=engagements&partner=${partnerId}`;
}

export function marketplaceOfferPath(offerId: string): string {
  return `/marketplace?view=offers&offer=${offerId}`;
}

export function marketplaceRequestPath(requestId: string): string {
  return `/marketplace?view=requests&request=${requestId}`;
}
