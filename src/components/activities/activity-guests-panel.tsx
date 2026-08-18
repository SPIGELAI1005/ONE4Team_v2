import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addActivityGuest,
  convertActivityGuest,
  convertActivityGuestToDraftInvite,
  listActivityGuests,
  type ActivityGuestParticipant,
} from "@/lib/activity-guests-calendar-api";
import { supabase } from "@/integrations/supabase/client";
import { sendClubInviteEmail } from "@/lib/send-club-invite-email";

interface ActivityGuestsPanelProps {
  clubId: string;
  activityId: string;
  canConvert?: boolean;
  labels: {
    title: string;
    add: string;
    name: string;
    email: string;
    empty: string;
    saved: string;
    failed: string;
    linkExisting?: string;
    createDraftInvite?: string;
    converted?: string;
    pickMember?: string;
    convertDone?: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

type MemberOption = { id: string; label: string };

export function ActivityGuestsPanel({
  clubId,
  activityId,
  canConvert = false,
  labels,
  onToast,
}: ActivityGuestsPanelProps) {
  const [rows, setRows] = useState<ActivityGuestParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [linkMembershipId, setLinkMembershipId] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listActivityGuests({ clubId, activityId });
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows(data);
    }
    setLoading(false);
  }, [activityId, clubId, labels.failed, onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clubId || !activityId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void reload();
      }, 350);
    };
    const channel = supabase
      .channel(`activity-guests-${clubId}-${activityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_guest_participants",
          filter: `activity_id=eq.${activityId}`,
        },
        schedule,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [activityId, clubId, reload]);

  useEffect(() => {
    if (!canConvert || !clubId) return;
    void supabase
      .from("club_memberships")
      .select("id, profiles!club_memberships_profile_fk(display_name)")
      .eq("club_id", clubId)
      .eq("status", "active")
      .limit(200)
      .then(({ data }) => {
        const opts = ((data ?? []) as Array<{ id: string; profiles?: { display_name?: string } | null }>).map(
          (row) => ({
            id: row.id,
            label: row.profiles?.display_name?.trim() || row.id.slice(0, 8),
          }),
        );
        setMembers(opts);
      });
  }, [canConvert, clubId]);

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await addActivityGuest({
      clubId,
      activityId,
      displayName: name,
      contactEmail: email,
    });
    setBusy(false);
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    setName("");
    setEmail("");
    setShowForm(false);
    await reload();
  }

  async function handleLink(guestId: string) {
    const membershipId = linkMembershipId[guestId];
    if (!membershipId) return;
    setBusy(true);
    const result = await convertActivityGuest({ guestId, mode: "link", membershipId });
    setBusy(false);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.convertDone ?? labels.saved });
    await reload();
  }

  async function handleDraftInvite(guest: ActivityGuestParticipant) {
    setBusy(true);
    const result = await convertActivityGuestToDraftInvite({ guestId: guest.id });
    if (!result.ok || !result.email || !result.inviteId || !result.inviteToken) {
      setBusy(false);
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }

    const emailResult = await sendClubInviteEmail({
      clubId,
      inviteId: result.inviteId,
      toEmail: result.email,
      inviteToken: result.inviteToken,
      recipientName: result.name,
    });
    setBusy(false);
    if (!emailResult.ok) {
      onToast({
        title: labels.failed,
        description: emailResult.error ?? "email_failed",
        variant: "destructive",
      });
    } else {
      onToast({ title: labels.convertDone ?? labels.saved });
    }
    await reload();
  }

  function isConverted(row: ActivityGuestParticipant): boolean {
    return Boolean(row.converted_membership_id || row.converted_draft_id);
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-background/30 p-3" data-testid="activity-guests-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <UserPlus className="h-3.5 w-3.5" />
          {labels.title}
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {labels.add}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.name} className="h-9 rounded-xl" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.email} className="h-9 rounded-xl" />
          <Button size="sm" className="rounded-xl sm:col-span-2" disabled={busy || !name.trim()} onClick={() => void handleAdd()}>
            {labels.add}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border/40 bg-background/40 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{row.display_name}</span>
                <span className="capitalize text-muted-foreground">
                  {isConverted(row) ? labels.converted ?? "converted" : row.status}
                </span>
              </div>
              {canConvert && !isConverted(row) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Select
                    value={linkMembershipId[row.id] || "__none__"}
                    onValueChange={(v) =>
                      setLinkMembershipId((prev) => ({ ...prev, [row.id]: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[9rem] flex-1">
                      <SelectValue placeholder={labels.pickMember ?? "Member"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{labels.pickMember ?? "Member"}</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={busy || !linkMembershipId[row.id]}
                    onClick={() => void handleLink(row.id)}
                  >
                    {labels.linkExisting ?? "Link"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={busy || !row.contact_email}
                    onClick={() => void handleDraftInvite(row)}
                  >
                    {labels.createDraftInvite ?? "Draft + invite"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
