import { Link } from "react-router-dom";
import {
  Activity,
  Gauge,
  RefreshCw,
  Server,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  OperatorIntegrationBadge,
  OperatorMetricPlaceholder,
} from "@/components/operator/OperatorIntegrationBadge";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import {
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { OperatorSystemHealthCard } from "@/components/operator/OperatorSystemHealthCard";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorPerformanceOverview } from "@/hooks/use-operator-performance-overview";
import {
  formatBytes,
  formatHealthStatus,
  formatOverviewNumber,
  formatOverviewTimestamp,
  healthStatusTone,
  localizePerformanceIntegrationLabel,
  localizePerformanceStatusDescription,
} from "@/lib/operator-monitoring";

function statusBadgeVariant(tone: ReturnType<typeof healthStatusTone>) {
  if (tone === "success") return "default" as const;
  if (tone === "warning") return "secondary" as const;
  if (tone === "danger") return "destructive" as const;
  return "outline" as const;
}

export default function OperatorPerformance() {
  const { t } = useLanguage();
  const p = t.operator.performance;
  const { data, isLoading, isError, error, refetch, isFetching } = useOperatorPerformanceOverview();

  if (isError) {
    return (
      <OperatorPageError
        title={p.loadErrorTitle}
        message={error instanceof Error ? error.message : p.loadErrorMessage}
      />
    );
  }

  const tone = healthStatusTone(data?.app_status ?? "operational");

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Gauge}
        title={p.title}
        description={p.description}
        meta={
          isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.operator.shell.updated} {formatOverviewTimestamp(data?.generated_at)}
            </span>
          )
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {t.operator.shell.refresh}
          </Button>
        }
      />

      <OperatorSystemHealthCard />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{p.appStatus.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(tone)}>
                    {formatHealthStatus(data?.app_status ?? "operational", t)}
                  </Badge>
                  <OperatorIntegrationBadge connected />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {localizePerformanceStatusDescription(data?.app_status_description ?? "", t)}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <OperatorMetricCard
                    label={p.signals.openAbuseAlerts}
                    value={data?.signals.open_abuse_alerts}
                    icon={Activity}
                    tone={(data?.signals.open_abuse_alerts ?? 0) > 0 ? "warning" : "default"}
                    isLoading={isLoading}
                  />
                  <OperatorMetricCard
                    label={p.signals.highSeverityAlerts}
                    value={data?.signals.high_severity_open_abuse_alerts}
                    icon={Activity}
                    tone={(data?.signals.high_severity_open_abuse_alerts ?? 0) > 0 ? "danger" : "default"}
                    isLoading={isLoading}
                  />
                  <OperatorMetricCard
                    label={p.signals.pastDueBilling}
                    value={data?.signals.past_due_billing_subscriptions}
                    icon={Server}
                    tone={(data?.signals.past_due_billing_subscriptions ?? 0) > 0 ? "warning" : "default"}
                    isLoading={isLoading}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{p.integrations.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              Object.entries(data?.integrations ?? {}).map(([key, integration]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {localizePerformanceIntegrationLabel(key, t)}
                  </span>
                  <OperatorIntegrationBadge connected={integration.connected} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{p.runtimeMetrics.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <OperatorMetricPlaceholder
            label={p.runtimeMetrics.avgPageLoad}
            connected={data?.metrics.avg_page_load_ms.connected ?? false}
            value={
              data?.metrics.avg_page_load_ms.connected && data.metrics.avg_page_load_ms.value != null
                ? `${formatOverviewNumber(data.metrics.avg_page_load_ms.value)} ms`
                : "—"
            }
            hint={p.runtimeMetrics.avgPageLoadHint}
          />
          <OperatorMetricPlaceholder
            label={p.runtimeMetrics.apiErrorRate}
            connected={data?.metrics.api_error_rate.connected ?? false}
            value={
              data?.metrics.api_error_rate.connected && data.metrics.api_error_rate.value != null
                ? `${data.metrics.api_error_rate.value}%`
                : "—"
            }
            hint={p.runtimeMetrics.apiErrorRateHint}
          />
          <OperatorMetricPlaceholder
            label={p.runtimeMetrics.databaseResponse}
            connected={data?.metrics.database_response_ms.connected ?? false}
            value={
              data?.metrics.database_response_ms.value != null
                ? `${data.metrics.database_response_ms.value} ms`
                : "—"
            }
            hint={p.runtimeMetrics.databaseResponseHint}
          />
          <OperatorMetricPlaceholder
            label={p.runtimeMetrics.databaseSize}
            connected={data?.metrics.database_size_bytes.connected ?? false}
            value={formatBytes(data?.metrics.database_size_bytes.value)}
            hint={p.runtimeMetrics.databaseSizeHint}
          />
          <OperatorMetricPlaceholder
            label={p.runtimeMetrics.lastDeployment}
            connected={data?.last_deployment.connected ?? false}
            value={
              data?.last_deployment.connected && data.last_deployment.deployed_at
                ? formatOverviewTimestamp(data.last_deployment.deployed_at)
                : "—"
            }
            hint={p.runtimeMetrics.lastDeploymentHint}
          />
        </div>
      </section>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">{p.slowestRoutes.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{p.slowestRoutes.description}</p>
          </div>
          <OperatorIntegrationBadge connected={data?.slowest_routes.connected ?? false} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.slowest_routes.connected && (data.slowest_routes.items?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{p.slowestRoutes.route}</TableHead>
                  <TableHead className="text-right">{p.slowestRoutes.avgLoad}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slowest_routes.items.map((row) => (
                  <TableRow key={row.route}>
                    <TableCell>{row.route}</TableCell>
                    <TableCell className="text-right">{formatOverviewNumber(row.avg_ms)} ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState
              icon={Timer}
              title={p.slowestRoutes.emptyTitle}
              description={p.slowestRoutes.emptyDesc}
            />
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {p.footer.prefix}{" "}
        <Link to="/operator/issues" className="text-primary hover:underline">
          {p.footer.issuesLink}
        </Link>{" "}
        {p.footer.middle}{" "}
        <Link to="/operator/analytics" className="text-primary hover:underline">
          {p.footer.analyticsLink}
        </Link>{" "}
        {p.footer.suffix}
      </div>
    </OperatorPageShell>
  );
}
