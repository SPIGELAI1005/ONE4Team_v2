import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    if (!STRIPE_WEBHOOK_SECRET || !sig) {
      console.warn("Stripe webhook: missing secret or signature, processing unverified");
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clubId = session.metadata?.club_id;
        if (!clubId) break;

        await supabase.from("billing_subscriptions").upsert({
          club_id: clubId,
          plan_id: session.metadata?.plan_id ?? "kickoff",
          billing_cycle: session.metadata?.billing_cycle ?? "monthly",
          status: "active",
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: session.subscription ?? null,
          metadata: {
            member_count: Number(session.metadata?.member_count ?? 0),
            checkout_session_id: session.id,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "club_id" });

        await supabase.from("billing_events").insert({
          club_id: clubId,
          event_type: "checkout_completed",
          stripe_event_id: event.id,
          payload: session,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing?.club_id) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "canceled",
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

          await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "subscription_updated",
            stripe_event_id: event.id,
            payload: sub,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing?.club_id) {
          await supabase.from("billing_subscriptions").update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          }).eq("club_id", existing.club_id);

          await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "subscription_canceled",
            stripe_event_id: event.id,
            payload: sub,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("club_id")
          .eq("stripe_customer_id", invoice.customer)
          .single();

        if (existing?.club_id) {
          await supabase.from("billing_subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("club_id", existing.club_id);

          await supabase.from("billing_events").insert({
            club_id: existing.club_id,
            event_type: "payment_failed",
            stripe_event_id: event.id,
            payload: invoice,
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
