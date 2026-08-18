import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMemberAvailability,
  listMemberAvailability,
  upsertMemberAvailability,
} from "@/lib/member-availability-api";
import type {
  MemberAvailabilityReason,
  MemberAvailabilityRow,
  MemberAvailabilityStatus,
} from "@/lib/member-availability";

interface MemberAvailabilityPanelProps {
  clubId: string;
  membershipId: string;
  labels: {
    title: string;
    subtitle: string;
    add: string;
    status: string;
    reason: string;
    note: string;
    from: string;
    to: string;
    save: string;
    empty: string;
    delete: string;
    statusUnavailable: string;
    statusLimited: string;
    statusAvailable: string;
    reasonHoliday: string;
    reasonIllness: string;
    reasonInjury: string;
    reasonSchool: string;
    reasonFamily: string;
    reasonWork: string;
    reasonOther: string;
    saved: string;
    failed: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MemberAvailabilityPanel({
  clubId,
  membershipId,
  labels,
  onToast,
}: MemberAvailabilityPanelProps) {
  const [rows, setRows] = useState<MemberAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<MemberAvailabilityStatus>("unavailable");
  const [reason, setReason] = useState<MemberAvailabilityReason | "">("holiday");
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listMemberAvailability({ clubId, membershipId });
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows(data);
    }
    setLoading(false);
  }, [clubId, labels.failed, membershipId, onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSave() {
    if (!startsAt || !endsAt) return;
    setSaving(true);
    const result = await upsertMemberAvailability({
      membershipId,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      status,
      reason: reason || null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (result.error || !result.data) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    setShowForm(false);
    setNote("");
    await reload();
  }

  async function handleDelete(id: string) {
    const result = await deleteMemberAvailability(id);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    await reload();
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarOff className="h-4 w-4 text-muted-foreground" />
            {labels.title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{labels.subtitle}</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          {labels.add}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-4 space-y-3 rounded-xl border border-border/50 bg-background/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.from}</label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.to}</label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.status}</label>
              <Select value={status} onValueChange={(v) => setStatus(v as MemberAvailabilityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">{labels.statusUnavailable}</SelectItem>
                  <SelectItem value="limited">{labels.statusLimited}</SelectItem>
                  <SelectItem value="available">{labels.statusAvailable}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.reason}</label>
              <Select value={reason || "other"} onValueChange={(v) => setReason(v as MemberAvailabilityReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">{labels.reasonHoliday}</SelectItem>
                  <SelectItem value="illness">{labels.reasonIllness}</SelectItem>
                  <SelectItem value="injury">{labels.reasonInjury}</SelectItem>
                  <SelectItem value="school">{labels.reasonSchool}</SelectItem>
                  <SelectItem value="family">{labels.reasonFamily}</SelectItem>
                  <SelectItem value="work">{labels.reasonWork}</SelectItem>
                  <SelectItem value="other">{labels.reasonOther}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{labels.note}</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="resize-none" />
          </div>
          <Button type="button" size="sm" className="rounded-xl" disabled={saving || !startsAt || !endsAt} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {labels.save}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/35 px-3 py-2"
            >
              <div className="min-w-0 text-xs">
                <div className="font-medium text-foreground">
                  {toLocalInputValue(row.starts_at).replace("T", " ")} → {toLocalInputValue(row.ends_at).replace("T", " ")}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  {row.status}
                  {row.reason ? ` · ${row.reason}` : ""}
                  {row.note ? ` · ${row.note}` : ""}
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={labels.delete}
                onClick={() => void handleDelete(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
