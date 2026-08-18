import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { ActivityTransportOffer, ActivityTransportRequest } from "@/lib/activity-transport";

export async function listTransportOffers(input: {
  clubId: string;
  activityId: string;
}): Promise<{ data: ActivityTransportOffer[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("activity_transport_offers")
    .select(
      "id, club_id, activity_id, driver_membership_id, seats_total, seats_taken, meeting_point, notes, status",
    )
    .eq("club_id", input.clubId)
    .eq("activity_id", input.activityId)
    .order("created_at", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ActivityTransportOffer[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function listTransportRequests(input: {
  clubId: string;
  activityId: string;
}): Promise<{ data: ActivityTransportRequest[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("activity_transport_requests")
    .select("id, club_id, activity_id, offer_id, rider_membership_id, status, note")
    .eq("club_id", input.clubId)
    .eq("activity_id", input.activityId);

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ActivityTransportRequest[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function createTransportOffer(input: {
  clubId: string;
  activityId: string;
  driverMembershipId: string;
  seatsTotal: number;
  meetingPoint?: string | null;
  notes?: string | null;
}): Promise<{ data: ActivityTransportOffer | null; error: Error | null }> {
  const result = await supabaseDynamic
    .from("activity_transport_offers")
    .insert({
      club_id: input.clubId,
      activity_id: input.activityId,
      driver_membership_id: input.driverMembershipId,
      seats_total: input.seatsTotal,
      meeting_point: input.meetingPoint?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select(
      "id, club_id, activity_id, driver_membership_id, seats_total, seats_taken, meeting_point, notes, status",
    )
    .single();

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ActivityTransportOffer | null }).data;
  if (error) return { data: null, error: new Error(error.message || "insert_failed") };
  return { data: data ?? null, error: null };
}

export async function requestTransportSeat(input: {
  offerId: string;
  note?: string | null;
}): Promise<{ ok: boolean; error: string | null; status?: string }> {
  const { data, error } = await supabaseDynamic.rpc("request_activity_transport_seat", {
    _offer_id: input.offerId,
    _note: input.note ?? null,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; status?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null, status: payload.status };
}

export async function acceptTransportRequest(requestId: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("accept_activity_transport_request", {
    _request_id: requestId,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export async function declineTransportRequest(requestId: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("decline_activity_transport_request", {
    _request_id: requestId,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}
