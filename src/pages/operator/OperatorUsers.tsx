import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import {
  OperatorInternalBanner,
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import { useOperatorUserDetail } from "@/hooks/use-operator-user-detail";
import { useOperatorUsers } from "@/hooks/use-operator-users";
import type { Translations } from "@/i18n";
import {
  formatOperatorInvitationStatus,
  formatOperatorUserClubsSummary,
  formatOperatorUserStatus,
  formatOverviewTimestamp,
  formatUsageEventLabel,
  getOperatorUserDetailLevel,
  type OperatorUserDetail,
  type OperatorUserDetailLevel,
  type OperatorUserListEntry,
} from "@/lib/operator-users";

const ALL_FILTER = "__all__";
const PAGE_SIZE = 50;

function toStartOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function statusBadgeVariant(status: string) {
  if (status === "active") return "default";
  if (status === "inactive") return "secondary";
  if (status === "platform_only") return "outline";
  return "secondary";
}

function invitationBadgeVariant(status: string) {
  if (status === "pending") return "secondary";
  if (status === "accepted") return "default";
  if (status === "expired") return "destructive";
  return "outline";
}

function detailLevelHint(level: OperatorUserDetailLevel, t: Translations): string {
  return t.operator.users.detailLevel[level];
}

export default function OperatorUsers() {
  const { t } = useLanguage();
  const u = t.operator.users;
  const { role } = useOperatorAccess();
  const detailLevel = getOperatorUserDetailLevel(role);

  const [search, setSearch] = useState("");
  const [clubId, setClubId] = useState(ALL_FILTER);
  const [clubRole, setClubRole] = useState(ALL_FILTER);
  const [status, setStatus] = useState(ALL_FILTER);
  const [platformRole, setPlatformRole] = useState(ALL_FILTER);
  const [lastActiveFrom, setLastActiveFrom] = useState("");
  const [lastActiveTo, setLastActiveTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: search.trim() || null,
      clubId: clubId === ALL_FILTER ? null : clubId,
      clubRole: clubRole === ALL_FILTER ? null : clubRole,
      status: status === ALL_FILTER ? null : status,
      platformRole: platformRole === ALL_FILTER ? null : platformRole,
      lastActiveFrom: lastActiveFrom ? toStartOfDayIso(lastActiveFrom) : null,
      lastActiveTo: lastActiveTo ? toEndOfDayIso(lastActiveTo) : null,
      limit: PAGE_SIZE,
      offset,
    }),
    [clubId, clubRole, lastActiveFrom, lastActiveTo, offset, platformRole, search, status],
  );

  const { data, isLoading, isError, error } = useOperatorUsers(filters);
  const { data: clubs = [] } = useOperatorClubs();
  const { data: selectedUser, isLoading: isDetailLoading, isError: isDetailError, error: detailError } =
    useOperatorUserDetail(selectedUserId);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;
  const canGoBack = offset > 0;
  const canGoForward = offset + PAGE_SIZE < total;

  if (isError) {
    return (
      <OperatorPageError
        title={u.loadErrorTitle}
        message={error instanceof Error ? error.message : u.loadErrorMessage}
      />
    );
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Users}
        title={u.title}
        description={u.description}
        badge={<Badge variant="outline">{u.usersCount.replace("{count}", String(total))}</Badge>}
      />

      <OperatorInternalBanner>{detailLevelHint(detailLevel, t)}</OperatorInternalBanner>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{u.filters.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 xl:col-span-2">
            <Label htmlFor="users-search">{u.filters.searchLabel}</Label>
            <Input
              id="users-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder={u.filters.searchPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{u.filters.club}</Label>
            <Select
              value={clubId}
              onValueChange={(value) => {
                setClubId(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={u.filters.allClubs} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{u.filters.allClubs}</SelectItem>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{u.filters.clubRole}</Label>
            <Select
              value={clubRole}
              onValueChange={(value) => {
                setClubRole(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={u.filters.allRoles} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{u.filters.allRoles}</SelectItem>
                {(facets?.club_roles ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{u.filters.status}</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={u.filters.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{u.filters.allStatuses}</SelectItem>
                {(facets?.statuses ?? ["active", "inactive", "unassigned", "platform_only"]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatOperatorUserStatus(item as OperatorUserListEntry["status"], t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{u.filters.platformRole}</Label>
            <Select
              value={platformRole}
              onValueChange={(value) => {
                setPlatformRole(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={u.filters.allPlatformRoles} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{u.filters.allPlatformRoles}</SelectItem>
                {(facets?.platform_roles ?? ["OWNER", "OPERATOR", "SUPPORT", "VIEWER", "none"]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "none" ? u.filters.noPlatformRole : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="users-active-from">{u.filters.lastActiveFrom}</Label>
            <Input
              id="users-active-from"
              type="date"
              value={lastActiveFrom}
              onChange={(event) => {
                setLastActiveFrom(event.target.value);
                setOffset(0);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="users-active-to">{u.filters.lastActiveTo}</Label>
            <Input
              id="users-active-to"
              type="date"
              value={lastActiveTo}
              onChange={(event) => {
                setLastActiveTo(event.target.value);
                setOffset(0);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="font-display text-lg">{u.table.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!canGoBack} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>
              {u.table.previous}
            </Button>
            <Button variant="outline" size="sm" disabled={!canGoForward} onClick={() => setOffset((value) => value + PAGE_SIZE)}>
              {u.table.next}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{u.table.user}</TableHead>
                  <TableHead>{u.table.email}</TableHead>
                  <TableHead>{u.table.clubs}</TableHead>
                  <TableHead>{u.table.clubRoles}</TableHead>
                  <TableHead>{u.table.platformRole}</TableHead>
                  <TableHead>{u.table.status}</TableHead>
                  <TableHead>{u.table.created}</TableHead>
                  <TableHead>{u.table.lastActive}</TableHead>
                  <TableHead>{u.table.invite}</TableHead>
                  <TableHead className="text-right">{u.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.user_id}>
                    <TableCell className="font-medium text-foreground">{entry.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.email ?? "—"}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm">
                      {formatOperatorUserClubsSummary(entry.clubs, t)}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-sm text-muted-foreground">
                      {entry.club_roles || "—"}
                    </TableCell>
                    <TableCell>
                      {entry.platform_role ? (
                        <Badge variant="outline">{entry.platform_role}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(entry.status)}>{formatOperatorUserStatus(entry.status, t)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(entry.last_active_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invitationBadgeVariant(entry.invitation_status)}>
                        {formatOperatorInvitationStatus(entry.invitation_status, t)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={u.table.viewUser} onClick={() => setSelectedUserId(entry.user_id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={Users} title={u.empty.title} description={u.empty.desc} />
          )}
        </CardContent>
      </Card>

      <Sheet open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedUser?.display_name ?? u.detail.title}</SheetTitle>
            <SheetDescription>{u.detail.description}</SheetDescription>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isDetailError ? (
            <p className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {detailError instanceof Error ? detailError.message : u.detail.loadError}
            </p>
          ) : selectedUser ? (
            <UserDetailPanel user={selectedUser} t={t} />
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{u.detail.unavailable}</p>
          )}
        </SheetContent>
      </Sheet>
    </OperatorPageShell>
  );
}

function UserDetailPanel({ user, t }: { user: OperatorUserDetail; t: Translations }) {
  const d = t.operator.users.detail;

  return (
    <div className="mt-6 space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{d.profile}</h3>
        <DetailField label={d.name} value={user.display_name} />
        <DetailField label={d.email} value={user.email ?? "—"} />
        <DetailField label={d.accountStatus} value={formatOperatorUserStatus(user.status, t)} />
        <DetailField label={d.invitationStatus} value={formatOperatorInvitationStatus(user.invitation_status, t)} />
        <DetailField label={d.created} value={formatOverviewTimestamp(user.created_at)} />
        <DetailField label={d.lastActive} value={formatOverviewTimestamp(user.last_active_at)} />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{d.platformAccess}</h3>
        <DetailField label={d.platformRole} value={user.platform_role ?? d.none} />
        <DetailField label={d.platformStatus} value={user.platform_status ?? "—"} />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{d.clubMemberships}</h3>
        {user.clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.noClubMemberships}</p>
        ) : (
          <div className="space-y-2">
            {user.clubs.map((club) => (
              <div key={club.membership_id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="font-medium text-foreground">
                  <Link to={`/operator/clubs/${club.club_id}`} className="text-primary hover:underline">
                    {club.club_name}
                  </Link>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {d.role}: {club.role} · {d.membershipStatus}: {club.status}
                </div>
                {club.joined_at ? (
                  <div className="text-xs text-muted-foreground">
                    {d.joined.replace("{date}", formatOverviewTimestamp(club.joined_at))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{d.recentActivity}</h3>
        {user.recent_activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {user.recent_activity.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="text-sm font-medium text-foreground">{formatUsageEventLabel(event.event_name)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatOverviewTimestamp(event.created_at)}
                  {event.club_name ? ` · ${event.club_name}` : ""}
                  {event.module_key ? ` · ${event.module_key}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{d.recentAudit}</h3>
        {user.recent_audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.noAudit}</p>
        ) : (
          <div className="space-y-2">
            {user.recent_audit.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="text-sm font-medium text-foreground">{entry.action}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatOverviewTimestamp(entry.created_at)}
                  {entry.club_name ? ` · ${entry.club_name}` : ""}
                  {entry.entity_type ? ` · ${entry.entity_type}` : ""}
                </div>
                {entry.reason ? <div className="mt-1 text-xs text-muted-foreground">{entry.reason}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm text-foreground">{value}</div>
    </div>
  );
}
