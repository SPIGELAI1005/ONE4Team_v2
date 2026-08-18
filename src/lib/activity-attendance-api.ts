import { supabase } from "@/integrations/supabase/client";
import type {
  TrainingAttendanceResponseReason,
  TrainingAttendanceRow,
  TrainingAttendanceStatus,
} from "@/lib/training-attendance";

export type UpsertAttendanceResponseResult =
  | { ok: true; attendance: TrainingAttendanceRow }
  | { ok: false; error: string };

function asAttendanceRow(value: unknown): TrainingAttendanceRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.activity_id !== "string" || typeof row.membership_id !== "string") {
    return null;
  }
  return {
    id: row.id,
    activity_id: row.activity_id,
    membership_id: row.membership_id,
    status: row.status as TrainingAttendanceStatus,
    notes: typeof row.notes === "string" ? row.notes : row.notes == null ? null : String(row.notes),
    response_reason:
      typeof row.response_reason === "string"
        ? (row.response_reason as TrainingAttendanceResponseReason)
        : null,
    responded_by: typeof row.responded_by === "string" ? row.responded_by : null,
    responded_at: typeof row.responded_at === "string" ? row.responded_at : null,
  };
}

/** Privileged RSVP upsert (self / guardian / household / manager). */
export async function upsertActivityAttendanceResponse(input: {
  activityId: string;
  membershipId: string;
  status: TrainingAttendanceStatus;
  notes?: string | null;
  responseReason?: TrainingAttendanceResponseReason | null;
}): Promise<UpsertAttendanceResponseResult> {
  const { data, error } = await supabase.rpc("upsert_activity_attendance_response", {
    _activity_id: input.activityId,
    _membership_id: input.membershipId,
    _status: input.status,
    _notes: input.notes ?? null,
    _response_reason: input.responseReason ?? null,
  });

  if (error) {
    return { ok: false, error: error.message || "rpc_failed" };
  }

  const payload = data as { ok?: boolean; error?: string; attendance?: unknown } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error || "unknown_error" };
  }

  const attendance = asAttendanceRow(payload.attendance);
  if (!attendance) {
    return { ok: false, error: "invalid_response" };
  }

  return { ok: true, attendance };
}

export function mapAttendanceRpcError(
  code: string,
  labels: {
    closed: string;
    forbidden: string;
    notInvited: string;
    reasonRequired: string;
    failed: string;
  },
): string {
  switch (code) {
    case "rsvp_closed":
      return labels.closed;
    case "forbidden":
    case "status_not_allowed":
    case "not_authenticated":
      return labels.forbidden;
    case "membership_not_found":
    case "activity_not_found":
      return labels.notInvited;
    case "decline_reason_required":
    case "invalid_response_reason":
      return labels.reasonRequired;
    default:
      return labels.failed;
  }
}
