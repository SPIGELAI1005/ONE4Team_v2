import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import type { Translations } from "@/i18n";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import type { OperatorPlatformOverview } from "@/lib/platform-overview";
import { formatOverviewNumber } from "@/lib/platform-overview";

interface OperatorActionQueueProps {
  data: OperatorPlatformOverview | undefined;
  isLoading: boolean;
}

interface ActionQueueItem {
  id: string;
  label: string;
  description: string;
  count: number;
  href: string;
  tone: "default" | "warning" | "danger";
}

function buildActionItems(data: OperatorPlatformOverview | undefined, t: Translations): ActionQueueItem[] {
  if (!data) return [];

  const metrics = data.metrics;
  const a = t.operator.overview.actions;
  const items: ActionQueueItem[] = [];

  if ((metrics.suspended_clubs ?? 0) > 0) {
    items.push({
      id: "suspended",
      label: a.suspended.label,
      description: a.suspended.description,
      count: metrics.suspended_clubs,
      href: "/operator/clubs?status=SUSPENDED",
      tone: "danger",
    });
  }

  if ((metrics.trial_clubs ?? 0) > 0) {
    items.push({
      id: "trial",
      label: a.trial.label,
      description: a.trial.description,
      count: metrics.trial_clubs,
      href: "/operator/clubs?billing=trialing",
      tone: "warning",
    });
  }

  if ((metrics.paying_clubs ?? 0) > 0) {
    items.push({
      id: "paying",
      label: a.paying.label,
      description: a.paying.description,
      count: metrics.paying_clubs,
      href: "/operator/clubs?billing=active",
      tone: "default",
    });
  }

  if ((metrics.recent_issues ?? 0) > 0) {
    items.push({
      id: "issues",
      label: a.issues.label,
      description: a.issues.description,
      count: metrics.recent_issues,
      href: "/operator/issues",
      tone: "warning",
    });
  }

  if ((data.recent_created_clubs?.length ?? 0) > 0) {
    items.push({
      id: "onboarding",
      label: a.onboarding.label,
      description: a.onboarding.description,
      count: data.recent_created_clubs.length,
      href: "/operator/clubs",
      tone: "default",
    });
  }

  if ((metrics.active_users_last_7_days ?? 0) > 0) {
    items.push({
      id: "users",
      label: a.users.label,
      description: a.users.description,
      count: metrics.active_users_last_7_days,
      href: "/operator/users",
      tone: "default",
    });
  }

  return items.slice(0, 6);
}

const toneBadge = {
  default: "outline" as const,
  warning: "secondary" as const,
  danger: "destructive" as const,
};

export function OperatorActionQueue({ data, isLoading }: OperatorActionQueueProps) {
  const { t } = useLanguage();
  const o = t.operator.overview;
  const items = buildActionItems(data, t);

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="font-display text-lg">{o.actionQueueTitle}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{o.actionQueueDesc}</p>
        </div>
        <Badge variant="outline">{t.operator.shell.itemsCount.replace("{count}", String(items.length))}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
          ))
        ) : items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 p-4 transition-colors hover:border-primary/30 hover:bg-background/80"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <Badge variant={toneBadge[item.tone]}>{formatOverviewNumber(item.count)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            {o.actionQueueEmpty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
