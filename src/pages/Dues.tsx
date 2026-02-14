import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Plus, Layers } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useMembershipId } from "@/hooks/use-membership-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type DuesStatus = "due" | "paid" | "waived";

type MembershipDueRow = {
  id: string;
  club_id: string;
  membership_id: string;
  due_date: string;
  amount_cents: number | null;
  currency: string | null;
  status: DuesStatus;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles?: { display_name: string | null } | null;
};

function toCsv(rows: Array<Record<string, unknown>>): string {
  const keys = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function eurToCents(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function Dues() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { membershipId, loading: membershipLoading } = useMembershipId();
  const perms = usePermissions();
  const { toast } = useToast();

  const canManage = perms.isTrainer;

  const [loading, setLoading] = useState(true);
  const [dues, setDues] = useState<MembershipDueRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newMembershipId, setNewMembershipId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAmountEur, setNewAmountEur] = useState("");
  const [newNote, setNewNote] = useState("");

  const [showBulk, setShowBulk] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkAmountEur, setBulkAmountEur] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkRole, setBulkRole] = useState<string>("all");

  const fetchData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      if (canManage) {
        const { data, error } = await supabase
          .from("membership_dues")
          .select("*")
          .eq("club_id", clubId)
          .order("due_date", { ascending: false })
          .limit(400);
        if (error) throw error;
        setDues((data as unknown as MembershipDueRow[]) ?? []);

        const { data: ms, error: msErr } = await supabase
          .from("club_memberships")
          .select("id, user_id, role, status, profiles!club_memberships_profile_fk(display_name)")
          .eq("club_id", clubId)
          .order("created_at", { ascending: true })
          .limit(500);
        if (msErr) throw msErr;
        setMemberships((ms as unknown as MembershipRow[]) ?? []);
      } else if (membershipId) {
        const { data, error } = await supabase
          .from("membership_dues")
          .select("*")
          .eq("club_id", clubId)
          .eq("membership_id", membershipId)
          .order("due_date", { ascending: false })
          .limit(200);
        if (error) throw error;
        setDues((data as unknown as MembershipDueRow[]) ?? []);
      } else {
        setDues([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dues";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, membershipId, canManage, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of memberships) {
      map[m.id] = m.profiles?.display_name || m.id.slice(0, 8);
    }
    return map;
  }, [memberships]);

  const unpaidCount = useMemo(() => dues.filter((d) => d.status === "due").length, [dues]);

  const updateStatus = async (row: MembershipDueRow, status: DuesStatus) => {
    if (!clubId || !canManage) return;

    const patch: Partial<MembershipDueRow> = {
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("membership_dues")
      .update(patch)
      .eq("club_id", clubId)
      .eq("id", row.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Updated" });
    await fetchData();
  };

  const createDue = async () => {
    if (!clubId || !canManage) return;
    if (!newMembershipId || !newDueDate) return;

    const amountCents = eurToCents(newAmountEur);

    const { error } = await supabase.from("membership_dues").insert({
      club_id: clubId,
      membership_id: newMembershipId,
      due_date: newDueDate,
      amount_cents: amountCents,
      currency: "EUR",
      status: "due",
      note: newNote.trim() ? newNote.trim() : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Dues created" });
    setShowCreate(false);
    setNewMembershipId("");
    setNewDueDate("");
    setNewAmountEur("");
    setNewNote("");
    await fetchData();
  };

  const bulkCreate = async () => {
    if (!clubId || !canManage) return;
    if (!bulkDueDate) return;

    const amountCents = eurToCents(bulkAmountEur);
    const targets = memberships
      .filter((m) => m.status === "active")
      .filter((m) => (bulkRole === "all" ? true : m.role === bulkRole));

    if (targets.length === 0) {
      toast({ title: "No members", description: "No active members match this filter." });
      return;
    }

    const rows = targets.map((m) => ({
      club_id: clubId,
      membership_id: m.id,
      due_date: bulkDueDate,
      amount_cents: amountCents,
      currency: "EUR",
      status: "due" as const,
      note: bulkNote.trim() ? bulkNote.trim() : null,
    }));

    const { error } = await supabase.from("membership_dues").insert(rows);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Bulk dues created", description: `${targets.length} members` });
    setShowBulk(false);
    setBulkDueDate("");
    setBulkAmountEur("");
    setBulkNote("");
    setBulkRole("all");
    await fetchData();
  };

  const exportCsv = () => {
    const csv = toCsv(
      dues.map((d) => ({
        id: d.id,
        due_date: d.due_date,
        member_name: memberNameById[d.membership_id] ?? "",
        membership_id: d.membership_id,
        amount_cents: d.amount_cents,
        currency: d.currency,
        status: d.status,
        paid_at: d.paid_at,
        note: d.note,
      }))
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dues_${clubId ?? "club"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Dues"
        subtitle={canManage ? `${unpaidCount} unpaid` : "Your dues"}
        rightSlot={
          <div className="flex gap-2">
            {dues.length > 0 && (
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            )}
            {canManage && (
              <>
                <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowBulk(true)} disabled={!clubId}>
                  <Layers className="w-4 h-4 mr-1" /> Bulk
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                  onClick={() => setShowCreate(true)}
                  disabled={!clubId}
                >
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || membershipLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Select a club to view dues.</p>
          </div>
        ) : dues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No dues yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {dues.map((d) => (
              <div key={d.id} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Due date</div>
                    <div className="font-display font-bold text-foreground">{d.due_date}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {d.amount_cents !== null ? `${(d.amount_cents / 100).toFixed(2)} ${d.currency ?? "EUR"}` : "—"}
                      {canManage ? ` • ${memberNameById[d.membership_id] ?? d.membership_id.slice(0, 8)}` : ""}
                    </div>
                    {d.note && <div className="mt-2 text-xs text-muted-foreground">{d.note}</div>}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        d.status === "paid"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : d.status === "waived"
                          ? "border-slate-500/30 bg-slate-500/10 text-slate-500"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {d.status.toUpperCase()}
                    </span>

                    {canManage && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => updateStatus(d, "paid")}>
                          Paid
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => updateStatus(d, "waived")}>
                          Waive
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => updateStatus(d, "due")}>
                          Due
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create single */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">New dues entry</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Member</div>
                <select
                  className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                  value={newMembershipId}
                  onChange={(e) => setNewMembershipId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {memberships
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.profiles?.display_name || m.id.slice(0, 8))} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Due date</div>
                <Input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Amount (EUR)</div>
                <Input value={newAmountEur} onChange={(e) => setNewAmountEur(e.target.value)} placeholder="e.g. 15" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Note (optional)</div>
                <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="e.g. February dues" />
              </div>

              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold" onClick={createDue}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulk(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">Bulk create dues</div>
              <Button variant="ghost" size="sm" onClick={() => setShowBulk(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Role filter</div>
                <select
                  className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                >
                  <option value="all">All active members</option>
                  <option value="player">Players</option>
                  <option value="member">Members</option>
                  <option value="parent">Parents</option>
                  <option value="trainer">Trainers</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Due date</div>
                <Input value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Amount (EUR)</div>
                <Input value={bulkAmountEur} onChange={(e) => setBulkAmountEur(e.target.value)} placeholder="e.g. 15" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Note (optional)</div>
                <Input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="e.g. March dues" />
              </div>

              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold" onClick={bulkCreate}>
                Create for matching members
              </Button>

              <div className="text-[10px] text-muted-foreground">
                Tip: we enforce uniqueness by (club_id, membership_id, due_date) in DB.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
