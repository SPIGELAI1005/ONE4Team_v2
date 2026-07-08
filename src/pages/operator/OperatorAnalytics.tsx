import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  Globe,
  QrCode,
  ShoppingBag,
  Store,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import { OperatorAnalyticsCohorts } from "@/components/operator/OperatorAnalyticsCohorts";
import { OperatorChartCard } from "@/components/operator/charts/OperatorChartCard";
import { SimpleBarChart } from "@/components/operator/charts/SimpleBarChart";
import { estimateInactiveClubs } from "@/lib/operator-analytics-cohorts";
import {
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import { useOperatorOverview } from "@/hooks/use-operator-overview";
import { useOperatorUsageAnalytics } from "@/hooks/use-operator-usage-analytics";
import { usePlatformCatalog } from "@/hooks/use-platform-catalog";
import type { Translations } from "@/i18n";
import {
  formatAdoptionRate,
  formatOverviewNumber,
  formatOverviewTimestamp,
  formatUsageEventName,
  type OperatorUsageClubRow,
  type OperatorUsageModuleByClubRow,
  type OperatorUsageModuleByPlanRow,
  type OperatorUsageModuleRow,
  type OperatorUsageRecentEventRow,
} from "@/lib/operator-usage-analytics";

const ALL_FILTER = "__all__";

const MODULE_FILTER_KEYS = [
  "dashboard",
  "members",
  "trainings",
  "matches",
  "events",
  "marketplace",
  "partners",
  "payments",
  "messages",
  "club_page",
  "ai4t",
  "settings",
] as const;

function getModuleFilterOptions(t: Translations) {
  const labels = t.operator.analytics.moduleFilters;
  return MODULE_FILTER_KEYS.map((key) => ({
    key,
    label: labels[key],
  }));
}

function toStartOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function defaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function ClubLinkCell({ row }: { row: OperatorUsageClubRow }) {
  return (
    <Link to={`/operator/clubs/${row.club_id}`} className="font-medium text-primary hover:underline">
      {row.club_name}
    </Link>
  );
}

function RankedList({
  title,
  rows,
  emptyTitle,
  emptyDescription,
  isLoading,
}: {
  title: string;
  rows: Array<{ key: string; label: string; value: string; hint?: string }>;
  emptyTitle: string;
  emptyDescription: string;
  isLoading: boolean;
}) {
  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{row.label}</div>
                  {row.hint ? <div className="truncate text-xs text-muted-foreground">{row.hint}</div> : null}
                </div>
                <Badge variant="secondary">{row.value}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OperatorAnalytics() {
  const { t } = useLanguage();
  const a = t.operator.analytics;
  const shell = t.operator.shell;
  const moduleFilterOptions = useMemo(() => getModuleFilterOptions(t), [t]);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [clubId, setClubId] = useState(ALL_FILTER);
  const [moduleKey, setModuleKey] = useState(ALL_FILTER);
  const [planKey, setPlanKey] = useState(ALL_FILTER);

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom ? toStartOfDayIso(dateFrom) : null,
      dateTo: dateTo ? toEndOfDayIso(dateTo) : null,
      clubId: clubId === ALL_FILTER ? null : clubId,
      moduleKey: moduleKey === ALL_FILTER ? null : moduleKey,
      planKey: planKey === ALL_FILTER ? null : planKey,
      limit: 10,
    }),
    [clubId, dateFrom, dateTo, moduleKey, planKey],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useOperatorUsageAnalytics(filters);
  const { data: overview } = useOperatorOverview();
  const { data: clubs = [] } = useOperatorClubs();
  const { plans } = usePlatformCatalog();

  const activeUsers = data?.active_users;
  const clubActivity = data?.club_activity;
  const moduleUsage = data?.module_usage;
  const featureAdoption = data?.feature_adoption;
  const tables = data?.tables;
  const totalActiveClubs = featureAdoption?.total_active_clubs ?? 0;

  const activeUsersBars = useMemo(
    () => [
      { key: "24h", label: a.charts.activeUsers24h, value: activeUsers?.last_24_hours ?? 0 },
      { key: "7d", label: a.charts.activeUsers7d, value: activeUsers?.last_7_days ?? 0 },
      { key: "30d", label: a.charts.activeUsers30d, value: activeUsers?.last_30_days ?? 0 },
      { key: "new30d", label: a.charts.newUsers30d, value: activeUsers?.new_users_last_30_days ?? 0 },
    ],
    [a.charts.activeUsers24h, a.charts.activeUsers30d, a.charts.activeUsers7d, a.charts.newUsers30d, activeUsers?.last_24_hours, activeUsers?.last_30_days, activeUsers?.last_7_days, activeUsers?.new_users_last_30_days],
  );

  const moduleUsageBars = useMemo(
    () =>
      (moduleUsage?.most_used ?? []).slice(0, 8).map((module: OperatorUsageModuleRow) => ({
        key: module.module_key,
        label: module.module_name,
        value: module.event_count ?? 0,
      })),
    [moduleUsage?.most_used],
  );

  if (isError) {
    return (
      <OperatorPageError
        title={a.loadErrorTitle}
        message={error instanceof Error ? error.message : a.loadErrorMessage}
      />
    );
  }

  const publicClubHint = a.featureAdoption.publicClubPageHint
    .replace("{published}", formatOverviewNumber(featureAdoption?.public_club_page.clubs_published ?? 0))
    .replace(
      "{rate}",
      formatAdoptionRate(featureAdoption?.public_club_page.clubs_with_usage ?? 0, totalActiveClubs),
    );

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={BarChart3}
        title={a.title}
        description={a.description}
        meta={
          isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {shell.updated} {formatOverviewTimestamp(data?.generated_at)}
            </span>
          )
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? shell.refreshing : shell.refresh}
          </Button>
        }
      />

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{a.filters.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="analytics-date-from">{a.filters.dateFrom}</Label>
            <Input id="analytics-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analytics-date-to">{a.filters.dateTo}</Label>
            <Input id="analytics-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{a.filters.club}</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger>
                <SelectValue placeholder={a.filters.allClubs} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{a.filters.allClubs}</SelectItem>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{a.filters.module}</Label>
            <Select value={moduleKey} onValueChange={setModuleKey}>
              <SelectTrigger>
                <SelectValue placeholder={a.filters.allModules} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{a.filters.allModules}</SelectItem>
                {moduleFilterOptions.map((module) => (
                  <SelectItem key={module.key} value={module.key}>
                    {module.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{a.filters.plan}</Label>
            <Select value={planKey} onValueChange={setPlanKey}>
              <SelectTrigger>
                <SelectValue placeholder={a.filters.allPlans} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{a.filters.allPlans}</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.key} value={plan.key}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{a.sections.activeUsers}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard
            label={a.activeUsers.last24h}
            value={activeUsers?.last_24_hours}
            hint={a.activeUsers.last24hHint}
            icon={Activity}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.activeUsers.last7d}
            value={activeUsers?.last_7_days}
            icon={Users}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.activeUsers.last30d}
            value={activeUsers?.last_30_days}
            icon={Users}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.activeUsers.newUsers30d}
            value={activeUsers?.new_users_last_30_days}
            hint={a.activeUsers.newUsers30dHint}
            icon={UserPlus}
            isLoading={isLoading}
          />
        </div>
        <OperatorChartCard
          title={a.charts.activeUsersChartTitle}
          isLoading={isLoading}
          hasData={activeUsersBars.some((bar) => bar.value > 0)}
          emptyTitle={a.charts.activeUsersEmptyTitle}
          emptyDescription={a.charts.activeUsersEmptyDesc}
        >
          <SimpleBarChart data={activeUsersBars} valueFormatter={(value) => formatOverviewNumber(value)} />
        </OperatorChartCard>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{a.sections.clubActivity}</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <RankedList
            title={a.clubActivity.mostActiveTitle}
            isLoading={isLoading}
            emptyTitle={a.clubActivity.mostActiveEmptyTitle}
            emptyDescription={a.clubActivity.mostActiveEmptyDesc}
            rows={(clubActivity?.most_active_clubs ?? []).map((club) => ({
              key: club.club_id,
              label: club.club_name,
              value: formatOverviewNumber(club.event_count ?? 0),
              hint: club.club_slug,
            }))}
          />
          <RankedList
            title={a.clubActivity.recentlyActiveTitle}
            isLoading={isLoading}
            emptyTitle={a.clubActivity.recentlyActiveEmptyTitle}
            emptyDescription={a.clubActivity.recentlyActiveEmptyDesc}
            rows={(clubActivity?.recently_active_clubs ?? []).map((club) => ({
              key: club.club_id,
              label: club.club_name,
              value: formatOverviewTimestamp(club.last_activity_at),
              hint: a.clubActivity.eventsHint.replace("{count}", formatOverviewNumber(club.event_count ?? 0)),
            }))}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <RankedList
            title={a.clubActivity.inactiveTitle}
            isLoading={isLoading}
            emptyTitle={a.clubActivity.inactiveEmptyTitle}
            emptyDescription={a.clubActivity.inactiveEmptyDesc}
            rows={(clubActivity?.inactive_clubs ?? []).map((club) => ({
              key: club.club_id,
              label: club.club_name,
              value: a.clubActivity.noActivity,
              hint: club.club_slug,
            }))}
          />
          <OperatorMetricCard
            label={a.clubActivity.noActivity30dLabel}
            value={clubActivity?.no_activity_30_days_count}
            hint={a.clubActivity.noActivity30dHint.replace("{total}", formatOverviewNumber(totalActiveClubs))}
            icon={Building2}
            tone={(clubActivity?.no_activity_30_days_count ?? 0) > 0 ? "warning" : "default"}
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{a.sections.moduleUsage}</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <RankedList
            title={a.moduleUsage.mostUsedTitle}
            isLoading={isLoading}
            emptyTitle={a.moduleUsage.emptyTitle}
            emptyDescription={a.moduleUsage.mostUsedEmptyDesc}
            rows={(moduleUsage?.most_used ?? []).map((module: OperatorUsageModuleRow) => ({
              key: module.module_key,
              label: module.module_name,
              value: formatOverviewNumber(module.event_count),
            }))}
          />
          <RankedList
            title={a.moduleUsage.leastUsedTitle}
            isLoading={isLoading}
            emptyTitle={a.moduleUsage.emptyTitle}
            emptyDescription={a.moduleUsage.leastUsedEmptyDesc}
            rows={(moduleUsage?.least_used ?? []).map((module: OperatorUsageModuleRow) => ({
              key: module.module_key,
              label: module.module_name,
              value: formatOverviewNumber(module.event_count),
            }))}
          />
        </div>
        <OperatorChartCard
          title={a.charts.moduleUsageChartTitle}
          isLoading={isLoading}
          hasData={moduleUsageBars.length > 0}
          emptyTitle={a.charts.moduleUsageEmptyTitle}
          emptyDescription={a.charts.moduleUsageEmptyDesc}
        >
          <SimpleBarChart data={moduleUsageBars} valueFormatter={(value) => formatOverviewNumber(value)} />
        </OperatorChartCard>
        <div className="grid gap-5 xl:grid-cols-2">
          <ModuleByPlanTable rows={moduleUsage?.by_plan ?? []} isLoading={isLoading} />
          <ModuleByClubTable rows={moduleUsage?.by_club ?? []} isLoading={isLoading} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{a.sections.featureAdoption}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <OperatorMetricCard
            label={a.featureAdoption.publicClubPage}
            value={featureAdoption?.public_club_page.clubs_with_usage}
            hint={publicClubHint}
            icon={Globe}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.featureAdoption.marketplace}
            value={featureAdoption?.marketplace.clubs_count}
            hint={formatAdoptionRate(featureAdoption?.marketplace.clubs_count ?? 0, totalActiveClubs)}
            icon={Store}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.featureAdoption.tournament}
            value={featureAdoption?.tournament.clubs_count}
            hint={formatAdoptionRate(featureAdoption?.tournament.clubs_count ?? 0, totalActiveClubs)}
            icon={Trophy}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.featureAdoption.qrCode}
            value={featureAdoption?.qr_code.clubs_count}
            hint={formatAdoptionRate(featureAdoption?.qr_code.clubs_count ?? 0, totalActiveClubs)}
            icon={QrCode}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={a.featureAdoption.partnerManagement}
            value={featureAdoption?.partner_management.clubs_count}
            hint={formatAdoptionRate(featureAdoption?.partner_management.clubs_count ?? 0, totalActiveClubs)}
            icon={ShoppingBag}
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{a.sections.activityTables}</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <TopClubsTable rows={tables?.top_clubs ?? []} isLoading={isLoading} />
          <TopModulesTable rows={tables?.top_modules ?? []} isLoading={isLoading} />
        </div>
        <RecentEventsTable rows={tables?.recent_events ?? []} isLoading={isLoading} />
      </section>

      <OperatorAnalyticsCohorts
        totalActiveClubs={totalActiveClubs}
        trialClubsEstimate={overview?.metrics.trial_clubs ?? 0}
        payingClubsEstimate={overview?.metrics.paying_clubs ?? 0}
        inactiveClubsEstimate={
          clubActivity?.no_activity_30_days_count ??
          estimateInactiveClubs(clubs.length, totalActiveClubs)
        }
        isLoading={isLoading}
      />
    </OperatorPageShell>
  );
}

function TopClubsTable({ rows, isLoading }: { rows: OperatorUsageClubRow[]; isLoading: boolean }) {
  const { t } = useLanguage();
  const tbl = t.operator.analytics.tables;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{tbl.topClubsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={tbl.topClubsEmptyTitle} description={tbl.topClubsEmptyDesc} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tbl.club}</TableHead>
                <TableHead className="text-right">{tbl.events}</TableHead>
                <TableHead className="text-right">{tbl.lastActivity}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.club_id}>
                  <TableCell>
                    <ClubLinkCell row={row} />
                  </TableCell>
                  <TableCell className="text-right">{formatOverviewNumber(row.event_count ?? 0)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatOverviewTimestamp(row.last_activity_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TopModulesTable({ rows, isLoading }: { rows: OperatorUsageModuleRow[]; isLoading: boolean }) {
  const { t } = useLanguage();
  const tbl = t.operator.analytics.tables;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{tbl.topModulesTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={tbl.topModulesEmptyTitle} description={tbl.topModulesEmptyDesc} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tbl.module}</TableHead>
                <TableHead className="text-right">{tbl.opens}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.module_key}>
                  <TableCell>{row.module_name}</TableCell>
                  <TableCell className="text-right">{formatOverviewNumber(row.event_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleByPlanTable({ rows, isLoading }: { rows: OperatorUsageModuleByPlanRow[]; isLoading: boolean }) {
  const { t } = useLanguage();
  const tbl = t.operator.analytics.tables;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{tbl.moduleByPlanTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={tbl.moduleByPlanEmptyTitle} description={tbl.moduleByPlanEmptyDesc} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tbl.plan}</TableHead>
                <TableHead>{tbl.module}</TableHead>
                <TableHead className="text-right">{tbl.opens}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.plan_key}-${row.module_key}`}>
                  <TableCell>{row.plan_name}</TableCell>
                  <TableCell>{row.module_name}</TableCell>
                  <TableCell className="text-right">{formatOverviewNumber(row.event_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleByClubTable({ rows, isLoading }: { rows: OperatorUsageModuleByClubRow[]; isLoading: boolean }) {
  const { t } = useLanguage();
  const tbl = t.operator.analytics.tables;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{tbl.moduleByClubTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={tbl.moduleByClubEmptyTitle} description={tbl.moduleByClubEmptyDesc} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tbl.club}</TableHead>
                <TableHead>{tbl.module}</TableHead>
                <TableHead className="text-right">{tbl.opens}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.club_id}-${row.module_key}`}>
                  <TableCell>
                    <Link to={`/operator/clubs/${row.club_id}`} className="text-primary hover:underline">
                      {row.club_name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.module_name}</TableCell>
                  <TableCell className="text-right">{formatOverviewNumber(row.event_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventsTable({ rows, isLoading }: { rows: OperatorUsageRecentEventRow[]; isLoading: boolean }) {
  const { t } = useLanguage();
  const tbl = t.operator.analytics.tables;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{tbl.recentEventsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={tbl.recentEventsEmptyTitle} description={tbl.recentEventsEmptyDesc} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tbl.when}</TableHead>
                <TableHead>{tbl.event}</TableHead>
                <TableHead>{tbl.club}</TableHead>
                <TableHead>{tbl.module}</TableHead>
                <TableHead>{tbl.route}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatOverviewTimestamp(row.created_at)}
                  </TableCell>
                  <TableCell>{formatUsageEventName(row.event_name)}</TableCell>
                  <TableCell>{row.club_name ?? "—"}</TableCell>
                  <TableCell>{row.module_key ?? "—"}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground">{row.route ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
