/**
 * Resolve Stripe Price IDs for base + per-member subscription checkout.
 *
 * Secrets (per plan × cycle):
 *   STRIPE_PRICE_{PLAN}_{MONTHLY|YEARLY}_BASE
 *   STRIPE_PRICE_{PLAN}_{MONTHLY|YEARLY}_MEMBER
 *
 * Legacy single-price secrets still accepted as base-only fallback:
 *   STRIPE_PRICE_{PLAN}_{MONTHLY|YEARLY}
 */

const PLAN_ENV_SEGMENT: Record<string, string> = {
  kickoff: "KICKOFF",
  squad: "SQUAD",
  pro: "PRO",
  champions: "CHAMPIONS",
};

/** Plan member caps — keep in sync with src/lib/plan-catalog.ts */
const PLAN_MAX_MEMBERS: Record<string, number> = {
  kickoff: 500,
  squad: 1000,
  pro: 2000,
  champions: 5000,
};

export interface ResolvedCheckoutPrices {
  basePriceId: string;
  memberPriceId: string | null;
  source: "env" | "placeholder" | "legacy_single";
}

export function resolveStripeCheckoutPrices(
  planId: unknown,
  billingCycle: unknown,
): { ok: true; value: ResolvedCheckoutPrices } | { ok: false; error: string; status: number } {
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
  const baseEnv = `STRIPE_PRICE_${segment}_${cycleKey}_BASE`;
  const memberEnv = `STRIPE_PRICE_${segment}_${cycleKey}_MEMBER`;
  const legacyEnv = `STRIPE_PRICE_${segment}_${cycleKey}`;

  const baseFromEnv = Deno.env.get(baseEnv)?.trim();
  const memberFromEnv = Deno.env.get(memberEnv)?.trim();
  const legacy = Deno.env.get(legacyEnv)?.trim();

  if (baseFromEnv && memberFromEnv) {
    return {
      ok: true,
      value: { basePriceId: baseFromEnv, memberPriceId: memberFromEnv, source: "env" },
    };
  }

  if (legacy) {
    console.warn(
      `[stripe-checkout] Using legacy single price ${legacyEnv}. Prefer ${baseEnv} + ${memberEnv}.`,
    );
    return {
      ok: true,
      value: { basePriceId: legacy, memberPriceId: null, source: "legacy_single" },
    };
  }

  if (Deno.env.get("STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS") === "true") {
    return {
      ok: true,
      value: {
        basePriceId: `price_${p}_${c}_base`,
        memberPriceId: `price_${p}_${c}_member`,
        source: "placeholder",
      },
    };
  }

  return {
    ok: false,
    status: 503,
    error:
      `Stripe prices not configured: set ${baseEnv} and ${memberEnv} (or legacy ${legacyEnv}). ` +
      `For local sandbox only, set STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS=true.`,
  };
}

/** @deprecated Use resolveStripeCheckoutPrices */
export function resolveStripeCheckoutPriceId(
  planId: unknown,
  billingCycle: unknown,
): { ok: true; value: { priceId: string; source: string } } | { ok: false; error: string; status: number } {
  const r = resolveStripeCheckoutPrices(planId, billingCycle);
  if (!r.ok) return r;
  return { ok: true, value: { priceId: r.value.basePriceId, source: r.value.source } };
}

export function validateBillableMemberCount(
  planId: unknown,
  memberCount: unknown,
): { ok: true; count: number } | { ok: false; error: string; status: number } {
  const p = typeof planId === "string" ? planId.toLowerCase().trim() : "";
  const max = PLAN_MAX_MEMBERS[p];
  if (!max) {
    return { ok: false, error: "Invalid plan for member billing.", status: 400 };
  }
  const n = typeof memberCount === "number" ? memberCount : Number(memberCount);
  if (!Number.isFinite(n) || n < 1 || Math.floor(n) !== n) {
    return { ok: false, error: "memberCount must be a positive integer.", status: 400 };
  }
  if (n > max) {
    return {
      ok: false,
      error: `memberCount ${n} exceeds plan limit ${max}.`,
      status: 400,
    };
  }
  return { ok: true, count: n };
}
