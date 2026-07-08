import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Layers3,
  ShieldCheck,
  Swords,
  Users,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import { OperatorActionQueue } from "@/components/operator/OperatorActionQueue";
import { OperatorChartCard } from "@/components/operator/charts/OperatorChartCard";
import { ClubGrowthArea } from "@/components/operator/charts/ClubGrowthArea";
import { CategoryPie } from "@/components/operator/charts/CategoryPie";
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
import { formatOverviewTimestamp, operatorSeverityBadgeVariant } from "@/lib/operator-formatters";
import { localizeOverviewHealth } from "@/lib/platform-overview";

function monthKeyFromIso(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function addMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return `${next.year}-${String(next.month).padStart(2, "0")}`;
}

function buildClubGrowthSeries(
  createdAtIso: string[],
  nowIso: string = new Date().toISOString(),
): Array<{ month: string; totalClubs: number }> {
  const counts = new Map<string, number>();
  for (const iso of createdAtIso) {
    const key = monthKeyFromIso(iso);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const months = [...counts.keys()].sort();
  if (months.length === 0) return [];

  const startMonth = months[0];
  const endMonth = monthKeyFromIso(nowIso) ?? months[months.length - 1];
  const lastMonth = endMonth < startMonth ? months[months.length - 1] : endMonth;

  const series: Array<{ month: string; totalClubs: number }> = [];
  let running = 0;
  for (let month = startMonth; month <= lastMonth; month = addMonth(month)) {
    running += counts.get(month) ?? 0;
    series.push({ month, totalClubs: running });
  }
  return series;
}

function healthBadgeVariant(status: "operational" | "attention" | "degraded") {
  if (status === "operational") return "default";
  if (status === "attention") return "secondary";
  return "destructive";
}

export default function OperatorOverview() {
  const { t } = useLanguage();
  const { data, isLoading, isError, error } = useOperatorOverview();
  const { data: clubs = [] } = useOperatorClubs();
  const o = t.operator.overview;
  const m = o.metrics;
  const h = o.health;

  const metrics = data?.metrics;
  const growthSeries = useMemo(() => buildClubGrowthSeries(clubs.map((club) => club.created_at)), [clubs]);

  const statusSlices = useMemo(() => {
    const active = metrics?.active_clubs ?? 0;
    const suspended = metrics?.suspended_clubs ?? 0;
    const total = metrics?.total_clubs ?? 0;
    const other = Math.max(0, total - active - suspended);
    return [
      { key: "active", label: o.charts.statusActive, value: active, color: "hsl(var(--primary))" },
      { key: "suspended", label: o.charts.statusSuspended, value: suspended, color: "hsl(var(--destructive))" },
      { key: "other", label: o.charts.statusOther, value: other, color: "hsl(var(--muted-foreground))" },
    ].filter((slice) => slice.value > 0);
  }, [metrics?.active_clubs, metrics?.suspended_clubs, metrics?.total_clubs, o.charts.statusActive, o.charts.statusOther, o.charts.statusSuspended]);

  if (isError) {
    return (
      <OperatorPageError
        title={o.loadErrorTitle}
        message={error instanceof Error ? error.message : o.loadErrorMessage}
      />
    );
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={LayoutDashboard}
        title={o.title}
        description={o.description}
        meta={
          isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.operator.shell.updated} {formatOverviewTimestamp(data?.generated_at)}
            </span>
          )
        }
      />

      <OperatorActionQueue data={data} isLoading={isLoading} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperatorMetricCard label={m.totalClubs} value={metrics?.total_clubs} icon={Building2} isLoading={isLoading} href="/operator/clubs" />
        <OperatorMetricCard label={m.activeClubs} value={metrics?.active_clubs} icon={ShieldCheck} tone="success" isLoading={isLoading} href="/operator/clubs?status=ACTIVE" />
        <OperatorMetricCard label={m.trialClubs} value={metrics?.trial_clubs} icon={CreditCard} isLoading={isLoading} href="/operator/clubs?billing=trialing" />
        <OperatorMetricCard label={m.payingClubs} value={metrics?.paying_clubs} icon={CreditCard} tone="success" isLoading={isLoading} href="/operator/clubs?billing=active" />
        <OperatorMetricCard label={m.suspendedClubs} value={metrics?.suspended_clubs} icon={AlertTriangle} tone="warning" isLoading={isLoading} href="/operator/clubs?status=SUSPENDED" />
        <OperatorMetricCard label={m.totalUsers} value={metrics?.total_users} icon={Users} isLoading={isLoading} href="/operator/users" />
        <OperatorMetricCard
          label={m.activeUsers7d}
          value={metrics?.active_users_last_7_days}
          hint={m.activeUsers7dHint}
          icon={Activity}
          isLoading={isLoading}
        />
        <OperatorMetricCard label={m.totalTeams} value={metrics?.total_teams} icon={UsersRound} isLoading={isLoading} />
        <OperatorMetricCard label={m.totalEvents} value={metrics?.total_events} icon={CalendarDays} isLoading={isLoading} />
        <OperatorMetricCard label={m.totalMatches} value={metrics?.total_matches} icon={Swords} isLoading={isLoading} />
        <OperatorMetricCard
          label={m.mostUsedModule}
          value={metrics?.most_used_module?.name ?? m.noUsageYet}
          hint={
            metrics?.most_used_module
              ? m.moduleUsageHint.replace("{count}", String(metrics.most_used_module.usage_count))
              : m.moduleUsageEmpty
          }
          icon={Layers3}
          isLoading={isLoading}
        />
        <OperatorMetricCard
          label={m.recentIssues}
          value={metrics?.recent_issues}
          icon={AlertTriangle}
          tone={(metrics?.recent_issues ?? 0) > 0 ? "warning" : "default"}
          isLoading={isLoading}
          href="/operator/issues"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <OperatorChartCard
          title={o.charts.clubGrowthTitle}
          isLoading={isLoading}
          hasData={growthSeries.length > 1}
          emptyTitle={o.charts.clubGrowthEmptyTitle}
          emptyDescription={o.charts.clubGrowthEmptyDesc}
        >
          <ClubGrowthArea data={growthSeries} formatter={(value) => String(value)} />
        </OperatorChartCard>

        <OperatorChartCard
          title={o.charts.clubStatusTitle}
          isLoading={isLoading}
          hasData={statusSlices.length > 0}
          emptyTitle={o.charts.clubStatusEmptyTitle}
          emptyDescription={o.charts.clubStatusEmptyDesc}
        >
          <CategoryPie data={statusSlices} formatter={(value) => String(value)} />
        </OperatorChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-lg">{h.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)
            ) : data?.health.length ? (
              data.health.map((item) => {
                const localized = localizeOverviewHealth(item, t);
                return (
                  <div key={item.label} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div>
                      <div className="font-medium text-foreground">{localized.label}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{localized.description}</p>
                    </div>
                    <Badge variant={healthBadgeVariant(item.status)}>{h[item.status]}</Badge>
                  </div>
                );
              })
            ) : (
              <OperatorSectionEmptyState icon={ShieldCheck} title={h.emptyTitle} description={h.emptyDesc} />
            )}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-lg">{o.moduleUsage.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : data?.module_usage.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{o.moduleUsage.module}</TableHead>
                    <TableHead className="text-right">{o.moduleUsage.activeClubs}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.module_usage.map((module) => (
                    <TableRow key={module.key}>
                      <TableCell>
                        <div className="font-medium text-foreground">{module.name}</div>
                        <div className="text-xs text-muted-foreground">{module.key}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{module.usage_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <OperatorSectionEmptyState
                icon={Layers3}
                title={o.moduleUsage.emptyTitle}
                description={o.moduleUsage.emptyDesc}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-lg">{o.clubGrowth.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ClubGrowthTable
              title={o.clubGrowth.recentlyCreated}
              rows={data?.recent_created_clubs ?? []}
              isLoading={isLoading}
              clubLabel={o.clubGrowth.club}
              statusLabel={o.clubGrowth.status}
              dateLabel={o.clubGrowth.created}
              emptyTitle={o.clubGrowth.createdEmptyTitle}
              emptyDescription={o.clubGrowth.createdEmptyDesc}
            />
            <ClubGrowthTable
              title={o.clubGrowth.recentlyActive}
              rows={data?.recent_active_clubs ?? []}
              isLoading={isLoading}
              dateField="updated_at"
              clubLabel={o.clubGrowth.club}
              statusLabel={o.clubGrowth.status}
              dateLabel={o.clubGrowth.updated}
              emptyTitle={o.clubGrowth.activeEmptyTitle}
              emptyDescription={o.clubGrowth.activeEmptyDesc}
            />
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="font-display text-lg">{o.audit.title}</CardTitle>
            <Link to="/operator/audit" className="text-sm font-medium text-primary hover:underline">
              {o.audit.viewAll}
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : data?.recent_audit.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{o.audit.action}</TableHead>
                    <TableHead>{o.audit.actor}</TableHead>
                    <TableHead>{o.audit.when}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_audit.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{entry.action}</div>
                        <div className="text-xs text-muted-foreground">{entry.entity_type ?? o.audit.platform}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.actor_email ?? entry.actor_role ?? o.audit.system}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatOverviewTimestamp(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <OperatorSectionEmptyState icon={ShieldCheck} title={o.audit.emptyTitle} description={o.audit.emptyDesc} />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="font-display text-lg">{o.issues.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : data?.recent_issues.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{o.issues.issue}</TableHead>
                  <TableHead>{o.issues.severity}</TableHead>
                  <TableHead>{o.issues.status}</TableHead>
                  <TableHead>{o.issues.lastSeen}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{issue.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.source}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={operatorSeverityBadgeVariant(issue.severity)}>{issue.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(issue.last_seen_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={AlertTriangle} title={o.issues.emptyTitle} description={o.issues.emptyDesc} />
          )}
        </CardContent>
      </Card>
    </OperatorPageShell>
  );
}

interface ClubGrowthTableProps {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  isLoading: boolean;
  dateField?: "created_at" | "updated_at";
  clubLabel: string;
  statusLabel: string;
  dateLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

function ClubGrowthTable({
  title,
  rows,
  isLoading,
  dateField = "created_at",
  clubLabel,
  statusLabel,
  dateLabel,
  emptyTitle,
  emptyDescription,
}: ClubGrowthTableProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{clubLabel}</TableHead>
              <TableHead>{statusLabel}</TableHead>
              <TableHead>{dateLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((club) => (
              <TableRow key={`${title}-${club.id}`}>
                <TableCell>
                  <Link to={`/operator/clubs/${club.id}`} className="font-medium text-primary hover:underline">
                    <div>{club.name}</div>
                  </Link>
                  <div className="text-xs text-muted-foreground">{club.slug}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{club.status}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatOverviewTimestamp(club[dateField])}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <OperatorSectionEmptyState icon={Building2} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
