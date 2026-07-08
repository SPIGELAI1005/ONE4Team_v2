import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  Layers3,
  Shield,
  Swords,
  Users,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import { OperatorClubModulesTab } from "@/components/operator/OperatorClubModulesTab";
import { OperatorClubOverviewControls } from "@/components/operator/OperatorClubOverviewControls";
import { OperatorClubSupportNotesTab } from "@/components/operator/OperatorClubSupportNotesTab";
import {
  OperatorInternalBanner,
  OperatorPageError,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { useOperatorClubDetail } from "@/hooks/use-operator-club-detail";
import type {
  OperatorClubDetail,
  OperatorClubDetailAudit,
  OperatorClubDetailUser,
} from "@/lib/operator-club-detail";
import { formatOverviewNumber, formatOverviewTimestamp } from "@/lib/operator-club-detail";
import { hasOperatorPermission } from "@/lib/operator-permissions";
import { getClubUsageSummary } from "@/lib/usage-events";

function statusBadgeVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE" || normalized === "active") return "default";
  if (normalized === "SUSPENDED" || normalized === "past_due") return "destructive";
  if (normalized === "DISABLED" || normalized === "cancelled") return "secondary";
  return "outline";
}

export default function OperatorClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { data, isLoading, isError, error } = useOperatorClubDetail(clubId);
  const { access, role } = useOperatorAccess();
  const canManageModules = hasOperatorPermission(access, "operator.modules.manage");
  const canManageClubs = hasOperatorPermission(access, "operator.clubs.manage");
  const isOwner = role === "OWNER";

  if (!clubId) {
    return <OperatorClubDetailError message="Missing club identifier." />;
  }

  if (isError) {
    return (
      <OperatorPageError
        title="Unable to load club detail"
        message={error instanceof Error ? error.message : "Unable to load club detail."}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/operator/clubs">Back to clubs</Link>
          </Button>
        }
      />
    );
  }

  return (
    <OperatorPageShell>
      <ClubDetailHeader data={data} isLoading={isLoading} />

      <OperatorInternalBanner>
        Internal ONE4Team operator view. This page is not part of the club admin dashboard and is never visible to
        club users.
      </OperatorInternalBanner>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="support-notes">Support Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab
            clubId={clubId}
            data={data}
            isLoading={isLoading}
            canManageClubs={canManageClubs}
          />
        </TabsContent>
        <TabsContent value="modules" className="mt-5">
          <OperatorClubModulesTab
            clubId={clubId}
            clubName={data?.club.name ?? "Club"}
            modules={data?.modules ?? []}
            isLoading={isLoading}
            canManage={canManageModules}
            isOwner={isOwner}
          />
        </TabsContent>
        <TabsContent value="users" className="mt-5">
          <UsersTab users={data?.users ?? []} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="usage" className="mt-5">
          <UsageTab data={data} clubId={clubId} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="audit" className="mt-5">
          <AuditTab audit={data?.audit ?? []} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="support-notes" className="mt-5">
          <OperatorClubSupportNotesTab clubId={clubId} clubName={data?.club.name ?? "Club"} />
        </TabsContent>
      </Tabs>
    </OperatorPageShell>
  );
}

function ClubDetailHeader({ data, isLoading }: { data: OperatorClubDetail | undefined; isLoading: boolean }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-6">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/operator/clubs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to clubs
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="mt-3 h-5 w-80" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-foreground">{data?.club.name}</h1>
                  <Badge variant={statusBadgeVariant(data?.club.status ?? "")}>{data?.club.status}</Badge>
                  {data?.plan ? (
                    <Badge variant="secondary">{data.plan.name}</Badge>
                  ) : (
                    <Badge variant="outline">No plan</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Created {formatOverviewTimestamp(data?.club.created_at)} · Last activity{" "}
                  {formatOverviewTimestamp(data?.club.last_activity_at)}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : data?.public_url ? (
            <Button asChild variant="outline" size="sm">
              <Link to={data.public_url} target="_blank" rel="noreferrer">
                Public club page
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Badge variant="outline">Public page unavailable</Badge>
          )}
        </div>
      </div>
    </section>
  );
}

function OverviewTab({
  clubId,
  data,
  isLoading,
  canManageClubs,
}: {
  clubId: string;
  data: OperatorClubDetail | undefined;
  isLoading: boolean;
  canManageClubs: boolean;
}) {
  return (
    <div className="space-y-5">
      <OperatorClubOverviewControls
        clubId={clubId}
        data={data}
        modules={data?.modules ?? []}
        canManage={canManageClubs}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperatorMetricCard label="Users" value={data?.metrics.users} icon={Users} isLoading={isLoading} />
        <OperatorMetricCard label="Teams" value={data?.metrics.teams} icon={UsersRound} isLoading={isLoading} />
        <OperatorMetricCard label="Events" value={data?.metrics.events} icon={CalendarDays} isLoading={isLoading} />
        <OperatorMetricCard label="Matches" value={data?.metrics.matches} icon={Swords} isLoading={isLoading} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-lg">Basic club information</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoItem label="Club ID" value={data?.club.id ?? "—"} />
                <InfoItem label="Slug" value={data?.club.slug ?? "—"} />
                <InfoItem label="Status" value={data?.club.status ?? "—"} />
                <InfoItem label="Plan" value={data?.plan?.name ?? "—"} />
                <InfoItem label="Billing status" value={data?.plan?.billing_status ?? "—"} />
                <InfoItem label="Email" value={data?.club.email ?? "—"} />
                <InfoItem label="Phone" value={data?.club.phone ?? "—"} />
                <InfoItem label="Public" value={data?.club.is_public ? "Yes" : "No"} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-lg">Active modules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : data?.active_modules.length ? (
              <div className="flex flex-wrap gap-2">
                {data.active_modules.map((module) => (
                  <Badge key={module.key} variant="secondary">
                    {module.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <OperatorSectionEmptyState
                icon={Layers3}
                title="No active modules"
                description="Enabled modules for this club will appear here once entitlements are recorded."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : data?.recent_activity.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_activity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{entry.action}</div>
                      <div className="text-xs text-muted-foreground">{entry.entity_type ?? "club"}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.actor_email ?? "System"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(entry.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState
              icon={Shield}
              title="No recent activity"
              description="Audit events and platform changes for this club will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ users, isLoading }: { users: OperatorClubDetailUser[]; isLoading: boolean }) {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="font-display text-lg">Club users</CardTitle>
        <p className="text-sm text-muted-foreground">
          Users connected to this club through memberships. Last active uses profile update timestamps until dedicated
          login activity exists.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : users.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.membership_id}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatOverviewTimestamp(user.last_active_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <OperatorSectionEmptyState
            icon={Users}
            title="No users connected"
            description="Club memberships will appear here once users join this club."
          />
        )}
      </CardContent>
    </Card>
  );
}

function UsageTab({
  data,
  clubId,
  isLoading,
}: {
  data: OperatorClubDetail | undefined;
  clubId: string;
  isLoading: boolean;
}) {
  const usage = data?.usage;
  const usageSummaryQuery = useQuery({
    queryKey: ["operator-club-usage-summary", clubId],
    queryFn: () => getClubUsageSummary(clubId),
    enabled: Boolean(clubId),
  });
  const trackedUsage = usageSummaryQuery.data;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Usage events are collected from product actions and page views. Metrics below combine tracked usage with
        existing entity counts where noted.
      </div>

      {usageSummaryQuery.isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {usageSummaryQuery.error instanceof Error
            ? usageSummaryQuery.error.message
            : "Unable to load tracked usage summary."}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <OperatorMetricCard
          label="Active users"
          value={trackedUsage?.active_users_last_7_days ?? usage?.active_users}
          hint="Distinct users with usage events in the last 7 days."
          icon={Users}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
        <OperatorMetricCard
          label="Module opens"
          value={trackedUsage?.module_opens_last_30_days ?? usage?.module_usage}
          hint="Module opened events in the last 30 days."
          icon={Layers3}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
        <OperatorMetricCard
          label="Events created"
          value={trackedUsage?.events_created ?? usage?.events_created}
          icon={CalendarDays}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
        <OperatorMetricCard
          label="Matches created"
          value={trackedUsage?.matches_created ?? usage?.matches_created}
          icon={Swords}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
        <OperatorMetricCard
          label="Public page views"
          value={formatOverviewNumber(trackedUsage?.public_page_views_last_30_days ?? 0)}
          hint="Public club page views in the last 30 days."
          icon={ExternalLink}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
        <OperatorMetricCard
          label="Last usage activity"
          value={formatOverviewTimestamp(trackedUsage?.last_event_at ?? null)}
          icon={CalendarDays}
          isLoading={isLoading || usageSummaryQuery.isLoading}
        />
      </section>
    </div>
  );
}

function AuditTab({ audit, isLoading }: { audit: OperatorClubDetailAudit[]; isLoading: boolean }) {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="font-display text-lg">Audit log</CardTitle>
        <p className="text-sm text-muted-foreground">Sensitive platform and club changes recorded for this club.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : audit.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{entry.action}</div>
                    {entry.reason ? <div className="text-xs text-muted-foreground">{entry.reason}</div> : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.actor_email ?? entry.actor_role ?? "System"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.entity_type ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatOverviewTimestamp(entry.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <OperatorSectionEmptyState
            icon={Shield}
            title="No audit entries for this club"
            description="Platform audit events scoped to this club will appear here."
          />
        )}
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-all text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function OperatorClubDetailError({ message }: { message: string }) {
  return (
    <OperatorPageError
      title="Unable to load club detail"
      message={message}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/operator/clubs">Back to clubs</Link>
        </Button>
      }
    />
  );
}
