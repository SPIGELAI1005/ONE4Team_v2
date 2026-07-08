import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { useToast } from "@/hooks/use-toast";
import type { OperatorClubDetail, OperatorClubDetailModule } from "@/lib/operator-club-detail";
import {
  formatClubLifecycleStatus,
  OPERATOR_CLUB_STATUSES,
  previewOperatorClubPlanChange,
  setOperatorClubPlan,
  setOperatorClubStatus,
  type OperatorClubLifecycleStatus,
  type OperatorClubPlanChangePreview,
} from "@/lib/operator-club-controls";
import { getPlatformPlans, type PlatformPlan } from "@/lib/platform-catalog";
import { operatorStatusBadgeVariant } from "@/lib/operator-formatters";

type PendingClubChange =
  | { type: "status"; status: OperatorClubLifecycleStatus }
  | { type: "plan"; planKey: string };

interface OperatorClubOverviewControlsProps {
  clubId: string;
  data: OperatorClubDetail | undefined;
  modules: OperatorClubDetailModule[];
  canManage: boolean;
}

function ModulePreviewList({ title, items }: { title: string; items: { key: string; name: string; source?: string }[] }) {
  if (!items.length) {
    return (
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">None</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        {items.map((item) => (
          <li key={`${title}-${item.key}`}>
            {item.name}
            {item.source ? <span className="text-muted-foreground"> · {item.source}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OperatorClubOverviewControls({
  clubId,
  data,
  modules,
  canManage,
}: OperatorClubOverviewControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingClubChange | null>(null);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<OperatorClubLifecycleStatus>("ACTIVE");
  const [draftPlanKey, setDraftPlanKey] = useState("");

  const plansQuery = useQuery({
    queryKey: ["platform-plans-options"],
    queryFn: getPlatformPlans,
    staleTime: 60_000,
  });

  const activePlans = (plansQuery.data ?? []).filter((plan: PlatformPlan) => plan.status === "ACTIVE");

  const previewQuery = useQuery({
    queryKey: ["operator-club-plan-preview", clubId, pending?.type === "plan" ? pending.planKey : null],
    queryFn: () => previewOperatorClubPlanChange(clubId, (pending as { type: "plan"; planKey: string }).planKey),
    enabled: pending?.type === "plan" && Boolean(pending.planKey),
  });

  const mutation = useMutation({
    mutationFn: async (change: PendingClubChange) => {
      const trimmedReason = reason.trim();
      if (!trimmedReason) throw new Error("Reason is required.");
      if (change.type === "status") {
        return setOperatorClubStatus({ clubId, status: change.status, reason: trimmedReason });
      }
      return setOperatorClubPlan({ clubId, planKey: change.planKey, reason: trimmedReason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["operator-club-detail", clubId] });
      toast({ title: "Club updated" });
      closeDialog();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  useEffect(() => {
    if (data?.club.status) {
      setDraftStatus(data.club.status as OperatorClubLifecycleStatus);
    }
    if (data?.plan?.key) {
      setDraftPlanKey(data.plan.key);
    }
  }, [data?.club.status, data?.plan?.key]);

  function closeDialog() {
    setPending(null);
    setReason("");
    setFormError(null);
    mutation.reset();
  }

  function openStatusDialog() {
    if (!canManage) return;
    setPending({ type: "status", status: draftStatus });
    setReason("");
    setFormError(null);
  }

  function openPlanDialog() {
    if (!canManage || !draftPlanKey) return;
    setPending({ type: "plan", planKey: draftPlanKey });
    setReason("");
    setFormError(null);
  }

  const preview = previewQuery.data as OperatorClubPlanChangePreview | undefined;

  return (
    <>
      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="font-display text-lg">Lifecycle controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Controlled club status and plan assignment. Every change requires confirmation, a reason, and creates an
            audit log entry.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {!canManage ? (
            <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Read-only. Only platform OWNER and OPERATOR roles can change club status or plan.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Club status
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={operatorStatusBadgeVariant(data?.club.status ?? "ACTIVE")}>
                  {formatClubLifecycleStatus(data?.club.status ?? "ACTIVE")}
                </Badge>
              </div>
              {canManage ? (
                <div className="mt-4 space-y-3">
                  <Select
                    value={draftStatus}
                    onValueChange={(value) => setDraftStatus(value as OperatorClubLifecycleStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_CLUB_STATUSES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={draftStatus === data?.club.status}
                    onClick={openStatusDialog}
                  >
                    Update status
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Club plan
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{data?.plan?.name ?? "No plan"}</span>
              </div>
              {canManage ? (
                <div className="mt-4 space-y-3">
                  <Select value={draftPlanKey} onValueChange={setDraftPlanKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.key}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!draftPlanKey || draftPlanKey === data?.plan?.key}
                    onClick={openPlanDialog}
                  >
                    Update plan
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Active modules: {modules.filter((module) => module.enabled).length} · Manual overrides:{" "}
            {modules.filter((module) => module.source !== "PLAN" && module.enabled).length}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "status" ? "Confirm club status change" : "Confirm club plan change"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.type === "status"
                ? `Change status to ${formatClubLifecycleStatus(pending.status)} for ${data?.club.name ?? "this club"}.`
                : `Assign plan ${draftPlanKey} to ${data?.club.name ?? "this club"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pending?.type === "plan" ? (
            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="text-muted-foreground">
                Changing the plan may affect which modules are included. Manual overrides will remain unless changed
                separately.
              </p>
              {previewQuery.isLoading ? (
                <p className="text-muted-foreground">Loading module impact preview…</p>
              ) : preview ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ModulePreviewList title="Included by new plan" items={preview.included_by_new_plan} />
                  <ModulePreviewList title="Manually enabled" items={preview.manually_enabled} />
                  <ModulePreviewList title="Manual, not in plan" items={preview.kept_active_not_in_plan} />
                  <ModulePreviewList title="Disabled overrides" items={preview.disabled} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="club-change-reason">Reason (required)</Label>
            <Textarea
              id="club-change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
            />
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => pending && mutation.mutate(pending)}
              disabled={mutation.isPending || !canManage}
            >
              Confirm change
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
