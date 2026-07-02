import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { hashInviteToken } from "../_shared/club_invite_email.ts";
import {
  resolveClubWelcomeLogoUrl,
  sendClubWelcomeEmailViaResend,
} from "../_shared/club_welcome_email.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "ONE4Team <onboarding@resend.dev>";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function isPasswordStrong(value: string): boolean {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function isAlreadyRegisteredError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists");
}

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "complete-club-invite-signup request", {
    correlationId,
    facet: "complete_club_invite_signup",
    method: req.method,
  });

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    const clubSlug = typeof body.clubSlug === "string" ? body.clubSlug.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const language = body.language === "de" ? "de" : "en";
    const siteOrigin =
      typeof body.siteOrigin === "string" && body.siteOrigin.trim()
        ? body.siteOrigin.trim().replace(/\/+$/, "")
        : req.headers.get("origin")?.trim().replace(/\/+$/, "") || PUBLIC_SITE_URL.replace(/\/+$/, "");

    if (inviteToken.length < 10) {
      return jsonResponse({ ok: false, code: "invalid_token", error: "Invalid invite token." }, 400, corsHeaders);
    }
    if (!isPasswordStrong(password)) {
      return jsonResponse({ ok: false, code: "weak_password", error: "Password does not meet requirements." }, 400, corsHeaders);
    }
    if (!siteOrigin) {
      return jsonResponse({ ok: false, code: "invalid_request", error: "Missing site origin." }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const tokenHash = await hashInviteToken(inviteToken);

    const { data: inviteRow, error: inviteError } = await supabase
      .from("club_invites")
      .select("id, club_id, email, role, used_at, expires_at, invite_payload")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (inviteError) {
      console.error("club_invites lookup:", inviteError.message);
      return jsonResponse({ ok: false, code: "unknown", error: "Invite lookup failed." }, 500, corsHeaders);
    }
    if (!inviteRow) {
      return jsonResponse({ ok: false, code: "invite_not_found", error: "Invite not found." }, 404, corsHeaders);
    }
    if (inviteRow.used_at) {
      return jsonResponse({ ok: false, code: "invite_used", error: "Invite already used." }, 409, corsHeaders);
    }
    if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() <= Date.now()) {
      return jsonResponse({ ok: false, code: "invite_expired", error: "Invite expired." }, 410, corsHeaders);
    }

    const inviteEmail = (inviteRow.email ?? "").trim().toLowerCase();
    if (!inviteEmail || !EMAIL_RE.test(inviteEmail)) {
      return jsonResponse({ ok: false, code: "invalid_invite", error: "Invite email is missing." }, 400, corsHeaders);
    }

    const { data: clubRow, error: clubError } = await supabase
      .from("clubs")
      .select("name, slug, logo_url, favicon_url, primary_color")
      .eq("id", inviteRow.club_id)
      .maybeSingle();
    if (clubError || !clubRow) {
      console.error("clubs lookup:", clubError?.message);
      return jsonResponse({ ok: false, code: "unknown", error: "Club lookup failed." }, 500, corsHeaders);
    }
    if (clubSlug && clubRow.slug !== clubSlug) {
      return jsonResponse({ ok: false, code: "club_mismatch", error: "Invite club mismatch." }, 400, corsHeaders);
    }

    const metadata = {
      display_name: displayName || inviteEmail,
      registration_path: "club_member_invite",
      invite_club_slug: clubRow.slug,
    };

    let userId: string | null = null;
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: inviteEmail,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createError) {
      if (!isAlreadyRegisteredError(createError.message)) {
        console.error("createUser:", createError.message);
        return jsonResponse({ ok: false, code: "unknown", error: createError.message }, 500, corsHeaders);
      }

      const { data: existingUserId, error: lookupError } = await supabase.rpc("get_auth_user_id_by_email", {
        _email: inviteEmail,
      });
      if (lookupError || !existingUserId) {
        return jsonResponse(
          { ok: false, code: "already_registered", error: "Account already exists. Sign in instead." },
          409,
          corsHeaders,
        );
      }

      const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(existingUserId);
      if (getUserError || !existingUser.user) {
        return jsonResponse({ ok: false, code: "unknown", error: "Could not load existing account." }, 500, corsHeaders);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user.user_metadata ?? {}),
          ...metadata,
        },
      });
      if (updateError) {
        console.error("updateUserById:", updateError.message);
        return jsonResponse({ ok: false, code: "unknown", error: updateError.message }, 500, corsHeaders);
      }
      userId = existingUserId;
    } else {
      userId = createdUser.user?.id ?? null;
    }

    if (!userId) {
      return jsonResponse({ ok: false, code: "unknown", error: "Account could not be created." }, 500, corsHeaders);
    }

    let welcomeEmailSent = false;
    if (RESEND_API_KEY) {
      const clubPageUrl = `${siteOrigin}/club/${encodeURIComponent(clubRow.slug)}`;
      const dashboardRole = typeof inviteRow.role === "string" ? inviteRow.role : "member";
      const dashboardUrl = `${siteOrigin}/dashboard/${encodeURIComponent(dashboardRole)}`;
      const logoUrl = resolveClubWelcomeLogoUrl({
        logoUrl: clubRow.logo_url,
        faviconUrl: clubRow.favicon_url,
        siteOrigin,
      });

      const welcomeResult = await sendClubWelcomeEmailViaResend({
        apiKey: RESEND_API_KEY,
        fromEmail: RESEND_FROM_EMAIL,
        recipientEmail: inviteEmail,
        recipientName: displayName || null,
        clubName: clubRow.name ?? "ONE4Team",
        clubSlug: clubRow.slug,
        clubPageUrl,
        dashboardUrl,
        clubLogoUrl: logoUrl,
        clubPrimaryColor: clubRow.primary_color,
        language,
      });

      welcomeEmailSent = welcomeResult.ok;
      if (!welcomeResult.ok) {
        logStructured("warn", "welcome email failed", {
          correlationId,
          facet: "complete_club_invite_signup",
          error: welcomeResult.error,
        });
      }
    }

    logStructured("info", "complete-club-invite-signup account ready", {
      correlationId,
      facet: "complete_club_invite_signup",
      userId,
      welcomeEmailSent,
    });

    return jsonResponse(
      {
        ok: true,
        email: inviteEmail,
        welcomeEmailSent,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("complete-club-invite-signup:", error);
    return jsonResponse(
      { ok: false, code: "unknown", error: error instanceof Error ? error.message : "Unexpected error." },
      500,
      corsHeaders,
    );
  }
});
