import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Database,
  Mail,
  RefreshCw,
  ServerCrash,
  WifiOff,
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
import { useLanguage } from "@/hooks/use-language";
import { useOperatorIssuesOverview } from "@/hooks/use-operator-issues-overview";
import { formatOperatorSeverity, operatorSeverityBadgeVariant } from "@/lib/operator-formatters";
import {
  formatOverviewTimestamp,
  localizeIssueSource,
  localizeIssuesEmailDeliveryHint,
  localizeIssuesIntegrationLabel,
} from "@/lib/operator-monitoring";

export default function OperatorIssues() {
  const { t } = useLanguage();
  const i = t.operator.issues;
  const { data, isLoading, isError, error, refetch, isFetching } = useOperatorIssuesOverview();

  if (isError) {
    return (
      <OperatorPageError
        title={i.loadErrorTitle}
        message={error instanceof Error ? error.message : i.loadErrorMessage}
      />
    );
  }

  const openIssues = data?.open_technical_issues ?? [];
  const emailDeliveryHint = localizeIssuesEmailDeliveryHint(
    data?.failed_email_delivery.hint ?? i.emailDeliveryHints.emailNotConnected,
    t,
  );

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={AlertCircle}
        title={i.title}
        description={i.description}
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperatorMetricCard
          label={i.summary.openTechnicalIssues}
          value={data?.summary.open_technical_issues}
          hint={i.summary.openTechnicalIssuesHint}
          icon={AlertTriangle}
          tone={(data?.summary.open_technical_issues ?? 0) > 0 ? "warning" : "default"}
          isLoading={isLoading}
        />
        <OperatorMetricCard
          label={i.summary.failedNotifications7d}
          value={data?.summary.failed_notification_events_7d}
          hint={i.summary.failedNotifications7dHint}
          icon={WifiOff}
          tone={(data?.summary.failed_notification_events_7d ?? 0) > 0 ? "warning" : "default"}
          isLoading={isLoading}
        />
        <OperatorMetricPlaceholder
          label={i.summary.failedApiRequests24h}
          connected={false}
          value="—"
          isLoading={isLoading}
        />
        <OperatorMetricPlaceholder
          label={i.summary.failedInviteDelivery7d}
          connected={data?.integrations.email_delivery.connected ?? false}
          value="—"
          isLoading={isLoading}
        />
      </section>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{i.integrations.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)
            : Object.entries(data?.integrations ?? {}).map(([key, integration]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {localizeIssuesIntegrationLabel(key, t)}
                  </span>
                  <OperatorIntegrationBadge connected={integration.connected} />
                </div>
              ))}
        </CardContent>
      </Card>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">{i.openIssues.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{i.openIssues.description}</p>
          </div>
          <OperatorIntegrationBadge connected={openIssues.length > 0 || isLoading} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : openIssues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i.openIssues.issue}</TableHead>
                  <TableHead>{i.openIssues.club}</TableHead>
                  <TableHead>{i.openIssues.severity}</TableHead>
                  <TableHead>{i.openIssues.lastSeen}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{issue.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {localizeIssueSource(issue.source, t)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link to={`/operator/clubs/${issue.club_id}`} className="text-primary hover:underline">
                        {issue.club_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={operatorSeverityBadgeVariant(issue.severity)}>
                        {formatOperatorSeverity(issue.severity, t)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(issue.last_seen_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState
              icon={AlertTriangle}
              title={i.openIssues.emptyTitle}
              description={i.openIssues.emptyDesc}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <IssuePlaceholderCard
          title={i.placeholders.recentErrors.title}
          description={i.placeholders.recentErrors.description}
          connected={data?.recent_errors.connected ?? false}
          isLoading={isLoading}
          icon={ServerCrash}
        />
        <IssuePlaceholderCard
          title={i.placeholders.failedApiRequests.title}
          description={i.placeholders.failedApiRequests.description}
          connected={data?.failed_api_requests.connected ?? false}
          isLoading={isLoading}
          icon={ServerCrash}
        />
        <IssuePlaceholderCard
          title={i.placeholders.failedEmailDelivery.title}
          description={emailDeliveryHint}
          connected={data?.failed_email_delivery.connected ?? false}
          isLoading={isLoading}
          icon={Mail}
        />
        <IssuePlaceholderCard
          title={i.placeholders.databaseWarnings.title}
          description={i.placeholders.databaseWarnings.description}
          connected={data?.database_warnings.connected ?? false}
          isLoading={isLoading}
          icon={Database}
        />
      </div>

      {(data?.failed_notification_events.length ?? 0) > 0 ? (
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{i.failedNotifications.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i.failedNotifications.club}</TableHead>
                  <TableHead>{i.failedNotifications.error}</TableHead>
                  <TableHead>{i.failedNotifications.when}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.failed_notification_events.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link to={`/operator/clubs/${row.club_id}`} className="text-primary hover:underline">
                        {row.club_name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                      {row.last_error ?? i.failedNotifications.unknownError}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(row.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {i.footer.prefix}{" "}
        <Link to="/operator/audit" className="text-primary hover:underline">
          {i.footer.auditLink}
        </Link>
        {i.footer.middle}{" "}
        <Link to="/operator/performance" className="text-primary hover:underline">
          {i.footer.performanceLink}
        </Link>
        {i.footer.suffix}
      </div>
    </OperatorPageShell>
  );
}

function IssuePlaceholderCard({
  title,
  description,
  connected,
  isLoading,
  icon: Icon,
}: {
  title: string;
  description: string;
  connected: boolean;
  isLoading: boolean;
  icon: typeof AlertCircle;
}) {
  const { t } = useLanguage();
  const p = t.operator.issues.placeholders;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="font-display text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <OperatorIntegrationBadge connected={connected} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : connected ? (
          <p className="text-sm text-muted-foreground">{p.connectedFeed}</p>
        ) : (
          <OperatorSectionEmptyState
            icon={Icon}
            title={p.emptyTitle}
            description={p.emptyDesc}
          />
        )}
      </CardContent>
    </Card>
  );
}
