import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import { useLanguage } from "@/hooks/use-language";
import { formatAdoptionRate } from "@/lib/operator-usage-analytics";

interface OperatorAnalyticsCohortsProps {
  totalActiveClubs: number;
  trialClubsEstimate: number;
  payingClubsEstimate: number;
  inactiveClubsEstimate: number;
  isLoading: boolean;
}

export function OperatorAnalyticsCohorts({
  totalActiveClubs,
  trialClubsEstimate,
  payingClubsEstimate,
  inactiveClubsEstimate,
  isLoading,
}: OperatorAnalyticsCohortsProps) {
  const { t } = useLanguage();
  const c = t.operator.analytics.cohorts;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{c.title}</h2>
          <p className="text-sm text-muted-foreground">{c.description}</p>
        </div>
        <Link to="/operator/clubs" className="text-sm font-medium text-primary hover:underline">
          {c.openClubsDirectory}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperatorMetricCard
          label={c.activeClubBase}
          value={totalActiveClubs}
          hint={c.activeClubBaseHint}
          isLoading={isLoading}
        />
        <OperatorMetricCard
          label={c.trialWeighted}
          value={trialClubsEstimate}
          hint={formatAdoptionRate(trialClubsEstimate, totalActiveClubs)}
          isLoading={isLoading}
          href="/operator/clubs?billing=trialing"
        />
        <OperatorMetricCard
          label={c.payingWeighted}
          value={payingClubsEstimate}
          hint={formatAdoptionRate(payingClubsEstimate, totalActiveClubs)}
          isLoading={isLoading}
          href="/operator/clubs?billing=active"
        />
        <OperatorMetricCard
          label={c.lowActivity}
          value={inactiveClubsEstimate}
          hint={c.lowActivityHint}
          tone={inactiveClubsEstimate > 0 ? "warning" : "default"}
          isLoading={isLoading}
          href="/operator/support"
        />
      </div>
      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{c.advancedTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{c.advancedDesc}</CardContent>
      </Card>
    </section>
  );
}
