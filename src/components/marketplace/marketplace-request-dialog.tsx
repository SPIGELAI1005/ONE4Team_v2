import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  createMarketplaceRequest,
  updateMarketplaceRequest,
} from "@/hooks/use-marketplace";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_PROVIDER_TYPES,
  MARKETPLACE_REQUEST_VISIBILITY,
  type MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import {
  emptyRequestFormState,
  requestFormFromRow,
  requestFormToInput,
  type MarketplaceRequestFormState,
} from "@/lib/marketplace-request-form";

interface MarketplaceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  schemaReady: boolean;
  request?: MarketplaceRequestRow | null;
  onSaved: () => void;
}

export function MarketplaceRequestDialog({
  open,
  onOpenChange,
  clubId,
  schemaReady,
  request,
  onSaved,
}: MarketplaceRequestDialogProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const d = m.club.requestDialog;
  const { toast } = useToast();
  const isEdit = Boolean(request);

  const [form, setForm] = useState<MarketplaceRequestFormState>(emptyRequestFormState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (request) {
      setForm(requestFormFromRow(request));
      return;
    }
    setForm({ ...emptyRequestFormState(), category: MARKETPLACE_CATEGORIES[0] });
  }, [open, request]);

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const patch = (patch: Partial<MarketplaceRequestFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleClose = (next: boolean) => {
    if (!next) setForm(emptyRequestFormState());
    onOpenChange(next);
  };

  const handleSubmit = async (publish: boolean) => {
    if (!schemaReady) {
      toast({ title: t.common.error, description: m.schemaHint, variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: t.common.error, description: d.titleRequired, variant: "destructive" });
      return;
    }
    if (!form.category) {
      toast({ title: t.common.error, description: d.categoryRequired, variant: "destructive" });
      return;
    }

    setSaving(true);
    const input = requestFormToInput(form, clubId, publish);

    const { error } = isEdit && request
      ? await updateMarketplaceRequest({
          requestId: request.id,
          ...input,
          publish,
          status: publish ? "open" : request.status === "draft" ? "draft" : request.status,
        })
      : await createMarketplaceRequest(input);

    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: publish ? d.publishedToast : d.draftSavedToast });
    handleClose(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? d.editTitle : d.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label={d.fields.title}>
            <Input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={d.placeholders.title}
            />
          </Field>

          <Field label={d.fields.category}>
            <Select value={form.category} onValueChange={(v) => patch({ category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={d.fields.providerTypeWanted}>
            <Select value={form.providerTypeWanted} onValueChange={(v) => patch({ providerTypeWanted: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{d.providerTypeAny}</SelectItem>
                {MARKETPLACE_PROVIDER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {m.providerTypes[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={d.fields.description}>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder={d.placeholders.description}
            />
          </Field>

          <Field label={d.fields.quantity}>
            <Input
              value={form.quantity}
              onChange={(e) => patch({ quantity: e.target.value })}
              placeholder={d.placeholders.quantity}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={d.fields.location}>
              <Input
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder={d.placeholders.location}
              />
            </Field>
            <Field label={d.fields.deadline}>
              <Input type="date" value={form.deadline} onChange={(e) => patch({ deadline: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={d.fields.budgetMin}>
              <Input type="number" min={0} value={form.budgetMin} onChange={(e) => patch({ budgetMin: e.target.value })} />
            </Field>
            <Field label={d.fields.budgetMax}>
              <Input type="number" min={0} value={form.budgetMax} onChange={(e) => patch({ budgetMax: e.target.value })} />
            </Field>
          </div>

          <Field label={d.fields.visibility}>
            <Select
              value={form.visibility}
              onValueChange={(v) => patch({ visibility: v as MarketplaceRequestFormState["visibility"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_REQUEST_VISIBILITY.map((v) => (
                  <SelectItem key={v} value={v}>
                    {d.visibilityOptions[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{d.fields.attachments}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => patch({ attachmentUrls: [...form.attachmentUrls, ""] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {d.addAttachment}
              </Button>
            </div>
            {form.attachmentUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => {
                    const next = [...form.attachmentUrls];
                    next[index] = e.target.value;
                    patch({ attachmentUrls: next });
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={form.attachmentUrls.length <= 1}
                  onClick={() => patch({ attachmentUrls: form.attachmentUrls.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={saving} onClick={() => handleClose(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => void handleSubmit(false)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : d.saveDraft}
          </Button>
          <Button disabled={saving} onClick={() => void handleSubmit(true)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : d.publish}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** @deprecated Use {@link MarketplaceRequestDialog} */
export const MarketplaceCreateRequestDialog = MarketplaceRequestDialog;
