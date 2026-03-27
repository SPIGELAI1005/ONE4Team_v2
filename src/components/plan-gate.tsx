import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanGuard } from "@/hooks/use-plan-guard";
import { getPlanDisplayName, type FeatureKey } from "@/lib/plan-limits";
import { useLanguage } from "@/hooks/use-language";

interface PlanGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export function PlanGate({ feature, children, fallbackMessage }: PlanGateProps) {
  const { canUseFeature, planId, loading } = usePlanGuard();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (loading) return <>{children}</>;

  if (!canUseFeature(feature)) {
    const defaultMsg = t.planGate.featureNotAvailable.replace("{planName}", getPlanDisplayName(planId));
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          {t.common.upgrade}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {fallbackMessage || defaultMsg}
        </p>
        <Button
          onClick={() => navigate("/pricing")}
          className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
        >
          {t.common.viewPlans}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

interface PlanLimitCheckProps {
  currentCount: number;
  limitType: "members" | "teams";
  children: React.ReactNode;
}

export function PlanLimitCheck({ currentCount, limitType, children }: PlanLimitCheckProps) {
  const { maxMembers, maxTeams, planId, loading } = usePlanGuard();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (loading) return <>{children}</>;

  const limit = limitType === "members" ? maxMembers : maxTeams;
  const isOverLimit = currentCount >= limit;

  if (isOverLimit && limit !== Infinity) {
    const title =
      limitType === "members"
        ? t.planGate.memberLimitTitle.replace("{current}", String(currentCount)).replace("{limit}", String(limit))
        : t.planGate.teamLimitTitle.replace("{current}", String(currentCount)).replace("{limit}", String(limit));
    const detail =
      limitType === "members"
        ? t.planGate.planAllowsMembers.replace("{planName}", getPlanDisplayName(planId)).replace("{limit}", String(limit))
        : t.planGate.planAllowsTeams.replace("{planName}", getPlanDisplayName(planId)).replace("{limit}", String(limit));
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {detail}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => navigate("/pricing")}
            >
              {t.planGate.upgradePlan}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
