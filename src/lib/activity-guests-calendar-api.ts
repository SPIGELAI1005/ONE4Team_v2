import { supabaseDynamic } from "@/lib/supabase-dynamic";

export type ActivityGuestParticipant = {
  id: string;
  club_id: string;
  activity_id: string;
  display_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  note: string | null;
  status: "invited" | "confirmed" | "declined" | "attended" | "cancelled";
  converted_membership_id: string | null;
  converted_draft_id?: string | null;
};

export async function listActivityGuests(input: {
  clubId: string;
  activityId: string;
}): Promise<{ data: ActivityGuestParticipant[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("activity_guest_participants")
    .select(
      "id, club_id, activity_id, display_name, contact_email, contact_phone, note, status, converted_membership_id, converted_draft_id",
    )
    .eq("club_id", input.clubId)
    .eq("activity_id", input.activityId)
    .order("created_at", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ActivityGuestParticipant[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function addActivityGuest(input: {
  clubId: string;
  activityId: string;
  displayName: string;
  contactEmail?: string | null;
  note?: string | null;
}): Promise<{ data: ActivityGuestParticipant | null; error: Error | null }> {
  const result = await supabaseDynamic
    .from("activity_guest_participants")
    .insert({
      club_id: input.clubId,
      activity_id: input.activityId,
      display_name: input.displayName.trim(),
      contact_email: input.contactEmail?.trim() || null,
      note: input.note?.trim() || null,
      status: "invited",
    })
    .select(
      "id, club_id, activity_id, display_name, contact_email, contact_phone, note, status, converted_membership_id, converted_draft_id",
    )
    .single();

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ActivityGuestParticipant | null }).data;
  if (error) return { data: null, error: new Error(error.message || "insert_failed") };
  return { data: data ?? null, error: null };
}

/** Security-definer: draft + club_invites + draft link (trainers need not insert invites via RLS). */
export async function convertActivityGuestToDraftInvite(input: {
  guestId: string;
  draftRole?: string;
}): Promise<{
  ok: boolean;
  error: string | null;
  draftId?: string | null;
  inviteId?: string | null;
  inviteToken?: string | null;
  email?: string | null;
  name?: string | null;
}> {
  const { data, error } = await supabaseDynamic.rpc("convert_activity_guest_to_draft_invite", {
    _guest_id: input.guestId,
    _draft_role: input.draftRole ?? "player",
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as {
    ok?: boolean;
    error?: string;
    draft_id?: string;
    invite_id?: string;
    invite_token?: string;
    email?: string;
    name?: string;
  } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return {
    ok: true,
    error: null,
    draftId: payload.draft_id ?? null,
    inviteId: payload.invite_id ?? null,
    inviteToken: payload.invite_token ?? null,
    email: payload.email ?? null,
    name: payload.name ?? null,
  };
}

export async function convertActivityGuest(input: {
  guestId: string;
  mode: "link" | "draft";
  membershipId?: string | null;
  draftRole?: string;
}): Promise<{
  ok: boolean;
  error: string | null;
  membershipId?: string | null;
  draftId?: string | null;
  email?: string | null;
  name?: string | null;
}> {
  const { data, error } = await supabaseDynamic.rpc("convert_activity_guest", {
    _guest_id: input.guestId,
    _mode: input.mode,
    _membership_id: input.membershipId ?? null,
    _draft_role: input.draftRole ?? "player",
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as {
    ok?: boolean;
    error?: string;
    membership_id?: string;
    draft_id?: string;
    email?: string;
    name?: string;
  } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return {
    ok: true,
    error: null,
    membershipId: payload.membership_id ?? null,
    draftId: payload.draft_id ?? null,
    email: payload.email ?? null,
    name: payload.name ?? null,
  };
}

export async function createCalendarSubscription(input: {
  clubId: string;
  scope?: "club" | "team" | "self";
  teamId?: string | null;
  label?: string | null;
}): Promise<{ subscriptionId: string | null; token: string | null; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("create_calendar_subscription", {
    _club_id: input.clubId,
    _scope: input.scope ?? "club",
    _team_id: input.teamId ?? null,
    _label: input.label ?? null,
  });
  if (error) return { subscriptionId: null, token: null, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; subscription_id?: string; token?: string } | null;
  if (!payload?.ok) {
    return { subscriptionId: null, token: null, error: payload?.error || "unknown_error" };
  }
  return {
    subscriptionId: payload.subscription_id ?? null,
    token: payload.token ?? null,
    error: null,
  };
}

export async function revokeCalendarSubscription(subscriptionId: string): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const { data, error } = await supabaseDynamic.rpc("revoke_calendar_subscription", {
    _subscription_id: subscriptionId,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export type CalendarSubscriptionRow = {
  id: string;
  club_id: string;
  scope: "club" | "team" | "self";
  team_id: string | null;
  label: string | null;
  revoked_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
};

export async function listCalendarSubscriptions(clubId: string): Promise<{
  data: CalendarSubscriptionRow[];
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("calendar_subscriptions")
    .select("id, club_id, scope, team_id, label, revoked_at, last_accessed_at, created_at")
    .eq("club_id", clubId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: CalendarSubscriptionRow[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}
