/**
 * Resolve Stripe Price IDs for subscription checkout from Edge secrets.
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets), unless
 * STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS=true (dev/sandbox only):
 *   STRIPE_PRICE_KICKOFF_YEARLY, STRIPE_PRICE_KICKOFF_MONTHLY
 *   STRIPE_PRICE_SQUAD_YEARLY, STRIPE_PRICE_SQUAD_MONTHLY
 *   STRIPE_PRICE_PRO_YEARLY, STRIPE_PRICE_PRO_MONTHLY
 *   STRIPE_PRICE_CHAMPIONS_YEARLY, STRIPE_PRICE_CHAMPIONS_MONTHLY
 */

const PLAN_ENV_SEGMENT: Record<string, string> = {
  kickoff: "KICKOFF",
  squad: "SQUAD",
  pro: "PRO",
  champions: "CHAMPIONS",
};

/** Legacy placeholders — only used when STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS=true */
const PLACEHOLDER_PRICES: Record<string, Record<string, string>> = {
  kickoff: { yearly: "price_kickoff_yearly", monthly: "price_kickoff_monthly" },
  squad: { yearly: "price_squad_yearly", monthly: "price_squad_monthly" },
  pro: { yearly: "price_pro_yearly", monthly: "price_pro_monthly" },
  champions: { yearly: "price_champions_yearly", monthly: "price_champions_monthly" },
};

export interface ResolvedPrice {
  priceId: string;
  source: "env" | "placeholder";
}

export function resolveStripeCheckoutPriceId(
  planId: unknown,
  billingCycle: unknown,
): { ok: true; value: ResolvedPrice } | { ok: false; error: string; status: number } {
  const p = typeof planId === "string" ? planId.toLowerCase().trim() : "";
  const c = typeof billingCycle === "string" ? billingCycle.toLowerCase().trim() : "";
  if (c !== "yearly" && c !== "monthly") {
    return { ok: false, error: "Invalid billing cycle.", status: 400 };
  }
  const segment = PLAN_ENV_SEGMENT[p];
  if (!segment) {
    return { ok: false, error: "Invalid plan.", status: 400 };
  }
  const cycleKey = c === "yearly" ? "YEARLY" : "MONTHLY";
  const envName = `STRIPE_PRICE_${segment}_${cycleKey}`;
  const fromEnv = Deno.env.get(envName)?.trim();
  if (fromEnv) {
    return { ok: true, value: { priceId: fromEnv, source: "env" } };
  }

  if (Deno.env.get("STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS") === "true") {
    const ph = PLACEHOLDER_PRICES[p]?.[c];
    if (ph) {
      console.warn(
        `[stripe-checkout] Using placeholder price id for ${p}/${c} (${ph}). Set ${envName} for production.`,
      );
      return { ok: true, value: { priceId: ph, source: "placeholder" } };
    }
  }

  return {
    ok: false,
    status: 503,
    error:
      `Stripe price not configured: set Edge secret ${envName} to your Stripe Price id ` +
      `(Dashboard → Products → Price API id). For local sandbox only, set STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS=true.`,
  };
}
