import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import {
  acquireStripeWebhookClaim,
  releaseStripeWebhookClaim,
} from "../_shared/stripe_webhook_claim.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET is not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
    console.warn("Stripe webhook signature verification failed:", msg);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let claimResult: Awaited<ReturnType<typeof acquireStripeWebhookClaim>>;
  try {
    claimResult = await acquireStripeWebhookClaim(supabase, event.id);
  } catch (e) {
    console.error("Stripe webhook claim error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Claim failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (claimResult.kind === "already_processed") {
    return new Response(JSON.stringify({ received: true, duplicate: true, reason: "billing_events_record" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (claimResult.kind === "defer") {
    return claimResult.response;
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

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    await releaseStripeWebhookClaim(supabase, event.id);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
