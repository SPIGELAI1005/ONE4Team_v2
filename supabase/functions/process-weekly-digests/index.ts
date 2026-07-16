import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";
import {
  buildWeeklyDigestEmailContent,
  sendWeeklyDigestEmailViaResend,
  type DigestDueItem,
  type DigestScheduleItem,
  type MemberWeeklyDigestData,
} from "../_shared/weekly_digest_email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "ONE4Team <onboarding@resend.dev>";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "";
const CRON_SECRET = Deno.env.get("WEEKLY_DIGEST_CRON_SECRET") ?? "";

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

async function loadScheduleItems(
  admin: ReturnType<typeof createClient>,
  clubId: string,
): Promise<DigestScheduleItem[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const { data, error } = await admin
    .from("activities")
    .select("title, starts_at, type")
    .eq("club_id", clubId)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("activities load:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    title: String(row.title ?? "Activity"),
    startsAt: String(row.starts_at),
    type: String(row.type ?? "event"),
  }));
}

async function loadOpenDuesForMemberships(
  admin: ReturnType<typeof createClient>,
  clubId: string,
  membershipIds: string[],
  wardLabels: Map<string, string>,
): Promise<DigestDueItem[]> {
  if (membershipIds.length === 0) return [];

  const { data, error } = await admin
    .from("membership_dues")
    .select("id, due_date, amount_cents, currency, status, membership_id")
    .eq("club_id", clubId)
    .eq("status", "due")
    .in("membership_id", membershipIds)
    .order("due_date", { ascending: true })
    .limit(20);

  if (error) {
    console.error("membership_dues load:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    dueDate: String(row.due_date),
    amountCents: row.amount_cents as number | null,
    currency: String(row.currency ?? "EUR"),
    status: String(row.status),
    label: wardLabels.get(String(row.membership_id)),
  }));
}

async function processWeeklyDigestRun(
  admin: ReturnType<typeof createClient>,
  run: { id: string; club_id: string },
  siteOrigin: string,
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const clubId = run.club_id;
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const { data: clubRow } = await admin
    .from("clubs")
    .select("name, slug, default_language, primary_color, logo_url")
    .eq("id", clubId)
    .maybeSingle();

  if (!clubRow) {
    throw new Error("Club not found");
  }

  const { data: ruleRow } = await admin
    .from("automation_rules")
    .select("is_enabled")
    .eq("club_id", clubId)
    .eq("rule_type", "weekly_digest")
    .maybeSingle();

  if (ruleRow && ruleRow.is_enabled === false) {
    return { sent: 0, skipped: 0, errors: ["weekly_digest rule disabled"] };
  }

  const scheduleItems = await loadScheduleItems(admin, clubId);
  const clubLanguage = clubRow.default_language === "de" ? "de" : "en";
  const clubSlug = typeof clubRow.slug === "string" ? clubRow.slug : "";
  const dashboardUrl = `${siteOrigin.replace(/\/+$/, "")}/dashboard`;
  const clubPageUrl = clubSlug
    ? `${siteOrigin.replace(/\/+$/, "")}/club/${encodeURIComponent(clubSlug)}`
    : dashboardUrl;

  const { data: recipients, error: recipientError } = await admin
    .from("club_memberships")
    .select("id, user_id, role, weekly_digest_opt_in, profiles!club_memberships_profile_fk(display_name)")
    .eq("club_id", clubId)
    .eq("status", "active")
    .eq("weekly_digest_opt_in", true)
    .in("role", ["member", "player", "parent_supporter"]);

  if (recipientError) {
    throw new Error(recipientError.message);
  }

  for (const membership of recipients ?? []) {
    const userId = String(membership.user_id);
    const membershipId = String(membership.id);
    const role = String(membership.role ?? "member");

    const { data: userRow } = await admin.auth.admin.getUserById(userId);
    const email = userRow?.user?.email?.trim().toLowerCase() ?? "";
    if (!email) {
      skipped += 1;
      continue;
    }

    const membershipIds = [membershipId];
    const wardLabels = new Map<string, string>();

    if (role === "parent_supporter") {
      const { data: guardianLinks } = await admin
        .from("club_member_guardian_links")
        .select("ward_membership_id")
        .eq("club_id", clubId)
        .eq("guardian_membership_id", membershipId);

      for (const link of guardianLinks ?? []) {
        const wardId = String(link.ward_membership_id);
        if (!membershipIds.includes(wardId)) {
          membershipIds.push(wardId);
          wardLabels.set(wardId, "Ward");
        }
      }
    }

    const openDues = await loadOpenDuesForMemberships(admin, clubId, membershipIds, wardLabels);
    const profile = membership.profiles as { display_name?: string | null } | null;
    const digest: MemberWeeklyDigestData = {
      clubName: String(clubRow.name ?? "ONE4Team"),
      recipientName: profile?.display_name ?? null,
      scheduleItems,
      openDues,
      language: clubLanguage,
    };

    const content = buildWeeklyDigestEmailContent({
      clubName: digest.clubName,
      clubSlug,
      clubPageUrl,
      dashboardUrl,
      recipientEmail: email,
      recipientName: digest.recipientName,
      clubPrimaryColor: typeof clubRow.primary_color === "string" ? clubRow.primary_color : null,
      clubLogoUrl: typeof clubRow.logo_url === "string" ? clubRow.logo_url : null,
      language: clubLanguage,
      digest,
    });

    if (!RESEND_API_KEY) {
      errors.push("RESEND_API_KEY not configured");
      break;
    }

    const sendResult = await sendWeeklyDigestEmailViaResend({
      apiKey: RESEND_API_KEY,
      fromEmail: RESEND_FROM_EMAIL,
      recipientEmail: email,
      content,
    });

    if (!sendResult.ok) {
      errors.push(`${email}: ${sendResult.error}`);
      continue;
    }
    sent += 1;
  }

  return { sent, skipped, errors };
}

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "process-weekly-digests request", {
    correlationId,
    facet: "process_weekly_digests",
    method: req.method,
  });

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);
    }

    if (!isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, Number(body.limit ?? 10)));
    const siteOrigin =
      typeof body.siteOrigin === "string" && body.siteOrigin.trim()
        ? body.siteOrigin.trim().replace(/\/+$/, "")
        : PUBLIC_SITE_URL.replace(/\/+$/, "");

    if (!siteOrigin) {
      return jsonResponse({ error: "PUBLIC_SITE_URL or siteOrigin required." }, 400, corsHeaders);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: runs, error: claimError } = await admin.rpc("claim_automation_runs", {
      _run_type: "weekly_digest",
      _limit: limit,
    });

    if (claimError) {
      console.error("claim_automation_runs:", claimError.message);
      return jsonResponse({ error: claimError.message }, 500, corsHeaders);
    }

    const claimed = (runs ?? []) as Array<{ id: string; club_id: string }>;
    const results: Array<Record<string, unknown>> = [];

    for (const run of claimed) {
      try {
        const outcome = await processWeeklyDigestRun(admin, run, siteOrigin);
        await admin.rpc("complete_automation_run", {
          _run_id: run.id,
          _status: outcome.errors.length > 0 && outcome.sent === 0 ? "failed" : "completed",
          _result: outcome,
          _error_message: outcome.errors.length > 0 ? outcome.errors.join("; ") : null,
        });
        results.push({ runId: run.id, clubId: run.club_id, ...outcome });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Processing failed";
        await admin.rpc("complete_automation_run", {
          _run_id: run.id,
          _status: "failed",
          _result: {},
          _error_message: message,
        });
        results.push({ runId: run.id, clubId: run.club_id, error: message });
      }
    }

    return jsonResponse({ ok: true, processed: claimed.length, results }, 200, corsHeaders);
  } catch (error) {
    console.error("process-weekly-digests:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500,
      corsHeaders,
    );
  }
});
