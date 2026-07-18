import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EVENTS_HIGHLIGHT_IMAGE,
  defaultSommerfestEventsHighlight,
  type ClubEventsHighlightConfig,
} from "@/lib/club-events-highlight";
import { saveClubEventsHighlight } from "@/lib/club-events-highlight-api";

const CLUB_ASSETS_BUCKET = "images-clubs";

interface EventsHighlightAdminProps {
  clubId: string;
  userId: string;
  value: ClubEventsHighlightConfig;
  onSaved: (next: ClubEventsHighlightConfig) => void;
}

export function EventsHighlightAdmin({ clubId, userId, value, onSaved }: EventsHighlightAdminProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const copy = t.eventsPage.highlightAdmin;
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClubEventsHighlightConfig>(value);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function patch(partial: Partial<ClubEventsHighlightConfig>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${clubId}/events-highlight-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(filePath);
      patch({ imageUrl: data.publicUrl });
      toast({ title: copy.toastImageUploaded });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await saveClubEventsHighlight(supabase, clubId, form, userId);
      if (error) throw error;
      onSaved(form);
      toast({ title: copy.toastSaved });
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {copy.editButton}
        </Button>
      </div>
    );
  }

  const previewSrc = form.imageUrl.trim() || DEFAULT_EVENTS_HIGHLIGHT_IMAGE;

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#16a34a]">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.badge}
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">{copy.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.lead}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
            disabled={saving || uploading}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {copy.save}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <div>
              <div className="text-sm text-foreground">{copy.enabled}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{copy.enabledDesc}</div>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(c) => patch({ enabled: Boolean(c) })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldBadge}</Label>
              <Input value={form.badge} onChange={(e) => patch({ badge: e.target.value })} placeholder={copy.phBadge} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldTitle}</Label>
              <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder={copy.phTitle} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldEventsLead}</Label>
              <Textarea
                value={form.eventsLead}
                onChange={(e) => patch({ eventsLead: e.target.value })}
                placeholder={copy.phEventsLead}
                rows={2}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldMatchesLead}</Label>
              <Textarea
                value={form.matchesLead}
                onChange={(e) => patch({ matchesLead: e.target.value })}
                placeholder={copy.phMatchesLead}
                rows={2}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldLocation}</Label>
              <Input
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder={copy.phLocation}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{copy.fieldPosterAlt}</Label>
              <Input
                value={form.posterAlt}
                onChange={(e) => patch({ posterAlt: e.target.value })}
                placeholder={copy.phPosterAlt}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setForm(defaultSommerfestEventsHighlight())}
            >
              {copy.applySommerfestDefaults}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              {copy.uploadImage}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleUpload(file);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{copy.fieldImageUrl}</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              placeholder={DEFAULT_EVENTS_HIGHLIGHT_IMAGE}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          <img src={previewSrc} alt="" className="aspect-[3/4] w-full object-cover object-top" />
          <p className="px-3 py-2 text-[10px] text-muted-foreground">{copy.previewHint}</p>
        </div>
      </div>
    </section>
  );
}
