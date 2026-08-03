import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  campDraftFromEvent,
  campDraftFromTemplate,
  campDraftToFormValues,
  campFormValuesToIso,
  saveClubCampEvent,
  type ClubCampEventDraft,
  type ClubCampEventRow,
} from "@/lib/club-football-camp-api";
import { getClubFootballCampTemplate } from "@/lib/club-football-camp-templates";

interface ClubFootballCampEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  userId: string;
  importKey: string;
  publishedEvent?: ClubCampEventRow | null;
  onSaved: (row: ClubCampEventRow) => void;
}

export function ClubFootballCampEditDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  importKey,
  publishedEvent,
  onSaved,
}: ClubFootballCampEditDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const copy = t.clubFootballCamps;
  const [form, setForm] = useState<ClubCampEventDraft>(() => campDraftToFormValues(emptyDraft()));
  const [saving, setSaving] = useState(false);

  const template = useMemo(() => getClubFootballCampTemplate(importKey), [importKey]);

  useEffect(() => {
    if (!open) return;
    const lang = language === "de" ? "de" : "en";
    const base = publishedEvent
      ? campDraftFromEvent(publishedEvent)
      : template
        ? campDraftFromTemplate(template, lang)
        : emptyDraft();
    setForm(campDraftToFormValues(base));
  }, [open, publishedEvent, template, language]);

  function patch(partial: Partial<ClubCampEventDraft>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.starts_at) {
      toast({ title: t.common.error, description: copy.editRequiredHint, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const row = await saveClubCampEvent({
        clubId,
        createdBy: userId,
        importKey,
        draft: campFormValuesToIso(form),
      });
      onSaved(row);
      toast({ title: copy.toastUpdated, description: row.title });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{copy.editTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.editLead}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{copy.fieldTitle}</Label>
            <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{copy.fieldSummary}</Label>
            <Input value={form.public_summary} onChange={(e) => patch({ public_summary: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{copy.fieldDescription}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldAudience}</Label>
            <Input value={form.target_audience} onChange={(e) => patch({ target_audience: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldPartner}</Label>
            <Input value={form.partner_name} onChange={(e) => patch({ partner_name: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{copy.fieldLocation}</Label>
            <Input value={form.location} onChange={(e) => patch({ location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldStartsAt}</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => patch({ starts_at: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldEndsAt}</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => patch({ ends_at: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{copy.fieldRegistrationUrl}</Label>
            <Input
              value={form.registration_external_url}
              onChange={(e) => patch({ registration_external_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldContactEmail}</Label>
            <Input value={form.contact_email} onChange={(e) => patch({ contact_email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldImageUrl}</Label>
            <Input value={form.image_url} onChange={(e) => patch({ image_url: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {copy.saveChanges}
          </Button>
        </div>
      </div>
    </div>
  );
}

function emptyDraft(): ClubCampEventDraft {
  return {
    title: "",
    description: "",
    public_summary: "",
    target_audience: "",
    location: "",
    starts_at: "",
    ends_at: "",
    registration_external_url: "",
    contact_email: "",
    partner_name: "",
    image_url: "",
  };
}

export function ClubFootballCampEditButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <Pencil className="mr-1.5 h-4 w-4" />
      {t.clubFootballCamps.editButton}
    </Button>
  );
}
