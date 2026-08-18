import { supabaseDynamic } from "@/lib/supabase-dynamic";

export async function remindMissingActivityAttendance(input: {
  activityId: string;
  reminderType?: "manual_missing" | "deadline_48h" | "deadline_24h" | "deadline_custom";
}): Promise<{ ok: boolean; sent: number; skipped: number; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("remind_missing_activity_attendance", {
    _activity_id: input.activityId,
    _reminder_type: input.reminderType ?? "manual_missing",
  });

  if (error) {
    return { ok: false, sent: 0, skipped: 0, error: error.message || "rpc_failed" };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    sent?: number;
    skipped?: number;
  } | null;

  if (!payload?.ok) {
    return { ok: false, sent: 0, skipped: 0, error: payload?.error || "unknown_error" };
  }

  return {
    ok: true,
    sent: Number(payload.sent ?? 0),
    skipped: Number(payload.skipped ?? 0),
    error: null,
  };
}
