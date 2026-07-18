import type { PlanId } from "@/lib/stripe";

/** Extend SubscriptionRecord with commercial fields. */
export type BillingAccessSource =
  | "stripe"
  | "standard_trial"
  | "commercial_offer"
  | "operator_grant"
  | "legacy";

export type BillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "cancelled"
  | "incomplete"
  | "paused"
  | "promotional"
  | "grace"
  | "expired";
