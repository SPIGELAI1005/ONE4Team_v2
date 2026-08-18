import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { MemberAvailabilityReason, MemberAvailabilityRow, MemberAvailabilityStatus } from "@/lib/member-availability";

function asAvailabilityRow(value: unknown): MemberAvailabilityRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.membership_id !== "string" ||
    typeof row.starts_at !== "string" ||
    typeof row.ends_at !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    club_id: String(row.club_id ?? ""),
    membership_id: row.membership_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status as MemberAvailabilityStatus,
    reason: (row.reason as MemberAvailabilityReason | null) ?? null,
    note: typeof row.note === "string" ? row.note : row.note == null ? null : String(row.note),
  };
}

export async function listMemberAvailability(input: {
  clubId: string;
  membershipId: string;
}): Promise<{ data: MemberAvailabilityRow[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("member_availability")
    .select("id, club_id, membership_id, starts_at, ends_at, status, reason, note")
    .eq("club_id", input.clubId)
    .eq("membership_id", input.membershipId)
    .order("starts_at", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: unknown }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: (data as MemberAvailabilityRow[]) ?? [], error: null };
}

export async function listMemberAvailabilityForMembers(input: {
  clubId: string;
  membershipIds: string[];
  fromIso: string;
  toIso: string;
}): Promise<{ data: MemberAvailabilityRow[]; error: Error | null }> {
  if (!input.membershipIds.length) return { data: [], error: null };
  const result = await supabaseDynamic
    .from("member_availability")
    .select("id, club_id, membership_id, starts_at, ends_at, status, reason, note")
    .eq("club_id", input.clubId)
    .in("membership_id", input.membershipIds)
    .lt("starts_at", input.toIso)
    .gt("ends_at", input.fromIso);

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: unknown }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: (data as MemberAvailabilityRow[]) ?? [], error: null };
}

export async function upsertMemberAvailability(input: {
  membershipId: string;
  startsAt: string;
  endsAt: string;
  status: MemberAvailabilityStatus;
  reason?: MemberAvailabilityReason | null;
  note?: string | null;
  id?: string | null;
}): Promise<{ data: MemberAvailabilityRow | null; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("upsert_member_availability", {
    _membership_id: input.membershipId,
    _starts_at: input.startsAt,
    _ends_at: input.endsAt,
    _status: input.status,
    _reason: input.reason ?? null,
    _note: input.note ?? null,
    _id: input.id ?? null,
  });

  if (error) return { data: null, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; availability?: unknown } | null;
  if (!payload?.ok) return { data: null, error: payload?.error || "unknown_error" };
  return { data: asAvailabilityRow(payload.availability), error: null };
}

export async function deleteMemberAvailability(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("delete_member_availability", { _id: id });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}
