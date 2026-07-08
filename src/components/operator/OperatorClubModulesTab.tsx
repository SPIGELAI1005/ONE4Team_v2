import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useToast } from "@/hooks/use-toast";
import type { OperatorClubDetailModule } from "@/lib/operator-club-detail";
import { formatOverviewTimestamp } from "@/lib/operator-club-detail";
import {
  formatModuleSourceLabel,
  OPERATOR_MODULE_ENTITLEMENT_SOURCES,
  setOperatorClubModuleEntitlement,
  type OperatorModuleEntitlementSource,
} from "@/lib/operator-club-module-entitlements";

interface OperatorClubModulesTabProps {
  clubId: string;
  clubName: string;
  modules: OperatorClubDetailModule[];
  isLoading: boolean;
  canManage: boolean;
  isOwner: boolean;
}

interface PendingModuleChange {
  module: OperatorClubDetailModule;
  enabled: boolean;
}

export function OperatorClubModulesTab({
  clubId,
  clubName,
  modules,
  isLoading,
  canManage,
  isOwner,
}: OperatorClubModulesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<PendingModuleChange | null>(null);
  const [source, setSource] = useState<OperatorModuleEntitlementSource>("MANUAL_OVERRIDE");
  const [reason, setReason] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: setOperatorClubModuleEntitlement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["operator-club-detail", clubId] });
      toast({ title: "Module entitlement updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  const readOnlyTooltip = useMemo(() => {
    if (canManage) return null;
    return "You have read-only access. Only OWNER and OPERATOR roles can change module entitlements.";
  }, [canManage]);

  function openChangeDialog(module: OperatorClubDetailModule, enabled: boolean) {
    const allowedSource = OPERATOR_MODULE_ENTITLEMENT_SOURCES.some((option) => option.value === module.source);
    setPendingChange({ module, enabled });
    setSource(allowedSource ? (module.source as OperatorModuleEntitlementSource) : "MANUAL_OVERRIDE");
    setReason("");
    setValidUntil(module.valid_until ? module.valid_until.slice(0, 16) : "");
    setFormError(null);
  }

  function closeDialog() {
    setPendingChange(null);
    setReason("");
    setValidUntil("");
    setFormError(null);
    mutation.reset();
  }

  function handleConfirm() {
    if (!pendingChange) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFormError("Reason is required.");
      return;
    }

    if (pendingChange.module.is_core && !pendingChange.enabled && !isOwner) {
      setFormError("Only OWNER can disable core modules.");
      return;
    }

    mutation.mutate({
      clubId,
      moduleId: pendingChange.module.id,
      enabled: pendingChange.enabled,
      source,
      reason: trimmedReason,
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
    });
  }

  function canToggleModule(module: OperatorClubDetailModule): boolean {
    if (!canManage) return false;
    if (module.is_core && module.enabled && !isOwner) return false;
    return true;
  }

  function toggleTooltip(module: OperatorClubDetailModule): string | null {
    if (readOnlyTooltip) return readOnlyTooltip;
    if (module.is_core && module.enabled && !isOwner) {
      return "Only OWNER can disable core modules.";
    }
    return null;
  }

  return (
    <>
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="font-display text-lg">Module entitlements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enable or disable modules for this club. Every change requires confirmation, a reason, and is written to
            the platform audit log.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : modules.length ? (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Last changed</TableHead>
                    <TableHead className="text-right">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => {
                    const toggleDisabled = !canToggleModule(module);
                    const tooltip = toggleTooltip(module);

                    return (
                      <TableRow key={module.id}>
                        <TableCell className="max-w-xs">
                          <div className="font-medium text-foreground">{module.name}</div>
                          <div className="text-xs text-muted-foreground">{module.key}</div>
                          {module.description ? (
                            <div className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline">{module.category}</Badge>
                            {module.is_core ? <Badge variant="secondary">Core</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={module.enabled ? "default" : "secondary"}>
                              {module.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            {module.source === "MANUAL_OVERRIDE" ? (
                              <Badge variant="outline">Manual Override</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatModuleSourceLabel(module.source)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={module.included_in_plan ? "default" : "outline"}>
                            {module.included_in_plan ? "Included" : "Not included"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatOverviewTimestamp(module.valid_until)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{module.changed_by_email ?? "—"}</div>
                          <div>{formatOverviewTimestamp(module.changed_at)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {tooltip ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Switch
                                    checked={module.enabled}
                                    disabled={toggleDisabled || mutation.isPending}
                                    onCheckedChange={(enabled) => openChangeDialog(module, enabled)}
                                    aria-label={`Toggle ${module.name}`}
                                  />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{tooltip}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Switch
                              checked={module.enabled}
                              disabled={toggleDisabled || mutation.isPending}
                              onCheckedChange={(enabled) => openChangeDialog(module, enabled)}
                              aria-label={`Toggle ${module.name}`}
                            />
                          )}
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              disabled={mutation.isPending}
                              onClick={() => openChangeDialog(module, module.enabled)}
                            >
                              Edit
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          ) : (
            <OperatorSectionEmptyState
              icon={Layers3}
              title="No modules in catalog"
              description="The platform module registry has no active modules yet."
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm module change</AlertDialogTitle>
            <AlertDialogDescription>
              This updates the internal operator entitlement for {clubName}. The change is audited immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingChange ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Club</div>
                    <div className="font-medium text-foreground">{clubName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Module</div>
                    <div className="font-medium text-foreground">{pendingChange.module.name}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Current state</div>
                    <div className="font-medium text-foreground">
                      {pendingChange.module.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">New state</div>
                    <div className="font-medium text-foreground">
                      {pendingChange.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-source">Source</Label>
                <Select value={source} onValueChange={(value) => setSource(value as OperatorModuleEntitlementSource)}>
                  <SelectTrigger id="module-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_MODULE_ENTITLEMENT_SOURCES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-reason">Reason</Label>
                <Textarea
                  id="module-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why this entitlement is changing."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-valid-until">Valid until (optional)</Label>
                <Input
                  id="module-valid-until"
                  type="datetime-local"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                />
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={mutation.isPending || !canManage}>
              {mutation.isPending ? "Saving..." : "Confirm change"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
