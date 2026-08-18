import { supabaseDynamic } from "@/lib/supabase-dynamic";

export interface MemberNotificationPrefs {
  email: boolean;
  push: boolean;
  matchReminders: boolean;
  trainingReminders: boolean;
  paymentReminders: boolean;
  weeklyDigestEmail: boolean;
}

export const DEFAULT_MEMBER_NOTIFICATION_PREFS: MemberNotificationPrefs = {
  email: true,
  push: true,
  matchReminders: true,
  trainingReminders: true,
  paymentReminders: true,
  weeklyDigestEmail: false,
};

function rowToPrefs(row: Record<string, unknown> | null): MemberNotificationPrefs | null {
  if (!row) return null;
  return {
    email: Boolean(row.email),
    push: Boolean(row.push),
    matchReminders: Boolean(row.match_reminders),
    trainingReminders: Boolean(row.training_reminders),
    paymentReminders: Boolean(row.payment_reminders),
    weeklyDigestEmail: Boolean(row.weekly_digest_email),
  };
}

export async function loadMemberNotificationPrefs(clubId: string | null): Promise<{
  data: MemberNotificationPrefs | null;
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("member_notification_preferences")
    .select(
      "email, push, match_reminders, training_reminders, payment_reminders, weekly_digest_email",
    )
    .is("club_id", clubId)
    .maybeSingle();

  const error = (result as { error?: { message?: string } | null }).error;
  if (error) return { data: null, error: new Error(error.message || "load_failed") };
  const data = (result as { data?: Record<string, unknown> | null }).data;
  return { data: rowToPrefs(data ?? null), error: null };
}

export async function saveMemberNotificationPrefs(
  clubId: string | null,
  prefs: MemberNotificationPrefs,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("upsert_member_notification_preferences", {
    _club_id: clubId,
    _email: prefs.email,
    _push: prefs.push,
    _match_reminders: prefs.matchReminders,
    _training_reminders: prefs.trainingReminders,
    _payment_reminders: prefs.paymentReminders,
    _weekly_digest_email: prefs.weeklyDigestEmail,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}
