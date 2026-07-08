import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "";

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

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ ok: false, error: "Unauthorized." }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ ok: false, error: "Valid email is required." }, 400, corsHeaders);
    }
    if (!["OWNER", "OPERATOR", "SUPPORT", "VIEWER"].includes(role)) {
      return jsonResponse({ ok: false, error: "Invalid platform role." }, 400, corsHeaders);
    }
    if (!reason) {
      return jsonResponse({ ok: false, error: "Reason is required." }, 400, corsHeaders);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: access, error: accessError } = await userClient.rpc("get_current_platform_user");
    if (accessError) {
      return jsonResponse({ ok: false, error: accessError.message }, 403, corsHeaders);
    }

    const isOwner =
      access?.is_platform_user === true &&
      access?.role === "OWNER" &&
      Array.isArray(access?.permissions) &&
      access.permissions.includes("operator.access.manage");

    if (!isOwner) {
      return jsonResponse({ ok: false, error: "Only platform OWNER can invite operators." }, 403, corsHeaders);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const redirectTo = PUBLIC_SITE_URL ? `${PUBLIC_SITE_URL.replace(/\/+$/, "")}/auth` : undefined;

    const inviteResult = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (inviteResult.error || !inviteResult.data.user) {
      const message = inviteResult.error?.message ?? "Invite failed.";
      const normalized = message.toLowerCase();
      if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists")) {
        return jsonResponse(
          {
            ok: false,
            error: "An auth account already exists for this email. Use Grant existing user instead.",
          },
          409,
          corsHeaders,
        );
      }
      return jsonResponse({ ok: false, error: message }, 400, corsHeaders);
    }

    const invitedUser = inviteResult.data.user;
    const inviterId = access.auth_user_id as string;

    const { error: grantError } = await admin.rpc("grant_platform_user_from_invite", {
      _auth_user_id: invitedUser.id,
      _email: email,
      _role: role,
      _reason: reason,
      _invited_by: inviterId,
    });

    if (grantError) {
      return jsonResponse({ ok: false, error: grantError.message }, 400, corsHeaders);
    }

    return jsonResponse(
      {
        ok: true,
        message: `Invite sent to ${email}. Platform access will be active once the invite is accepted.`,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});
