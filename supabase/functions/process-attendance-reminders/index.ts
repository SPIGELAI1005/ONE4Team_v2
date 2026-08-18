/**
 * Cron: process due attendance reminders (in-app + email).
 * Auth: service role Bearer or x-cron-secret (ATTENDANCE_REMINDER_CRON_SECRET or WEEKLY_DIGEST_CRON_SECRET).
 *
 * Deploy: npx supabase functions deploy process-attendance-reminders --no-verify-jwt
 * Schedule: hourly cron hitting this function.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import {
  buildAttendanceReminderEmailContent,
  sendAttendanceReminderEmailViaResend,
} from "../_shared/attendance_reminder_email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "ONE4Team <onboarding@resend.dev>";
const CRON_SECRET =
  Deno.env.get("ATTENDANCE_REMINDER_CRON_SECRET") ??
  Deno.env.get("WEEKLY_DIGEST_CRON_SECRET") ??
  "";

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (bearer && bearer === SUPABASE_SERVICE_ROLE_KEY) return true;
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cronHeader === CRON_SECRET) return true;
  return false;
}

serve(async (req) => {
  const cors = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, cors);
  }
  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401, cors);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "misconfigured" }, 503, cors);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: dueRows, error: dueError } = await admin.rpc(
    "list_activities_due_for_attendance_reminders",
    { _now: new Date().toISOString() },
  );

  if (dueError) {
    return jsonResponse({ error: dueError.message }, 500, cors);
  }

  const due = (dueRows ?? []) as Array<{ activity_id: string; club_id: string; reminder_type: string }>;
  let processed = 0;
  let emailed = 0;
  const errors: string[] = [];

  for (const row of due) {
    const { data, error } = await admin.rpc("remind_missing_activity_attendance_service", {
      _activity_id: row.activity_id,
      _reminder_type: row.reminder_type,
    });
    if (error) {
      errors.push(`${row.activity_id}: ${error.message}`);
      continue;
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    if (!payload.ok) {
      errors.push(`${row.activity_id}: ${String(payload.error ?? "failed")}`);
      continue;
    }
    processed += 1;

    if (!RESEND_API_KEY) continue;

    const { data: clubRow } = await admin.from("clubs").select("name").eq("id", row.club_id).maybeSingle();
    const clubName = String((clubRow as { name?: string } | null)?.name ?? "ONE4Team");
    const title = String(payload.activity_title ?? "Activity");
    const startsAt = payload.starts_at != null ? String(payload.starts_at) : "";
    const startsLabel = startsAt
      ? new Date(startsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
      : "";
    const recipients = Array.isArray(payload.recipients) ? payload.recipients as Record<string, unknown>[] : [];

    for (const rec of recipients) {
      const email = typeof rec.email === "string" ? rec.email.trim() : "";
      if (!email || !email.includes("@")) continue;
      const content = buildAttendanceReminderEmailContent({
        toEmail: email,
        recipientName: rec.display_name != null ? String(rec.display_name) : null,
        clubName,
        activityTitle: title,
        startsAtLabel: startsLabel,
        language: "en",
      });
      const sent = await sendAttendanceReminderEmailViaResend({
        apiKey: RESEND_API_KEY,
        fromEmail: RESEND_FROM_EMAIL,
        toEmail: email,
        content,
      });
      if (sent.ok) emailed += 1;
      else errors.push(`email ${email}: ${sent.error ?? "fail"}`);
    }
  }

  return jsonResponse(
    {
      ok: true,
      due: due.length,
      processed,
      emailed,
      errors: errors.slice(0, 20),
    },
    200,
    cors,
  );
});
