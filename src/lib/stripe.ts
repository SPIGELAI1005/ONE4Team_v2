import { loadStripe, type Stripe } from "@stripe/stripe-js";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise ?? Promise.resolve(null);
}

export interface CheckoutParams {
  clubId: string;
  planId: string;
  billingCycle: "yearly" | "monthly";
  memberCount: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionRecord {
  id: string;
  club_id: string;
  plan_id: string;
  billing_cycle: "yearly" | "monthly";
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "cancelled"
    | "incomplete"
    | "paused";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown>;
}

export const PLAN_IDS = ["kickoff", "squad", "pro", "champions", "bespoke"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function isValidPlanId(id: string): id is PlanId {
  return (PLAN_IDS as readonly string[]).includes(id);
}
