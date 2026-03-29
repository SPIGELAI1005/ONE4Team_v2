import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import {
  acquireStripeWebhookClaim,
  releaseStripeWebhookClaim,
} from "../_shared/stripe_webhook_claim.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

function jsonResponse(
  body: Record<string, unknown>,
  init: ResponseInit & { correlationId: string },
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-correlation-id", init.correlationId);
  return new Response(JSON.stringify(body), { ...init, headers });
}

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const correlationId = resolveCorrelationId(req);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { "x-correlation-id": correlationId } });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    logStructured("error", "Stripe webhook not configured", { correlationId, facet: "stripe_webhook" });
    return jsonResponse({ error: "Webhook not configured" }, { status: 500, correlationId });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  if (!sig) {
    return jsonResponse({ error: "Missing stripe-signature" }, { status: 400, correlationId });
  }

  const body = await req.text();

  const stripe = new Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder_invalid", {
    apiVersion: "2024-11-20.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payload";
    logStructured("warn", "Stripe webhook signature verification failed", { correlationId, facet: "stripe_webhook", detail: msg });
    return jsonResponse({ error: "Invalid signature" }, { status: 400, correlationId });
  }

  logStructured("info", "Stripe webhook event received", {
    correlationId,
    facet: "stripe_webhook",
    stripe_event_id: event.id,
    stripe_event_type: event.type,
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let claimResult: Awaited<ReturnType<typeof acquireStripeWebhookClaim>>;
  try {
    claimResult = await acquireStripeWebhookClaim(supabase, event.id);
  } catch (e) {
    logStructured("error", "Stripe webhook claim error", {
      correlationId,
      facet: "stripe_webhook",
      stripe_event_id: event.id,
      detail: e instanceof Error ? e.message : String(e),
    });
    return jsonResponse({ error: e instanceof Error ? e.message : "Claim failed" }, { status: 500, correlationId });
  }

  if (claimResult.kind === "already_processed") {
    return jsonResponse({ received: true, duplicate: true, reason: "billing_events_record" }, { status: 200, correlationId });
  }

  if (claimResult.kind === "defer") {
    const r = claimResult.response;
    const headers = new Headers(r.headers);
    headers.set("x-correlation-id", correlationId);
    return new Response(r.body, { status: r.status, headers });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clubId = session.metadata?.club_id;
        if (!clubId) break;

        await supabase.from("billing_subscriptions").upsert({
          club_id: clubId,
          plan_id: session.metadata?.plan_id ?? "kickoff",
          billing_cycle: session.metadata?.billing_cycle ?? "monthly",
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null,
          metadata: {
            member_count: Number(session.metadata?.member_count ?? 0),
            checkout_session_id: session.id,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "club_id" });

        const { error: evErr } = await supabase.from("billing_events").insert({
          club_id: clubId,
          event_type: "checkout_completed",
          stripe_event_id: event.id,
          payload: session as unknown as Record<string, unknown>,
        });
        if (evErr?.code === "23505") {
          break;
        }
        if (evErr) throw new Error(evErr.message);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing?.club_id) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "cancelled",
            cancelled: "cancelled",
            trialing: "trialing",
            incomplete: "incomplete",
          };
          await supabase.from("billing_subscriptions").update({
            status: statusMap[sub.status] ?? sub.status,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          }).eq("club_id", existing.club_id);

          const { error: evErr } = await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "subscription_updated",
            stripe_event_id: event.id,
            payload: sub as unknown as Record<string, unknown>,
          });
          if (evErr?.code !== "23505" && evErr) throw new Error(evErr.message);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing?.club_id) {
          await supabase.from("billing_subscriptions").update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          }).eq("club_id", existing.club_id);

          const { error: evErr } = await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "subscription_canceled",
            stripe_event_id: event.id,
            payload: sub as unknown as Record<string, unknown>,
          });
          if (evErr?.code !== "23505" && evErr) throw new Error(evErr.message);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (existing?.club_id) {
          await supabase.from("billing_subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("club_id", existing.club_id);

          const { error: evErr } = await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "payment_failed",
            stripe_event_id: event.id,
            payload: invoice as unknown as Record<string, unknown>,
          });
          if (evErr?.code !== "23505" && evErr) throw new Error(evErr.message);
        }
        break;
      }
    }

    return jsonResponse({ received: true }, { status: 200, correlationId });
  } catch (err) {
    logStructured("error", "Stripe webhook handler failed", {
      correlationId,
      facet: "stripe_webhook",
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      detail: err instanceof Error ? err.message : String(err),
    });
    await releaseStripeWebhookClaim(supabase, event.id);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500, correlationId },
    );
  }
});
