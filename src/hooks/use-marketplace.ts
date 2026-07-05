import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useAuth } from "@/contexts/useAuth";
import {
  computeProfileCompleteness,
  type MarketplaceOfferRow,
  type MarketplaceProviderProfileRow,
  type MarketplaceRequestRow,
  type MarketplaceSavedProviderRow,
  type MarketplaceProviderType,
  type CreateMarketplaceRequestInput,
  type UpdateMarketplaceRequestInput,
  type CreateMarketplaceOfferInput,
  type UpdateMarketplaceOfferInput,
} from "@/lib/marketplace-models";
import { normalizeProviderSlug } from "@/lib/marketplace-listing-draft";
import type { PartnerRow, PartnerTaskRow } from "@/lib/partner-workflow-models";
import { graduateAcceptedOfferToPartners } from "@/lib/marketplace-offer-partners";

export type {
  CreateMarketplaceRequestInput,
  UpdateMarketplaceRequestInput,
  CreateMarketplaceOfferInput,
  UpdateMarketplaceOfferInput,
} from "@/lib/marketplace-models";

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function mapOffer(row: Record<string, unknown>): MarketplaceOfferRow {
  return {
    id: String(row.id),
    request_id: String(row.request_id),
    provider_profile_id: String(row.provider_profile_id),
    provider_role: row.provider_role as MarketplaceOfferRow["provider_role"],
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    price_indication: row.price_indication ? String(row.price_indication) : null,
    currency: row.currency ? String(row.currency) : "EUR",
    delivery_timeline: row.delivery_timeline ? String(row.delivery_timeline) : null,
    included_services: Array.isArray(row.included_services) ? (row.included_services as string[]) : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    notes: row.notes ? String(row.notes) : null,
    status: row.status as MarketplaceOfferRow["status"],
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    accepted_by: row.accepted_by ? String(row.accepted_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapProfile(row: Record<string, unknown>): MarketplaceProviderProfileRow {
  return {
    id: String(row.id),
    owner_user_id: String(row.owner_user_id),
    provider_type: row.provider_type as MarketplaceProviderProfileRow["provider_type"],
    partner_id: row.partner_id ? String(row.partner_id) : null,
    provider_name: String(row.provider_name ?? ""),
    slug: row.slug ? String(row.slug) : null,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    short_description: row.short_description ? String(row.short_description) : null,
    detailed_description: row.detailed_description ? String(row.detailed_description) : null,
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
    location: row.location ? String(row.location) : null,
    service_area_km: typeof row.service_area_km === "number" ? row.service_area_km : null,
    availability_mode: row.availability_mode as MarketplaceProviderProfileRow["availability_mode"],
    contact_person: row.contact_person ? String(row.contact_person) : null,
    contact_email: row.contact_email ? String(row.contact_email) : null,
    phone: row.phone ? String(row.phone) : null,
    website: row.website ? String(row.website) : null,
    packages: Array.isArray(row.packages) ? (row.packages as MarketplaceProviderProfileRow["packages"]) : [],
    price_indication: row.price_indication ? String(row.price_indication) : null,
    availability_notes: row.availability_notes ? String(row.availability_notes) : null,
    references: Array.isArray(row.reference_notes) ? (row.reference_notes as string[]) : [],
    visibility: row.visibility as MarketplaceProviderProfileRow["visibility"],
    listing_status: row.listing_status as MarketplaceProviderProfileRow["listing_status"],
    verification_status: row.verification_status as MarketplaceProviderProfileRow["verification_status"],
    is_featured: Boolean(row.is_featured),
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
    profile_completeness: Number(row.profile_completeness ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function useMarketplaceProviderProfile(providerType: MarketplaceProviderType | null) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MarketplaceProviderProfileRow | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user || !providerType) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("provider_type", providerType)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) {
        setSchemaReady(false);
        setProfile(null);
      } else {
        console.warn("[useMarketplaceProviderProfile]", error.message);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    setSchemaReady(true);
    setProfile(data ? mapProfile(data as Record<string, unknown>) : null);
    setLoading(false);
  }, [user, providerType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = useCallback(
    async (draft: Partial<MarketplaceProviderProfileRow>) => {
      if (!user || !providerType) return { error: new Error("Not signed in") };

      const completeness = computeProfileCompleteness(draft);
      const payload: Record<string, unknown> = {
        owner_user_id: user.id,
        provider_type: providerType,
        provider_name: draft.provider_name?.trim() || "My profile",
        slug: draft.slug?.trim() ? normalizeProviderSlug(draft.slug) || null : null,
        logo_url: draft.logo_url ?? null,
        cover_image_url: draft.cover_image_url ?? null,
        short_description: draft.short_description ?? null,
        detailed_description: draft.detailed_description ?? null,
        categories: draft.categories ?? [],
        location: draft.location ?? null,
        service_area_km: draft.service_area_km ?? null,
        availability_mode: draft.availability_mode ?? null,
        contact_person: draft.contact_person ?? null,
        contact_email: draft.contact_email ?? user.email ?? null,
        phone: draft.phone ?? null,
        website: draft.website ?? null,
        packages: draft.packages ?? [],
        price_indication: draft.price_indication ?? null,
        availability_notes: draft.availability_notes ?? null,
        reference_notes: draft.references ?? [],
        visibility: draft.visibility ?? "private",
        listing_status: draft.listing_status ?? profile?.listing_status ?? "draft",
        profile_completeness: completeness,
      };

      if (profile?.id) {
        const { error } = await supabaseDynamic
          .from("marketplace_provider_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (!error) await reload();
        return { error: error as Error | null };
      }

      const { error } = await supabaseDynamic.from("marketplace_provider_profiles").insert(payload);
      if (!error) await reload();
      return { error: error as Error | null };
    },
    [user, providerType, profile?.id, profile?.listing_status, reload],
  );

  const submitForReview = useCallback(async () => {
    if (!profile?.id) return { error: new Error("No profile") };
    const { error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({ listing_status: "submitted_for_review" })
      .eq("id", profile.id)
      .eq("owner_user_id", user?.id ?? "");
    if (!error) await reload();
    return { error: error as Error | null };
  }, [profile?.id, user?.id, reload]);

  const updateListingStatus = useCallback(
    async (status: MarketplaceProviderProfileRow["listing_status"]) => {
      if (!profile?.id || !user) return { error: new Error("No profile") };
      const { error } = await supabaseDynamic
        .from("marketplace_provider_profiles")
        .update({ listing_status: status })
        .eq("id", profile.id)
        .eq("owner_user_id", user.id);
      if (!error) await reload();
      return { error: error as Error | null };
    },
    [profile?.id, user, reload],
  );

  const pauseListing = useCallback(async () => {
    return updateListingStatus("paused");
  }, [updateListingStatus]);

  const reactivateListing = useCallback(async () => {
    return updateListingStatus("active");
  }, [updateListingStatus]);

  return {
    profile,
    schemaReady,
    loading,
    reload,
    saveProfile,
    submitForReview,
    pauseListing,
    reactivateListing,
    updateListingStatus,
  };
}

export function useClubMarketplace(clubId: string | null) {
  const [providers, setProviders] = useState<MarketplaceProviderProfileRow[]>([]);
  const [requests, setRequests] = useState<MarketplaceRequestRow[]>([]);
  const [offers, setOffers] = useState<MarketplaceOfferRow[]>([]);
  const [offerProviders, setOfferProviders] = useState<MarketplaceProviderProfileRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [partnerTasks, setPartnerTasks] = useState<
    Pick<PartnerTaskRow, "partner_id" | "marketplace_offer_id" | "marketplace_request_id" | "task_status">[]
  >([]);
  const [saved, setSaved] = useState<MarketplaceSavedProviderRow[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId) {
      setProviders([]);
      setRequests([]);
      setOffers([]);
      setOfferProviders([]);
      setPartners([]);
      setPartnerTasks([]);
      setSaved([]);
      setPendingApprovals(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [providerRes, requestRes, savedRes] = await Promise.all([
      supabaseDynamic
        .from("marketplace_provider_profiles")
        .select("id")
        .limit(1),
      supabaseDynamic
        .from("marketplace_requests")
        .select("id")
        .eq("club_id", clubId)
        .limit(1),
      supabaseDynamic
        .from("marketplace_saved_providers")
        .select("id")
        .eq("club_id", clubId)
        .limit(1),
    ]);

    const schemaError = [providerRes, requestRes, savedRes].find(
      (res) => res.error && isMissingRelation(res.error),
    )?.error;

    if (schemaError) {
      setSchemaReady(false);
      setLoading(false);
      return;
    }

    const [providerListRes, requestListRes, savedListRes, pendingRes, partnersRes, tasksRes] = await Promise.all([
      supabaseDynamic
        .from("marketplace_provider_profiles")
        .select("*")
        .eq("listing_status", "active")
        .in("visibility", ["public", "marketplace_only"])
        .order("is_featured", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(100),
      supabaseDynamic
        .from("marketplace_requests")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseDynamic
        .from("marketplace_saved_providers")
        .select("*")
        .eq("club_id", clubId),
      supabaseDynamic
        .from("marketplace_provider_profiles")
        .select("id", { count: "exact", head: true })
        .eq("listing_status", "submitted_for_review"),
      supabaseDynamic
        .from("partners")
        .select("id, club_id, name, partner_type, marketplace_source, marketplace_offer_id, marketplace_request_id, notes, website, email, phone, created_at, show_on_public_club_page")
        .eq("club_id", clubId)
        .limit(300),
      supabaseDynamic
        .from("partner_tasks")
        .select("partner_id, marketplace_offer_id, marketplace_request_id, task_status")
        .eq("club_id", clubId)
        .limit(500),
    ]);

    setSchemaReady(true);
    setProviders(
      ((providerListRes.data as Record<string, unknown>[]) ?? []).map(mapProfile),
    );
    setRequests((requestListRes.data as MarketplaceRequestRow[]) ?? []);
    setSaved((savedListRes.data as MarketplaceSavedProviderRow[]) ?? []);
    setPendingApprovals(pendingRes.count ?? 0);
    setPartners((partnersRes.data as PartnerRow[]) ?? []);
    setPartnerTasks(
      ((tasksRes.data as Pick<PartnerTaskRow, "partner_id" | "marketplace_offer_id" | "marketplace_request_id" | "task_status">[]) ?? []),
    );

    const requestIds = ((requestListRes.data as MarketplaceRequestRow[]) ?? []).map((r) => r.id);
    if (requestIds.length) {
      const offerRes = await supabaseDynamic
        .from("marketplace_offers")
        .select("*")
        .in("request_id", requestIds);
      const offerRows = ((offerRes.data as Record<string, unknown>[]) ?? []).map(mapOffer);
      setOffers(offerRows);

      const providerIds = [...new Set(offerRows.map((o) => o.provider_profile_id))];
      if (providerIds.length) {
        const offerProviderRes = await supabaseDynamic
          .from("marketplace_provider_profiles")
          .select("*")
          .in("id", providerIds);
        setOfferProviders(
          ((offerProviderRes.data as Record<string, unknown>[]) ?? []).map(mapProfile),
        );
      } else {
        setOfferProviders([]);
      }
    } else {
      setOffers([]);
      setOfferProviders([]);
    }

    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { providers, requests, offers, offerProviders, partners, partnerTasks, saved, pendingApprovals, schemaReady, loading, reload };
}

export async function toggleMarketplaceSavedProvider(
  clubId: string,
  providerProfileId: string,
  isCurrentlySaved: boolean,
): Promise<{ error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: new Error("Not signed in") };

  if (isCurrentlySaved) {
    const { error } = await supabaseDynamic
      .from("marketplace_saved_providers")
      .delete()
      .eq("club_id", clubId)
      .eq("provider_profile_id", providerProfileId);
    return { error: error ? new Error(error.message) : null };
  }

  const { error } = await supabaseDynamic.from("marketplace_saved_providers").insert({
    club_id: clubId,
    provider_profile_id: providerProfileId,
    saved_by: user.id,
  });
  return { error: error ? new Error(error.message) : null };
}

function attachmentsPayload(urls: string[] | undefined) {
  return (urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ name: url.split("/").pop() ?? "Attachment", url }));
}

function buildRequestPayload(
  input: CreateMarketplaceRequestInput,
  userId: string,
  status: MarketplaceRequestRow["status"],
) {
  return {
    club_id: input.clubId,
    created_by: userId,
    title: input.title.trim(),
    category: input.category,
    provider_type_wanted: input.providerTypeWanted ?? null,
    description: input.description?.trim() || null,
    quantity: input.quantity?.trim() || null,
    visibility: input.visibility ?? "marketplace",
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    deadline: input.deadline || null,
    location: input.location?.trim() || null,
    attachments: attachmentsPayload(input.attachmentUrls),
    status,
  };
}

export async function createMarketplaceRequest(
  input: CreateMarketplaceRequestInput,
): Promise<{ error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: new Error("Not signed in") };

  const payload = buildRequestPayload(input, user.id, input.publish ? "open" : "draft");

  const { error } = await supabaseDynamic.from("marketplace_requests").insert(payload);
  if (error) return { error: error as Error };
  return { error: null };
}

export async function updateMarketplaceRequest(
  input: UpdateMarketplaceRequestInput,
): Promise<{ error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: new Error("Not signed in") };

  const status =
    input.status ??
    (input.publish ? "open" : undefined);

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    category: input.category,
    provider_type_wanted: input.providerTypeWanted ?? null,
    description: input.description?.trim() || null,
    quantity: input.quantity?.trim() || null,
    visibility: input.visibility ?? "marketplace",
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    deadline: input.deadline || null,
    location: input.location?.trim() || null,
    attachments: attachmentsPayload(input.attachmentUrls),
  };
  if (status) payload.status = status;

  const { error } = await supabaseDynamic
    .from("marketplace_requests")
    .update(payload)
    .eq("id", input.requestId);

  if (error) return { error: error as Error };
  return { error: null };
}

export async function setMarketplaceRequestStatus(
  requestId: string,
  status: MarketplaceRequestRow["status"],
): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("marketplace_requests")
    .update({ status })
    .eq("id", requestId);
  return { error: error ? (error as Error) : null };
}

export async function inviteProvidersToRequest(
  requestId: string,
  providerProfileIds: string[],
): Promise<{ error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: new Error("Not signed in") };
  if (!providerProfileIds.length) return { error: null };

  const rows = providerProfileIds.map((provider_profile_id) => ({
    request_id: requestId,
    provider_profile_id,
    invited_by: user.id,
  }));

  const { error } = await supabaseDynamic
    .from("marketplace_request_invites")
    .upsert(rows, { onConflict: "request_id,provider_profile_id" });

  const { error: visError } = await supabaseDynamic
    .from("marketplace_requests")
    .update({ visibility: "invited_providers_only" })
    .eq("id", requestId);

  if (error) return { error: error as Error };
  if (visError) return { error: visError as Error };
  return { error: null };
}

function buildOfferPayload(input: CreateMarketplaceOfferInput | UpdateMarketplaceOfferInput) {
  const payload: Record<string, unknown> = {};
  if ("title" in input && input.title !== undefined) payload.title = input.title.trim();
  if ("description" in input) payload.description = input.description?.trim() || null;
  if ("priceIndication" in input) payload.price_indication = input.priceIndication?.trim() || null;
  if ("currency" in input) payload.currency = input.currency?.trim() || "EUR";
  if ("deliveryTimeline" in input) payload.delivery_timeline = input.deliveryTimeline?.trim() || null;
  if ("includedServices" in input) payload.included_services = input.includedServices ?? [];
  if ("attachmentUrls" in input) payload.attachments = attachmentsPayload(input.attachmentUrls);
  if ("notes" in input) payload.notes = input.notes?.trim() || null;
  if ("status" in input && input.status) payload.status = input.status;
  return payload;
}

export async function createMarketplaceOffer(
  input: CreateMarketplaceOfferInput,
): Promise<{ error: Error | null }> {
  const status = input.asDraft ? "draft" : "sent";
  const { error } = await supabaseDynamic.from("marketplace_offers").insert({
    request_id: input.requestId,
    provider_profile_id: input.providerProfileId,
    provider_role: input.providerRole,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    price_indication: input.priceIndication?.trim() || null,
    currency: input.currency?.trim() || "EUR",
    delivery_timeline: input.deliveryTimeline?.trim() || null,
    included_services: input.includedServices ?? [],
    attachments: attachmentsPayload(input.attachmentUrls),
    notes: input.notes?.trim() || null,
    status,
  });
  if (error) return { error: error as Error };

  if (!input.asDraft) {
    await supabaseDynamic
      .from("marketplace_requests")
      .update({ status: "offers_received" })
      .eq("id", input.requestId)
      .in("status", ["open"]);
  }

  return { error: null };
}

export async function updateMarketplaceOffer(
  input: UpdateMarketplaceOfferInput,
): Promise<{ error: Error | null }> {
  const payload = buildOfferPayload(input);
  const { error } = await supabaseDynamic
    .from("marketplace_offers")
    .update(payload)
    .eq("id", input.offerId);
  return { error: error ? (error as Error) : null };
}

export async function sendMarketplaceOfferDraft(offerId: string, requestId: string): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "sent" })
    .eq("id", offerId)
    .eq("status", "draft");
  if (error) return { error: error as Error };

  await supabaseDynamic
    .from("marketplace_requests")
    .update({ status: "offers_received" })
    .eq("id", requestId)
    .in("status", ["open"]);

  return { error: null };
}

export async function withdrawMarketplaceOffer(offerId: string): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "withdrawn" })
    .eq("id", offerId)
    .in("status", ["draft", "sent", "viewed"]);
  return { error: error ? (error as Error) : null };
}

export async function markMarketplaceOfferViewed(offerId: string): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "viewed" })
    .eq("id", offerId)
    .eq("status", "sent");
  return { error: error ? (error as Error) : null };
}

export async function rejectMarketplaceOffer(offerId: string): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "rejected" })
    .eq("id", offerId)
    .in("status", ["sent", "viewed"]);
  return { error: error ? (error as Error) : null };
}

export async function acceptMarketplaceOffer(input: {
  offerId: string;
  clubId: string;
  offer: MarketplaceOfferRow;
  request: MarketplaceRequestRow;
  provider: MarketplaceProviderProfileRow;
}): Promise<{ error: Error | null; partnerId?: string; engagementId?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: new Error("Not signed in") };

  const { data: graduate, error: graduateError } = await graduateAcceptedOfferToPartners({
    clubId: input.clubId,
    offer: input.offer,
    request: input.request,
    provider: input.provider,
    userId: user.id,
  });
  if (graduateError) return { error: graduateError };

  const now = new Date().toISOString();
  const { error: acceptError } = await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "accepted", accepted_at: now, accepted_by: user.id })
    .eq("id", input.offerId);

  if (acceptError) return { error: acceptError as Error };

  await supabaseDynamic
    .from("marketplace_offers")
    .update({ status: "rejected" })
    .eq("request_id", input.offer.request_id)
    .neq("id", input.offerId)
    .in("status", ["sent", "viewed"]);

  await supabaseDynamic
    .from("marketplace_requests")
    .update({ status: "accepted" })
    .eq("id", input.offer.request_id);

  return { error: null, partnerId: graduate?.partnerId, engagementId: graduate?.engagementId };
}

export function useProviderMarketplaceInteractions(
  providerProfileId: string | null,
  providerType: MarketplaceProviderType | null,
) {
  const [openRequests, setOpenRequests] = useState<MarketplaceRequestRow[]>([]);
  const [offerRequests, setOfferRequests] = useState<MarketplaceRequestRow[]>([]);
  const [myOffers, setMyOffers] = useState<MarketplaceOfferRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!providerProfileId || !providerType) {
      setOpenRequests([]);
      setOfferRequests([]);
      setMyOffers([]);
      return;
    }
    setLoading(true);
    const [reqRes, offerRes] = await Promise.all([
      supabaseDynamic
        .from("marketplace_requests")
        .select("*")
        .in("status", ["open", "offers_received"])
        .in("visibility", ["marketplace", "invited_providers_only"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseDynamic
        .from("marketplace_offers")
        .select("*")
        .eq("provider_profile_id", providerProfileId)
        .order("created_at", { ascending: false }),
    ]);
    setOpenRequests((reqRes.data as MarketplaceRequestRow[]) ?? []);
    const offerRows = ((offerRes.data as Record<string, unknown>[]) ?? []).map(mapOffer);
    setMyOffers(offerRows);

    const requestIds = [...new Set(offerRows.map((o) => o.request_id))];
    if (requestIds.length) {
      const linkedReqRes = await supabaseDynamic
        .from("marketplace_requests")
        .select("*")
        .in("id", requestIds);
      setOfferRequests((linkedReqRes.data as MarketplaceRequestRow[]) ?? []);
    } else {
      setOfferRequests([]);
    }
    setLoading(false);
  }, [providerProfileId, providerType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { openRequests, offerRequests, myOffers, loading, reload };
}
