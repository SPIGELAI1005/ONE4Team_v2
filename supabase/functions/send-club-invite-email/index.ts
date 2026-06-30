import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import {
  buildClubInviteOnboardingUrl,
  hashInviteToken,
  sendClubInviteEmailViaResend,
} from "../_shared/club_invite_email.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "ONE4Team <onboarding@resend.dev>";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "send-club-invite-email request", {
    correlationId,
    facet: "send_club_invite_email",
    method: req.method,
  });

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);
    }

    if (!RESEND_API_KEY) {
      return jsonResponse(
        {
          error: "Email delivery is not configured. Set RESEND_API_KEY in Edge Function secrets.",
          code: "email_not_configured",
        },
        503,
        corsHeaders,
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
    const inviteId = typeof body.inviteId === "string" ? body.inviteId.trim() : "";
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : "";
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : "";
    const language = body.language === "de" ? "de" : "en";
    const siteOrigin =
      typeof body.siteOrigin === "string" && body.siteOrigin.trim()
        ? body.siteOrigin.trim().replace(/\/+$/, "")
        : req.headers.get("origin")?.trim().replace(/\/+$/, "") || PUBLIC_SITE_URL.replace(/\/+$/, "");

    if (!clubId || !UUID_RE.test(clubId)) {
      return jsonResponse({ error: "Valid clubId is required." }, 400, corsHeaders);
    }
    if (!inviteId || !UUID_RE.test(inviteId)) {
      return jsonResponse({ error: "Valid inviteId is required." }, 400, corsHeaders);
    }
    if (!toEmail || !EMAIL_RE.test(toEmail)) {
      return jsonResponse({ error: "Valid toEmail is required." }, 400, corsHeaders);
    }
    if (inviteToken.length < 10) {
      return jsonResponse({ error: "Valid inviteToken is required." }, 400, corsHeaders);
    }
    if (!siteOrigin) {
      return jsonResponse(
        { error: "Could not resolve site origin. Set PUBLIC_SITE_URL or pass siteOrigin." },
        400,
        corsHeaders,
      );
    }

    const { data: canReview, error: reviewError } = await supabase.rpc("can_review_club_join_requests", {
      _user_id: user.id,
      _club_id: clubId,
    });
    if (reviewError) {
      console.error("can_review_club_join_requests rpc:", reviewError.message);
      return jsonResponse({ error: "Authorization check failed." }, 500, corsHeaders);
    }
    if (!canReview) {
      return jsonResponse({ error: "Not authorized to send club invites for this club." }, 403, corsHeaders);
    }

    const { data: inviteRow, error: inviteError } = await supabase
      .from("club_invites")
      .select("id, club_id, email, token_hash, used_at")
      .eq("id", inviteId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (inviteError) {
      console.error("club_invites lookup:", inviteError.message);
      return jsonResponse({ error: "Invite lookup failed." }, 500, corsHeaders);
    }
    if (!inviteRow) {
      return jsonResponse({ error: "Invite not found." }, 404, corsHeaders);
    }
    if (inviteRow.used_at) {
      return jsonResponse({ error: "Invite was already used." }, 409, corsHeaders);
    }
    if ((inviteRow.email ?? "").trim().toLowerCase() !== toEmail) {
      return jsonResponse({ error: "Invite email does not match." }, 400, corsHeaders);
    }

    const tokenHash = await hashInviteToken(inviteToken);
    if (tokenHash !== inviteRow.token_hash) {
      return jsonResponse({ error: "Invite token is invalid." }, 400, corsHeaders);
    }

    const { data: clubRow, error: clubError } = await supabase
      .from("clubs")
      .select("name, slug")
      .eq("id", clubId)
      .maybeSingle();
    if (clubError) {
      console.error("clubs lookup:", clubError.message);
      return jsonResponse({ error: "Club lookup failed." }, 500, corsHeaders);
    }

    const inviteLink = buildClubInviteOnboardingUrl({
      inviteToken,
      clubSlug: typeof clubRow?.slug === "string" ? clubRow.slug : null,
      siteOrigin,
    });

    const sendResult = await sendClubInviteEmailViaResend({
      toEmail,
      apiKey: RESEND_API_KEY,
      fromEmail: RESEND_FROM_EMAIL,
      inviteLink,
      clubName: typeof clubRow?.name === "string" ? clubRow.name : "ONE4Team",
      recipientName: recipientName || null,
      language,
    });

    if (!sendResult.ok) {
      logStructured("warn", "send-club-invite-email resend failure", {
        correlationId,
        facet: "send_club_invite_email",
        error: sendResult.error,
      });
      return jsonResponse({ error: sendResult.error, code: "email_send_failed" }, 502, corsHeaders);
    }

    logStructured("info", "send-club-invite-email delivered", {
      correlationId,
      facet: "send_club_invite_email",
      inviteId,
      messageId: sendResult.messageId,
    });

    return jsonResponse({ ok: true, messageId: sendResult.messageId }, 200, corsHeaders);
  } catch (error) {
    console.error("send-club-invite-email:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500,
      corsHeaders,
    );
  }
});
