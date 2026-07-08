import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, HelpCircle, Mail, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OperatorInternalBanner,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import {
  useInviteDeliveryCheck,
  useSupportClubDiagnostics,
  useSupportUserDiagnostics,
} from "@/hooks/use-operator-enhancements";
import {
  formatSupportClubRole,
  formatSupportDeliveryStatus,
  formatSupportGenericStatus,
  formatSupportPlatformRole,
  formatSupportPlatformStatus,
  localizeInviteDeliveryNote,
  localizeSupportError,
} from "@/lib/operator-enhancements";
import { formatOverviewTimestamp, operatorStatusBadgeVariant } from "@/lib/operator-formatters";

const ALL_CLUBS = "__all__";

function SupportErrorCard({ message, fallback }: { message: unknown; fallback: string }) {
  const { t } = useLanguage();
  const text =
    message instanceof Error
      ? localizeSupportError(message.message, t)
      : fallback;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">{text}</CardContent>
    </Card>
  );
}

export default function OperatorSupport() {
  const { t } = useLanguage();
  const s = t.operator.support;
  const { data: clubs = [] } = useOperatorClubs();
  const [clubId, setClubId] = useState<string>("");
  const [userEmail, setUserEmail] = useState("");
  const [submittedUserEmail, setSubmittedUserEmail] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteClubId, setInviteClubId] = useState(ALL_CLUBS);
  const [submittedInviteEmail, setSubmittedInviteEmail] = useState<string | null>(null);

  const clubDiagnostics = useSupportClubDiagnostics(clubId || null);
  const userDiagnostics = useSupportUserDiagnostics(submittedUserEmail);
  const inviteCheck = useInviteDeliveryCheck(
    submittedInviteEmail,
    inviteClubId === ALL_CLUBS ? null : inviteClubId,
    Boolean(submittedInviteEmail),
  );

  return (
    <OperatorPageShell>
      <OperatorPageHeader icon={HelpCircle} title={s.title} description={s.description} />

      <OperatorInternalBanner>{s.banner}</OperatorInternalBanner>

      <Tabs defaultValue="club" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="club">{s.tabs.club}</TabsTrigger>
          <TabsTrigger value="user">{s.tabs.user}</TabsTrigger>
          <TabsTrigger value="invite">{s.tabs.invite}</TabsTrigger>
        </TabsList>

        <TabsContent value="club" className="mt-5 space-y-4">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">{s.club.selectTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{s.club.clubLabel}</Label>
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger>
                    <SelectValue placeholder={s.club.chooseClub} />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {!clubId ? (
            <OperatorSectionEmptyState
              icon={Building2}
              title={s.club.emptyTitle}
              description={s.club.emptyDesc}
            />
          ) : clubDiagnostics.isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : clubDiagnostics.isError ? (
            <SupportErrorCard message={clubDiagnostics.error} fallback={s.loadError} />
          ) : clubDiagnostics.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <DiagnosticCard title={s.club.profileTitle}>
                <DiagnosticRow label={s.club.name} value={clubDiagnostics.data.club.name} />
                <DiagnosticRow label={s.club.slug} value={clubDiagnostics.data.club.slug} />
                <DiagnosticRow
                  label={s.club.status}
                  value={formatSupportGenericStatus(clubDiagnostics.data.club.status, t)}
                />
                <DiagnosticRow label={s.club.plan} value={clubDiagnostics.data.plan_name ?? "—"} />
                <DiagnosticRow label={s.club.members} value={String(clubDiagnostics.data.member_count)} />
                <DiagnosticRow label={s.club.enabledModules} value={String(clubDiagnostics.data.enabled_modules)} />
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/operator/clubs/${clubDiagnostics.data.club.id}`}>{s.club.openClubDetail}</Link>
                  </Button>
                </div>
              </DiagnosticCard>
              <DiagnosticCard title={s.club.signalsTitle}>
                <DiagnosticRow label={s.club.expiredInvites7d} value={String(clubDiagnostics.data.failed_invites_7d)} />
                <DiagnosticRow label={s.club.openIssues} value={String(clubDiagnostics.data.open_issues)} />
                <DiagnosticRow
                  label={s.club.lastUpdated}
                  value={formatOverviewTimestamp(clubDiagnostics.data.club.updated_at)}
                />
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={clubDiagnostics.data.public_club_url} target="_blank" rel="noreferrer">
                      {s.club.publicClubPage}
                    </a>
                  </Button>
                </div>
              </DiagnosticCard>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="user" className="mt-5 space-y-4">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">{s.user.lookupTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="support-user-email">{s.user.email}</Label>
                <Input
                  id="support-user-email"
                  type="email"
                  placeholder={s.user.emailPlaceholder}
                  value={userEmail}
                  onChange={(event) => setUserEmail(event.target.value)}
                />
              </div>
              <Button
                className="sm:self-end"
                onClick={() => setSubmittedUserEmail(userEmail.trim() || null)}
                disabled={!userEmail.trim()}
              >
                <Search className="mr-2 h-4 w-4" />
                {s.user.runLookup}
              </Button>
            </CardContent>
          </Card>

          {!submittedUserEmail ? (
            <OperatorSectionEmptyState
              icon={UserRound}
              title={s.user.emptyTitle}
              description={s.user.emptyDesc}
            />
          ) : userDiagnostics.isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : userDiagnostics.isError ? (
            <SupportErrorCard message={userDiagnostics.error} fallback={s.loadError} />
          ) : userDiagnostics.data?.found === false ? (
            <OperatorSectionEmptyState
              icon={UserRound}
              title={s.user.notFoundTitle}
              description={s.user.notFoundDesc.replace("{email}", submittedUserEmail)}
            />
          ) : userDiagnostics.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <DiagnosticCard title={s.user.accountTitle}>
                <DiagnosticRow label={s.user.email} value={userDiagnostics.data.email} />
                <DiagnosticRow label={s.user.displayName} value={userDiagnostics.data.display_name ?? "—"} />
                <DiagnosticRow
                  label={s.user.platformRole}
                  value={formatSupportPlatformRole(userDiagnostics.data.platform_role, t)}
                />
                <DiagnosticRow
                  label={s.user.platformStatus}
                  value={formatSupportPlatformStatus(userDiagnostics.data.platform_status, t)}
                />
                <DiagnosticRow
                  label={s.user.profileUpdated}
                  value={formatOverviewTimestamp(userDiagnostics.data.profile_updated_at)}
                />
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/operator/users">{s.user.openUsersDirectory}</Link>
                  </Button>
                </div>
              </DiagnosticCard>
              <DiagnosticCard title={s.user.membershipsTitle}>
                {(userDiagnostics.data.clubs ?? []).length ? (
                  <div className="space-y-2">
                    {(userDiagnostics.data.clubs ?? []).map((club) => (
                      <div key={club.club_id} className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                        <Link to={`/operator/clubs/${club.club_id}`} className="font-medium text-primary hover:underline">
                          {club.club_name}
                        </Link>
                        <div className="mt-1 text-muted-foreground">
                          {formatSupportClubRole(club.role, t)} · {formatSupportGenericStatus(club.status, t)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{s.user.noMemberships}</p>
                )}
              </DiagnosticCard>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="invite" className="mt-5 space-y-4">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">{s.invite.checkTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{s.invite.email}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={s.invite.emailPlaceholder}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{s.invite.clubOptional}</Label>
                <Select value={inviteClubId} onValueChange={setInviteClubId}>
                  <SelectTrigger>
                    <SelectValue placeholder={s.invite.allClubs} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CLUBS}>{s.invite.allClubs}</SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="sm:col-span-2 sm:w-fit"
                onClick={() => setSubmittedInviteEmail(inviteEmail.trim() || null)}
                disabled={!inviteEmail.trim()}
              >
                <Mail className="mr-2 h-4 w-4" />
                {s.invite.checkInvites}
              </Button>
            </CardContent>
          </Card>

          {!submittedInviteEmail ? (
            <OperatorSectionEmptyState
              icon={Mail}
              title={s.invite.emptyTitle}
              description={s.invite.emptyDesc}
            />
          ) : inviteCheck.isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : inviteCheck.isError ? (
            <SupportErrorCard message={inviteCheck.error} fallback={s.loadError} />
          ) : inviteCheck.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <DiagnosticCard title={s.invite.recordsTitle}>
                {(inviteCheck.data.invites ?? []).length ? (
                  <div className="space-y-2">
                    {inviteCheck.data.invites.map((invite) => (
                      <div key={invite.id} className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                        <div className="font-medium text-foreground">{invite.club_name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant={operatorStatusBadgeVariant(invite.delivery_status)}>
                            {formatSupportDeliveryStatus(invite.delivery_status, t)}
                          </Badge>
                          <span className="text-muted-foreground">{formatSupportClubRole(invite.role, t)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s.invite.createdAt.replace("{date}", formatOverviewTimestamp(invite.created_at))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {localizeInviteDeliveryNote(invite.note, t)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{s.invite.noRecords}</p>
                )}
              </DiagnosticCard>
              <DiagnosticCard title={s.invite.failedNotificationsTitle}>
                {(inviteCheck.data.failed_notifications_7d ?? []).length ? (
                  <div className="space-y-2">
                    {inviteCheck.data.failed_notifications_7d.map((event) => (
                      <div key={event.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm">
                        <div className="font-medium text-foreground">{event.club_name}</div>
                        <div className="mt-1 text-xs text-destructive">{event.last_error}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{s.invite.noFailedNotifications}</p>
                )}
              </DiagnosticCard>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </OperatorPageShell>
  );
}

function DiagnosticCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
