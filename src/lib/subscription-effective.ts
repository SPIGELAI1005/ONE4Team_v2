import type { SubscriptionRecord } from "@/lib/stripe";
import {
  resolveEffectivePlan,
  type EffectivePlanResult,
  type ModuleOverride,
} from "@/lib/effective-plan";

export interface EffectiveFromSubscriptionOptions {
  moduleOverrides?: ModuleOverride[];
  operatorFullAccess?: boolean;
}

export function subscriptionToEffectiveInput(
  subscription: SubscriptionRecord | null,
  options: EffectiveFromSubscriptionOptions = {},
) {
  if (!subscription) {
    return {
      planId: null,
      status: null,
      moduleOverrides: options.moduleOverrides,
      operatorFullAccess: options.operatorFullAccess === true,
    };
  }
  const meta = (subscription.metadata ?? {}) as Record<string, unknown>;
  const status = subscription.status;
  const accessSource =
    subscription.access_source ??
    (typeof meta.access_source === "string" ? meta.access_source : null);

  return {
    planId: subscription.plan_id,
    status,
    accessSource,
    grandfatherKickoff: meta.grandfather_kickoff === true,
    operatorFullAccess:
      options.operatorFullAccess === true || meta.operator_full_access === true,
    moduleOverrides: options.moduleOverrides,
    commercialOfferActive:
      status === "promotional" || accessSource === "commercial_offer",
    inGracePeriod: status === "grace",
    expired: status === "expired",
  };
}

export function effectivePlanFromSubscription(
  subscription: SubscriptionRecord | null,
  options: EffectiveFromSubscriptionOptions = {},
): EffectivePlanResult {
  return resolveEffectivePlan(subscriptionToEffectiveInput(subscription, options));
}
