import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { PlatformModule } from "@/lib/platform-catalog";
import { upsertPlatformModule } from "@/lib/platform-catalog-admin";

interface OperatorPlatformModulesTabProps {
  modules: PlatformModule[];
  isLoading: boolean;
  canEdit: boolean;
}

const emptyModuleForm = {
  key: "",
  name: "",
  description: "",
  category: "core",
  isCore: false,
  isBillable: false,
  defaultEnabled: false,
  status: "ACTIVE" as PlatformModule["status"],
};

function moduleStatusBadge(status: PlatformModule["status"]) {
  if (status === "ACTIVE") return "default";
  if (status === "DEPRECATED") return "destructive";
  return "secondary";
}

export function OperatorPlatformModulesTab({ modules, isLoading, canEdit }: OperatorPlatformModulesTabProps) {
  const { t } = useLanguage();
  const m = t.operator.modules;
  const r = m.moduleRegistry;
  const s = m.shared;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModule | null>(null);
  const [form, setForm] = useState(emptyModuleForm);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: upsertPlatformModule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-plan-matrix"] });
      toast({ title: editingModule ? r.updated : r.created });
      closeDialog();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  function openCreateDialog() {
    setEditingModule(null);
    setForm(emptyModuleForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(module: PlatformModule) {
    setEditingModule(module);
    setForm({
      key: module.key,
      name: module.name,
      description: module.description ?? "",
      category: module.category,
      isCore: module.is_core,
      isBillable: module.is_billable,
      defaultEnabled: module.default_enabled,
      status: module.status,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingModule(null);
    setFormError(null);
    mutation.reset();
  }

  function handleSave() {
    if (!form.key.trim() || !form.name.trim()) {
      setFormError(r.keyNameRequired);
      return;
    }

    mutation.mutate({
      moduleId: editingModule?.id ?? null,
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || "core",
      isCore: form.isCore,
      isBillable: form.isBillable,
      defaultEnabled: form.defaultEnabled,
      status: form.status,
    });
  }

  return (
    <>
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-lg">{r.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
          </div>
          {canEdit ? (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {r.create}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" disabled>
                      <Plus className="mr-2 h-4 w-4" />
                      {r.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{r.ownerOnly}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : modules.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{r.table.module}</TableHead>
                  <TableHead>{r.table.category}</TableHead>
                  <TableHead>{r.table.flags}</TableHead>
                  <TableHead>{r.table.default}</TableHead>
                  <TableHead>{s.status}</TableHead>
                  {canEdit ? <TableHead className="text-right">{s.actions}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="max-w-sm">
                      <div className="font-medium text-foreground">{module.name}</div>
                      <div className="text-xs text-muted-foreground">{module.key}</div>
                      {module.description ? (
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{module.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {module.is_core ? <Badge variant="secondary">{r.flags.core}</Badge> : null}
                        {module.is_billable ? <Badge variant="outline">{r.flags.billable}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={module.default_enabled ? "default" : "outline"}>
                        {module.default_enabled ? s.yes : s.no}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={moduleStatusBadge(module.status)}>
                        {r.statuses[module.status] ?? module.status}
                      </Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(module)}>
                          {t.common.edit}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={Layers3} title={r.emptyTitle} description={r.emptyDesc} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModule ? r.edit : r.createDialog}</DialogTitle>
            <DialogDescription>{r.dialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="module-key">{s.key}</Label>
                <Input
                  id="module-key"
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="marketplace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-name">{s.name}</Label>
                <Input
                  id="module-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Marketplace"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="module-description">{s.description}</Label>
              <Textarea
                id="module-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="module-category">{s.category}</Label>
                <Input
                  id="module-category"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-status">{s.status}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as PlatformModule["status"] }))
                  }
                >
                  <SelectTrigger id="module-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{r.statuses.ACTIVE}</SelectItem>
                    <SelectItem value="INACTIVE">{r.statuses.INACTIVE}</SelectItem>
                    <SelectItem value="DEPRECATED">{r.statuses.DEPRECATED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                {r.flags.core}
                <Switch checked={form.isCore} onCheckedChange={(checked) => setForm((c) => ({ ...c, isCore: checked }))} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                {r.flags.billable}
                <Switch
                  checked={form.isBillable}
                  onCheckedChange={(checked) => setForm((c) => ({ ...c, isBillable: checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                {r.defaultEnabled}
                <Switch
                  checked={form.defaultEnabled}
                  onCheckedChange={(checked) => setForm((c) => ({ ...c, defaultEnabled: checked }))}
                />
              </label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={mutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? s.saving : r.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
