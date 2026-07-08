import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { PlatformPlan } from "@/lib/platform-catalog";
import { formatCatalogPrice, upsertPlatformPlan } from "@/lib/platform-catalog-admin";

interface OperatorPlatformPlansTabProps {
  plans: PlatformPlan[];
  isLoading: boolean;
  canEdit: boolean;
}

const emptyPlanForm = {
  key: "",
  name: "",
  description: "",
  priceMonthly: "",
  priceYearly: "",
  maxUsers: "",
  maxTeams: "",
  status: "ACTIVE" as PlatformPlan["status"],
};

function planStatusBadge(status: PlatformPlan["status"]) {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

export function OperatorPlatformPlansTab({ plans, isLoading, canEdit }: OperatorPlatformPlansTabProps) {
  const { t } = useLanguage();
  const m = t.operator.modules;
  const p = m.plans;
  const s = m.shared;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformPlan | null>(null);
  const [form, setForm] = useState(emptyPlanForm);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: upsertPlatformPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-plan-matrix"] });
      toast({ title: editingPlan ? p.updated : p.created });
      closeDialog();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  function openCreateDialog() {
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(plan: PlatformPlan) {
    setEditingPlan(plan);
    setForm({
      key: plan.key,
      name: plan.name,
      description: plan.description ?? "",
      priceMonthly: plan.price_monthly?.toString() ?? "",
      priceYearly: plan.price_yearly?.toString() ?? "",
      maxUsers: plan.max_users?.toString() ?? "",
      maxTeams: plan.max_teams?.toString() ?? "",
      status: plan.status,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingPlan(null);
    setFormError(null);
    mutation.reset();
  }

  function parseOptionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function handleSave() {
    if (!form.key.trim() || !form.name.trim()) {
      setFormError(p.keyNameRequired);
      return;
    }

    mutation.mutate({
      planId: editingPlan?.id ?? null,
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceMonthly: parseOptionalNumber(form.priceMonthly),
      priceYearly: parseOptionalNumber(form.priceYearly),
      maxUsers: parseOptionalNumber(form.maxUsers),
      maxTeams: parseOptionalNumber(form.maxTeams),
      status: form.status,
    });
  }

  return (
    <>
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-lg">{p.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
          </div>
          {canEdit ? (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {p.create}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" disabled>
                      <Plus className="mr-2 h-4 w-4" />
                      {p.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{p.ownerOnly}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : plans.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{p.table.plan}</TableHead>
                  <TableHead>{p.table.monthly}</TableHead>
                  <TableHead>{p.table.yearly}</TableHead>
                  <TableHead>{p.table.limits}</TableHead>
                  <TableHead>{s.status}</TableHead>
                  {canEdit ? <TableHead className="text-right">{s.actions}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.key}</div>
                      {plan.description ? (
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{plan.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{formatCatalogPrice(plan.price_monthly)}</TableCell>
                    <TableCell className="text-sm">{formatCatalogPrice(plan.price_yearly)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.limitsUsersTeams
                        .replace("{users}", String(plan.max_users ?? "∞"))
                        .replace("{teams}", String(plan.max_teams ?? "∞"))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={planStatusBadge(plan.status)}>{p.statuses[plan.status] ?? plan.status}</Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(plan)}>
                          {t.common.edit}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={CreditCard} title={p.emptyTitle} description={p.emptyDesc} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? p.edit : p.createDialog}</DialogTitle>
            <DialogDescription>{p.dialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-key">{s.key}</Label>
                <Input
                  id="plan-key"
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-name">{s.name}</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Pro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">{s.description}</Label>
              <Textarea
                id="plan-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-monthly">{p.priceMonthly}</Label>
                <Input
                  id="plan-monthly"
                  type="number"
                  min="0"
                  value={form.priceMonthly}
                  onChange={(event) => setForm((current) => ({ ...current, priceMonthly: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-yearly">{p.priceYearly}</Label>
                <Input
                  id="plan-yearly"
                  type="number"
                  min="0"
                  value={form.priceYearly}
                  onChange={(event) => setForm((current) => ({ ...current, priceYearly: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="plan-max-users">{p.maxUsers}</Label>
                <Input
                  id="plan-max-users"
                  type="number"
                  min="0"
                  value={form.maxUsers}
                  onChange={(event) => setForm((current) => ({ ...current, maxUsers: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-max-teams">{p.maxTeams}</Label>
                <Input
                  id="plan-max-teams"
                  type="number"
                  min="0"
                  value={form.maxTeams}
                  onChange={(event) => setForm((current) => ({ ...current, maxTeams: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-status">{s.status}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((current) => ({ ...current, status: value as PlatformPlan["status"] }))}
                >
                  <SelectTrigger id="plan-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{p.statuses.ACTIVE}</SelectItem>
                    <SelectItem value="INACTIVE">{p.statuses.INACTIVE}</SelectItem>
                    <SelectItem value="ARCHIVED">{p.statuses.ARCHIVED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={mutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? s.saving : p.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
