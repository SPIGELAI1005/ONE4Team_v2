import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, Loader2, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultSommerfestEventsFeed,
  normalizeClubEventsFeed,
  type ClubEventsFeedConfig,
  type ClubEventsFeedItem,
} from "@/lib/club-events-feed";
import { saveClubEventsFeed } from "@/lib/club-events-feed-api";
import { cn } from "@/lib/utils";

interface EventsFeedAdminProps {
  clubId: string;
  userId: string;
  value: ClubEventsFeedConfig;
  onSaved: (next: ClubEventsFeedConfig) => void;
  feedLoading?: boolean;
}

function newNewsItem(): ClubEventsFeedItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `news-${Date.now()}`,
    kind: "news",
    date: today,
    time: "08:00",
    titleDe: "",
    titleEn: "",
    summaryDe: "",
    summaryEn: "",
    bodyDe: "",
    bodyEn: "",
    accent: "rose",
    teamScope: null,
  };
}

export function EventsFeedAdmin({ clubId, userId, value, onSaved, feedLoading = false }: EventsFeedAdminProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const copy = t.eventsPage.feedAdmin;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClubEventsFeedConfig>(value);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function patch(partial: Partial<ClubEventsFeedConfig>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function patchItem(id: string, partial: Partial<ClubEventsFeedItem>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    }));
  }

  function removeItem(id: string) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = normalizeClubEventsFeed({ ...form, enabled: true });
      const { error } = await saveClubEventsFeed(supabase, clubId, normalized, userId);
      if (error) throw error;
      onSaved(normalized);
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
            disabled={saving || feedLoading}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {copy.save}
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-[#16a34a]" />
          {copy.festivalDaySection}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.fieldFestivalDate}</Label>
          <Input type="date" value={form.festivalDate} onChange={(e) => patch({ festivalDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.fieldDayProgramDe}</Label>
          <Input value={form.dayProgram} onChange={(e) => patch({ dayProgram: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.fieldDayProgramEn}</Label>
          <Input value={form.dayProgramEn} onChange={(e) => patch({ dayProgramEn: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.fieldEveningProgramDe}</Label>
          <Input value={form.eveningProgram} onChange={(e) => patch({ eveningProgram: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.fieldEveningProgramEn}</Label>
          <Input value={form.eveningProgramEn} onChange={(e) => patch({ eveningProgramEn: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setForm(defaultSommerfestEventsFeed())}>
            {copy.applyDefaults}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">{copy.timelineSection}</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const item = newNewsItem();
              setForm((prev) => ({ ...prev, items: [item, ...prev.items] }));
              setExpandedId(item.id);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {copy.addNews}
          </Button>
        </div>

        {form.items.map((item) => {
          const expanded = expandedId === item.id;
          const label = item.titleDe || item.titleEn || item.id;
          return (
            <div key={item.id} className="rounded-xl border border-border/70 bg-background/40">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                onClick={() => setExpandedId(expanded ? null : item.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.date} · {item.time}
                    {item.endTime ? ` – ${item.endTime}` : ""} · {item.kind}
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded ? (
                <div className="space-y-3 border-t border-border/60 px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldDate}</Label>
                      <Input type="date" value={item.date} onChange={(e) => patchItem(item.id, { date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldKind}</Label>
                      <Select value={item.kind} onValueChange={(v) => patchItem(item.id, { kind: v as ClubEventsFeedItem["kind"] })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["news", "festival", "tournament", "pitch_booking", "evening", "club_wide"] as const).map((kind) => (
                            <SelectItem key={kind} value={kind}>{kind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldTime}</Label>
                      <Input value={item.time} onChange={(e) => patchItem(item.id, { time: e.target.value })} placeholder="11:00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldEndTime}</Label>
                      <Input value={item.endTime ?? ""} onChange={(e) => patchItem(item.id, { endTime: e.target.value || undefined })} />
                    </div>
                    {item.kind === "news" ? (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">{copy.fieldValidUntil}</Label>
                        <Input
                          type="date"
                          value={item.effectiveUntil ?? ""}
                          onChange={(e) => patchItem(item.id, { effectiveUntil: e.target.value || undefined })}
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">{copy.fieldTitleDe}</Label>
                      <Input value={item.titleDe} onChange={(e) => patchItem(item.id, { titleDe: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">{copy.fieldTitleEn}</Label>
                      <Input value={item.titleEn} onChange={(e) => patchItem(item.id, { titleEn: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">{copy.fieldSummaryDe}</Label>
                      <Textarea value={item.summaryDe ?? ""} onChange={(e) => patchItem(item.id, { summaryDe: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">{copy.fieldSummaryEn}</Label>
                      <Textarea value={item.summaryEn ?? ""} onChange={(e) => patchItem(item.id, { summaryEn: e.target.value })} rows={2} />
                    </div>
                    {item.kind === "news" ? (
                      <>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">{copy.fieldBodyDe}</Label>
                          <Textarea value={item.bodyDe ?? ""} onChange={(e) => patchItem(item.id, { bodyDe: e.target.value })} rows={4} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">{copy.fieldBodyEn}</Label>
                          <Textarea value={item.bodyEn ?? ""} onChange={(e) => patchItem(item.id, { bodyEn: e.target.value })} rows={4} />
                        </div>
                      </>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldPitchLabel}</Label>
                      <Input value={item.pitchLabel ?? ""} onChange={(e) => patchItem(item.id, { pitchLabel: e.target.value || undefined })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{copy.fieldTeamScope}</Label>
                      <Input
                        value={item.teamScope ?? ""}
                        onChange={(e) => patchItem(item.id, { teamScope: e.target.value.trim() ? e.target.value : null })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {copy.removeItem}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
