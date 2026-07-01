import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type {
  MarketplaceOfferRow,
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import {
  engagementCategoryForProviderType,
  engagementDescription,
  engagementTitle,
  partnersBridgeProvenanceFromOffer,
} from "@/lib/marketplace-partners-bridge";

export interface GraduateOfferResult {
  partnerId: string;
  engagementId: string;
  createdPartner: boolean;
}

async function stampPartnerMarketplaceLink(
  partnerId: string,
  offer: MarketplaceOfferRow,
  request: MarketplaceRequestRow,
) {
  const provenance = partnersBridgeProvenanceFromOffer(offer, request);
  await supabaseDynamic
    .from("partners")
    .update(provenance)
    .eq("id", partnerId);
}

/**
 * Creates or reuses a Partners directory entry and an active engagement from an accepted offer.
 * Idempotent per offer - safe to call once per acceptance.
 */
export async function graduateAcceptedOfferToPartners(input: {
  clubId: string;
  offer: MarketplaceOfferRow;
  request: MarketplaceRequestRow;
  provider: MarketplaceProviderProfileRow;
  userId: string;
}): Promise<{ data: GraduateOfferResult | null; error: Error | null }> {
  const { clubId, offer, request, provider, userId } = input;

  const { data: existingTask } = await supabaseDynamic
    .from("partner_tasks")
    .select("id, partner_id")
    .eq("marketplace_offer_id", offer.id)
    .maybeSingle();

  if (existingTask?.id && existingTask?.partner_id) {
    await stampPartnerMarketplaceLink(String(existingTask.partner_id), offer, request);
    return {
      data: {
        partnerId: String(existingTask.partner_id),
        engagementId: String(existingTask.id),
        createdPartner: false,
      },
      error: null,
    };
  }

  let partnerId = provider.partner_id;
  let createdPartner = false;

  if (partnerId) {
    const { data: existing } = await supabaseDynamic
      .from("partners")
      .select("id")
      .eq("id", partnerId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (!existing) partnerId = null;
  }

  if (!partnerId) {
    const { data: byName } = await supabaseDynamic
      .from("partners")
      .select("id")
      .eq("club_id", clubId)
      .eq("name", provider.provider_name)
      .maybeSingle();

    partnerId = byName?.id ? String(byName.id) : null;
  }

  if (!partnerId) {
    const { data: created, error: partnerError } = await supabaseDynamic
      .from("partners")
      .insert({
        club_id: clubId,
        name: provider.provider_name,
        partner_type: offer.provider_role,
        email: provider.contact_email,
        phone: provider.phone,
        website: provider.website,
        notes: `Active partner from marketplace offer "${offer.title}".`,
        ...partnersBridgeProvenanceFromOffer(offer, request),
        created_by: userId,
      })
      .select("id")
      .single();

    if (partnerError) return { data: null, error: partnerError as Error };
    partnerId = String(created.id);
    createdPartner = true;

    await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({ partner_id: partnerId })
      .eq("id", provider.id);
  } else {
    await stampPartnerMarketplaceLink(partnerId, offer, request);
    if (!provider.partner_id) {
      await supabaseDynamic
        .from("marketplace_provider_profiles")
        .update({ partner_id: partnerId })
        .eq("id", provider.id);
    }
  }

  const { data: engagement, error: taskError } = await supabaseDynamic
    .from("partner_tasks")
    .insert({
      club_id: clubId,
      partner_id: partnerId,
      title: engagementTitle(offer.provider_role, request.title),
      description: engagementDescription(offer, request),
      priority: "normal",
      task_status: "open",
      engagement_category: engagementCategoryForProviderType(offer.provider_role),
      location: request.location,
      marketplace_offer_id: offer.id,
      marketplace_request_id: request.id,
      created_by: userId,
    })
    .select("id")
    .single();

  if (taskError) return { data: null, error: taskError as Error };

  return {
    data: {
      partnerId,
      engagementId: String(engagement.id),
      createdPartner,
    },
    error: null,
  };
}
