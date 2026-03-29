import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { resolveStripeCheckoutPriceId } from "../_shared/stripe_checkout_prices.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function stripeRequest(endpoint: string, body: Record<string, string>) {
  const resp = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  return resp.json();
}

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "stripe-checkout request", {
    correlationId,
    facet: "stripe_checkout",
    method: req.method,
  });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, clubId, planId, billingCycle, memberCount, successUrl, cancelUrl } = await req.json();

    if (action === "create-checkout") {
      if (!clubId || typeof clubId !== "string" || !UUID_RE.test(clubId)) {
        return new Response(JSON.stringify({ error: "Valid clubId is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin, error: adminRpcError } = await supabase.rpc("is_club_admin", {
        _user_id: user.id,
        _club_id: clubId,
      });
      if (adminRpcError) {
        console.error("is_club_admin rpc:", adminRpcError.message);
        return new Response(JSON.stringify({ error: "Authorization check failed." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Club admin required to start checkout." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!STRIPE_SECRET_KEY) {
        return new Response(
          JSON.stringify({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY in Edge Function secrets." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const resolved = resolveStripeCheckoutPriceId(planId, billingCycle);
      if (!resolved.ok) {
        return new Response(JSON.stringify({ error: resolved.error }), {
          status: resolved.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const stripePriceId = resolved.value.priceId;

      const session = await stripeRequest("/checkout/sessions", {
        "payment_method_types[]": "card",
        "line_items[0][price]": stripePriceId,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: successUrl || `${req.headers.get("origin")}/dashboard/admin?checkout=success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing?checkout=canceled`,
        "metadata[club_id]": clubId,
        "metadata[plan_id]": planId,
        "metadata[billing_cycle]": billingCycle,
        "metadata[member_count]": String(memberCount),
        customer_email: user.email ?? "",
      });

      if (session.error) {
        return new Response(
          JSON.stringify({ error: session.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("billing_subscriptions").upsert({
        club_id: clubId,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: "incomplete",
        stripe_customer_id: session.customer ?? null,
        metadata: { member_count: memberCount, checkout_session_id: session.id },
        updated_at: new Date().toISOString(),
      }, { onConflict: "club_id" });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
