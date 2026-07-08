import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Shield, UserCog, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { usePlatformUsers } from "@/hooks/use-platform-users";
import { formatSupportPlatformRole } from "@/lib/operator-enhancements";
import {
  createPlatformUser,
  formatOverviewTimestamp,
  formatPlatformUserStatus,
  invitePlatformUser,
  localizeSettingsError,
  PLATFORM_USER_ROLES,
  setPlatformUserStatus,
  updatePlatformUserRole,
  type PlatformUserRow,
} from "@/lib/operator-platform-users";
import type { OperatorRole } from "@/lib/operator-permissions";
import { operatorStatusBadgeVariant } from "@/lib/operator-formatters";
import type { Translations } from "@/i18n";

type PendingAction =
  | { type: "grant" }
  | { type: "invite" }
  | { type: "role"; user: PlatformUserRow; role: OperatorRole }
  | { type: "status"; user: PlatformUserRow; status: "ACTIVE" | "DISABLED" };

interface OperatorPlatformUsersTabProps {
  canManage: boolean;
}

function getDialogCopy(pending: PendingAction | null, t: Translations): { title: string; description: string } {
  const d = t.operator.settingsPage.platformUsers.dialogs;
  if (!pending) return { title: d.confirmChange, description: d.audited };

  if (pending.type === "grant") {
    return { title: d.grantTitle, description: d.grantDesc };
  }
  if (pending.type === "invite") {
    return { title: d.inviteTitle, description: d.inviteDesc };
  }
  if (pending.type === "role") {
    return {
      title: d.changeRoleTitle,
      description: d.changeRoleDesc
        .replace("{email}", pending.user.email)
        .replace("{role}", formatSupportPlatformRole(pending.role, t)),
    };
  }
  if (pending.status === "DISABLED") {
    return {
      title: d.disableTitle,
      description: d.disableDesc.replace("{email}", pending.user.email),
    };
  }
  return {
    title: d.enableTitle,
    description: d.enableDesc.replace("{email}", pending.user.email),
  };
}

export function OperatorPlatformUsersTab({ canManage }: OperatorPlatformUsersTabProps) {
  const { t } = useLanguage();
  const pu = t.operator.settingsPage.platformUsers;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = usePlatformUsers();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OperatorRole>("VIEWER");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      const trimmedReason = reason.trim();
      if (!trimmedReason) throw new Error("Reason is required.");

      if (action.type === "grant") {
        return createPlatformUser({ email: email.trim(), role, reason: trimmedReason });
      }
      if (action.type === "invite") {
        return invitePlatformUser({ email: email.trim(), role, reason: trimmedReason });
      }
      if (action.type === "role") {
        return updatePlatformUserRole({
          platformUserId: action.user.id,
          role: action.role,
          reason: trimmedReason,
        });
      }
      return setPlatformUserStatus({
        platformUserId: action.user.id,
        status: action.status,
        reason: trimmedReason,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      toast({ title: pu.toast.updated });
      closeDialog();
    },
    onError: (err: Error) => setFormError(localizeSettingsError(err.message, t)),
  });

  const readOnlyHint = useMemo(() => (canManage ? null : pu.readOnlyHint), [canManage, pu.readOnlyHint]);
  const dialogCopy = getDialogCopy(pending, t);

  function openGrantDialog() {
    setPending({ type: "grant" });
    setEmail("");
    setRole("VIEWER");
    setReason("");
    setFormError(null);
  }

  function openInviteDialog() {
    setPending({ type: "invite" });
    setEmail("");
    setRole("VIEWER");
    setReason("");
    setFormError(null);
  }

  function closeDialog() {
    setPending(null);
    setFormError(null);
    mutation.reset();
  }

  function handleConfirm() {
    if (!pending || !canManage) return;
    mutation.mutate(pending);
  }

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : pu.loadError}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg">{pu.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{pu.description}</p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openGrantDialog}>
                <UserCog className="mr-2 h-4 w-4" />
                {pu.grantExisting}
              </Button>
              <Button size="sm" onClick={openInviteDialog}>
                <MailPlus className="mr-2 h-4 w-4" />
                {pu.sendInvite}
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {readOnlyHint ? (
            <p className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {readOnlyHint}
            </p>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pu.table.name}</TableHead>
                  <TableHead>{pu.table.email}</TableHead>
                  <TableHead>{pu.table.role}</TableHead>
                  <TableHead>{pu.table.status}</TableHead>
                  <TableHead>{pu.table.created}</TableHead>
                  <TableHead>{pu.table.lastActive}</TableHead>
                  {canManage ? <TableHead className="text-right">{pu.table.actions}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatSupportPlatformRole(user.role, t)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={operatorStatusBadgeVariant(user.status)}>
                        {formatPlatformUserStatus(user.status, t)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(user.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(user.last_active_at)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) => {
                              setPending({ type: "role", user, role: value as OperatorRole });
                              setReason("");
                              setFormError(null);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[7.5rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORM_USER_ROLES.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {formatSupportPlatformRole(item, t)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPending({
                                type: "status",
                                user,
                                status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                              });
                              setReason("");
                              setFormError(null);
                            }}
                          >
                            <UserX className="mr-1 h-4 w-4" />
                            {user.status === "ACTIVE" ? pu.disable : pu.enable}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={Shield} title={pu.emptyTitle} description={pu.emptyDesc} />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>

          {(pending?.type === "grant" || pending?.type === "invite") && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="platform-user-email">{pu.dialogs.email}</Label>
                <Input
                  id="platform-user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={pu.dialogs.emailPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{pu.dialogs.platformRole}</Label>
                <Select value={role} onValueChange={(value) => setRole(value as OperatorRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_USER_ROLES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {formatSupportPlatformRole(item, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="platform-user-reason">{pu.dialogs.reason}</Label>
            <Textarea
              id="platform-user-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={pu.dialogs.reasonPlaceholder}
              rows={3}
            />
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>{pu.dialogs.cancel}</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={mutation.isPending || !canManage}>
              {pu.dialogs.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
