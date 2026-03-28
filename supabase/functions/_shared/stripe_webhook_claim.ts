/**
 * Claim-first idempotency for Stripe webhooks.
 *
 * - Insert into stripe_processed_events first = lease to process this event id.
 * - If insert conflicts: another delivery is in flight or already finished.
 *   - If billing_events already has this stripe_event_id → 200 duplicate (done).
 *   - If claim is fresh (< STALE_MS) → 503 + Retry-After (parallel delivery; Stripe retries).
 *   - If claim is stale (worker died) → delete claim and try to insert again.
 * - On handler failure after claim: delete claim and return 500 so Stripe retries full pipeline.
 *
 * Env: STRIPE_WEBHOOK_STALE_CLAIM_MS (default 120000, clamped 30s–600s).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

export type WebhookClaimResult =
  | { kind: "process" }
  | { kind: "already_processed" }
  | { kind: "defer"; response: Response };

function staleClaimMs(): number {
  const n = Number(Deno.env.get("STRIPE_WEBHOOK_STALE_CLAIM_MS") ?? "120000");
  if (!Number.isFinite(n)) return 120_000;
  return Math.min(600_000, Math.max(30_000, Math.floor(n)));
}

export async function acquireStripeWebhookClaim(
  supabase: SupabaseClient,
  eventId: string,
): Promise<WebhookClaimResult> {
  const STALE_MS = staleClaimMs();

  const tryInsert = () =>
    supabase.from("stripe_processed_events").insert({ stripe_event_id: eventId });

  let { error: insErr } = await tryInsert();
  if (!insErr) return { kind: "process" };

  if (insErr.code !== "23505") {
    throw new Error(`stripe_processed_events insert: ${insErr.message}`);
  }

  const { data: billingRow } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (billingRow) return { kind: "already_processed" };

  const { data: claimRow } = await supabase
    .from("stripe_processed_events")
    .select("processed_at")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  const claimedAtMs = claimRow?.processed_at
    ? new Date(claimRow.processed_at as string).getTime()
    : 0;
  const ageMs = Date.now() - claimedAtMs;

  if (ageMs < STALE_MS) {
    const retryAfterSec = Math.max(5, Math.min(60, Math.ceil((STALE_MS - ageMs) / 1000)));
    return {
      kind: "defer",
      response: new Response(
        JSON.stringify({
          received: false,
          retry: true,
          reason: "stripe_event_claim_held",
          detail:
            "Another webhook delivery may be processing this event, or the first attempt is still in progress. Stripe will retry.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        },
      ),
    };
  }

  const { error: delErr } = await supabase
    .from("stripe_processed_events")
    .delete()
    .eq("stripe_event_id", eventId);
  if (delErr) {
    throw new Error(`stripe_processed_events stale delete: ${delErr.message}`);
  }

  ({ error: insErr } = await tryInsert());
  if (!insErr) return { kind: "process" };

  if (insErr.code === "23505") {
    const { data: billingAgain } = await supabase
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    if (billingAgain) return { kind: "already_processed" };

    return {
      kind: "defer",
      response: new Response(
        JSON.stringify({
          received: false,
          retry: true,
          reason: "stripe_event_claim_race_after_reclaim",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json", "Retry-After": "5" },
        },
      ),
    };
  }

  throw new Error(`stripe_processed_events re-insert: ${insErr.message}`);
}

export async function releaseStripeWebhookClaim(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase.from("stripe_processed_events").delete().eq("stripe_event_id", eventId);
  if (error) {
    console.error("releaseStripeWebhookClaim:", error.message);
  }
}
