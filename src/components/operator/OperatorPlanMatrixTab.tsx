import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Grid3X3 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  buildPlanMatrixLookup,
  isModuleIncludedInPlan,
  setPlatformPlanModule,
  type PlatformPlanMatrix,
} from "@/lib/platform-catalog-admin";

interface OperatorPlanMatrixTabProps {
  matrix: PlatformPlanMatrix | undefined;
  isLoading: boolean;
  canEdit: boolean;
}

interface PendingMatrixChange {
  planId: string;
  planName: string;
  moduleId: string;
  moduleName: string;
  currentIncluded: boolean;
  nextIncluded: boolean;
}

export function OperatorPlanMatrixTab({ matrix, isLoading, canEdit }: OperatorPlanMatrixTabProps) {
  const { t } = useLanguage();
  const x = t.operator.modules.matrix;
  const s = t.operator.modules.shared;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<PendingMatrixChange | null>(null);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const lookup = useMemo(() => buildPlanMatrixLookup(matrix?.cells ?? []), [matrix?.cells]);

  const mutation = useMutation({
    mutationFn: setPlatformPlanModule,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["platform-plan-matrix"] }),
        queryClient.invalidateQueries({ queryKey: ["operator-club-detail"] }),
      ]);
      toast({ title: x.updated });
      closeDialog();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  function closeDialog() {
    setPendingChange(null);
    setReason("");
    setFormError(null);
    mutation.reset();
  }

  function openChangeDialog(change: PendingMatrixChange) {
    setPendingChange(change);
    setReason("");
    setFormError(null);
  }

  function handleConfirm() {
    if (!pendingChange) return;
    if (!reason.trim()) {
      setFormError(x.reasonRequired);
      return;
    }

    mutation.mutate({
      planId: pendingChange.planId,
      moduleId: pendingChange.moduleId,
      included: pendingChange.nextIncluded,
      reason: reason.trim(),
    });
  }

  const modules = matrix?.modules ?? [];
  const plans = matrix?.plans ?? [];

  return (
    <>
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="font-display text-lg">{x.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{x.description}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : modules.length && plans.length ? (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-56">{s.module}</TableHead>
                      {plans.map((plan) => (
                        <TableHead key={plan.id} className="min-w-28 text-center">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-xs font-normal text-muted-foreground">{plan.key}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{module.name}</div>
                          <div className="text-xs text-muted-foreground">{module.key}</div>
                          <Badge variant="outline" className="mt-1">
                            {module.category}
                          </Badge>
                        </TableCell>
                        {plans.map((plan) => {
                          const included = isModuleIncludedInPlan(lookup, plan.id, module.id);
                          const cell = (
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox
                                checked={included}
                                disabled={!canEdit || mutation.isPending}
                                onCheckedChange={(checked) => {
                                  const nextIncluded = checked === true;
                                  if (nextIncluded === included) return;
                                  openChangeDialog({
                                    planId: plan.id,
                                    planName: plan.name,
                                    moduleId: module.id,
                                    moduleName: module.name,
                                    currentIncluded: included,
                                    nextIncluded,
                                  });
                                }}
                                aria-label={x.checkboxLabel
                                  .replace("{module}", module.name)
                                  .replace("{plan}", plan.name)}
                              />
                              <span className="text-xs text-muted-foreground">{included ? s.yes : s.no}</span>
                            </div>
                          );

                          if (!canEdit) {
                            return (
                              <TableCell key={`${module.id}-${plan.id}`} className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{cell}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{x.readOnlyTooltip}</TooltipContent>
                                </Tooltip>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={`${module.id}-${plan.id}`} className="text-center">
                              {cell}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          ) : (
            <OperatorSectionEmptyState icon={Grid3X3} title={x.emptyTitle} description={x.emptyDesc} />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{x.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{x.confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>

          {pendingChange ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.plan}</div>
                    <div className="font-medium text-foreground">{pendingChange.planName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.module}</div>
                    <div className="font-medium text-foreground">{pendingChange.moduleName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.current}</div>
                    <div className="font-medium text-foreground">
                      {pendingChange.currentIncluded ? s.included : s.notIncluded}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.new}</div>
                    <div className="font-medium text-foreground">
                      {pendingChange.nextIncluded ? s.included : s.notIncluded}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matrix-reason">{s.reason}</Label>
                <Textarea
                  id="matrix-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={x.reasonPlaceholder}
                  rows={3}
                />
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>{t.common.cancel}</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={mutation.isPending || !canEdit}>
              {mutation.isPending ? s.saving : s.confirmChange}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
