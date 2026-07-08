import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanGuard } from "@/hooks/use-plan-guard";
import { getFeatureDisplayName, getPlanDisplayName, type FeatureKey } from "@/lib/plan-limits";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/one4team-logo.png";

const SUPPORT_EMAIL = "support@one4team.com";

interface PlanGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export function PlanGate({ feature, children, fallbackMessage }: PlanGateProps) {
  const { canUseFeature, planId, loading } = usePlanGuard();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" aria-hidden />
        <p className="text-sm">{t.common.loading}</p>
      </div>
    );
  }

  if (!canUseFeature(feature)) {
    const planName = getPlanDisplayName(planId);
    const featureName = getFeatureDisplayName(feature);
    const defaultMsg = t.planGate.featureNotAvailable.replace("{planName}", planName);
    const mailSubject = t.planGate.contactEmailSubject
      .replace("{feature}", featureName)
      .replace("{planName}", planName);
    const mailBody = t.planGate.contactEmailBody
      .replace("{feature}", featureName)
      .replace("{planName}", planName);
    const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <img src={logo} alt="ONE4Team" className="h-10 w-10 drop-shadow-sm" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
          </span>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          {t.common.upgrade}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {fallbackMessage || defaultMsg}
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={() => navigate("/pricing")}
            className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
          >
            {t.common.viewPlans}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button asChild variant="outline" className="border-primary/30 hover:bg-primary/5">
            <a href={mailtoHref}>
              <Mail className="mr-2 w-4 h-4" />
              {t.planGate.contactSupport}
            </a>
          </Button>
        </div>
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" aria-hidden />
        <span>{t.common.loading}</span>
      </div>
    );
  }

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
