import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, PiggyBank, Plus, RotateCcw, X } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/use-permissions";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import {
  canAccessTeamLedgerUi,
  formatLedgerAmount,
  TEAM_LEDGER_CATEGORIES,
  type TeamLedgerCategory,
  type TeamLedgerDirection,
  type TeamLedgerEntry,
  type TeamLedgerEntryStatus,
} from "@/lib/team-ledger";
import {
  approveTeamLedgerEntry,
  fetchTeamLedgerBalance,
  listTeamLedgerEntries,
  postTeamLedgerEntry,
  rejectTeamLedgerEntry,
  resubmitTeamLedgerEntry,
} from "@/lib/team-ledger-api";

export default function TeamLedger() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const { t } = useLanguage();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const allowed = canAccessTeamLedgerUi(gateRole) || perms.isTrainer || perms.isAdmin;
  const canReview = perms.isTrainer || perms.isAdmin;

  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");
  const [entries, setEntries] = useState<TeamLedgerEntry[]>([]);
  const [balance, setBalance] = useState({ balance: 0, totalIn: 0, totalOut: 0, currency: "EUR" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  const [direction, setDirection] = useState<TeamLedgerDirection>("in");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TeamLedgerCategory>("contribution");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const categoryLabel = useCallback(
    (value: TeamLedgerCategory) =>
      t.teamLedgerPage.categories[value as keyof typeof t.teamLedgerPage.categories] ?? value,
    [t],
  );

  const statusLabel = useCallback(
    (status: TeamLedgerEntryStatus | undefined) => {
      if (status === "pending") return t.teamLedgerPage.statusPending;
      if (status === "rejected") return t.teamLedgerPage.statusRejected;
      return t.teamLedgerPage.statusApproved;
    },
    [t.teamLedgerPage.statusApproved, t.teamLedgerPage.statusPending, t.teamLedgerPage.statusRejected],
  );

  useEffect(() => {
    if (!clubId || !allowed) return;
    void (async () => {
      const { data } = await supabase.from("teams").select("id, name").eq("club_id", clubId).order("name");
      const rows = (data as { id: string; name: string }[]) ?? [];
      setTeams(rows);
      setTeamId((prev) => prev || rows[0]?.id || "");
    })();
  }, [allowed, clubId]);

  const reload = useCallback(async () => {
    if (!clubId || !teamId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [entriesRes, balanceRes] = await Promise.all([
      listTeamLedgerEntries({ clubId, teamId }),
      fetchTeamLedgerBalance(teamId),
    ]);
    if (entriesRes.error) {
      toast({ title: t.common.error, description: entriesRes.error.message, variant: "destructive" });
      setEntries([]);
    } else {
      setEntries(entriesRes.data);
    }
    if (balanceRes.error) {
      toast({ title: t.common.error, description: balanceRes.error, variant: "destructive" });
    } else {
      setBalance({
        balance: balanceRes.balance,
        totalIn: balanceRes.totalIn,
        totalOut: balanceRes.totalOut,
        currency: balanceRes.currency,
      });
    }
    setLoading(false);
  }, [clubId, t.common.error, teamId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const teamName = useMemo(
    () => teams.find((team) => team.id === teamId)?.name ?? "",
    [teamId, teams],
  );

  async function handlePost() {
    const parsed = Number(amount.replace(",", "."));
    if (!teamId || !Number.isFinite(parsed) || parsed <= 0) return;
    setSaving(true);
    const result = await postTeamLedgerEntry({
      teamId,
      direction,
      amount: parsed,
      category,
      description: description.trim() || null,
      entryDate,
    });
    setSaving(false);
    if (result.error) {
      toast({ title: t.common.error, description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: t.teamLedgerPage.entrySubmitted });
    setAmount("");
    setDescription("");
    await reload();
  }

  async function handleApprove(entryId: string) {
    setBusyEntryId(entryId);
    const result = await approveTeamLedgerEntry(entryId);
    setBusyEntryId(null);
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    toast({ title: t.teamLedgerPage.entryApproved });
    await reload();
  }

  async function handleReject(entryId: string) {
    setBusyEntryId(entryId);
    const result = await rejectTeamLedgerEntry(entryId);
    setBusyEntryId(null);
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    toast({ title: t.teamLedgerPage.entryRejected });
    await reload();
  }

  async function handleResubmit(entry: TeamLedgerEntry) {
    setBusyEntryId(entry.id);
    const result = await resubmitTeamLedgerEntry({ entryId: entry.id });
    setBusyEntryId(null);
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    toast({ title: t.teamLedgerPage.entryResubmitted });
    await reload();
  }

  if (clubLoading) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <DashboardHeaderSlot title={t.teamLedgerPage.title} subtitle={t.teamLedgerPage.subtitle} />
        <div className={DASHBOARD_PAGE_INNER}>
          <p className="text-sm text-muted-foreground">{t.teamLedgerPage.forbidden}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={t.teamLedgerPage.title} subtitle={t.teamLedgerPage.subtitle} />
      <div className={`${DASHBOARD_PAGE_INNER} space-y-5`}>
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-950 dark:text-amber-100">
          {t.teamLedgerPage.notClubFinance}
        </div>
        <p className="text-xs text-muted-foreground">{t.teamLedgerPage.approvalHint}</p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t.teamLedgerPage.team}</Label>
            <Select value={teamId || "__none"} onValueChange={(v) => setTeamId(v === "__none" ? "" : v)}>
              <SelectTrigger className="h-10 w-[220px] rounded-xl">
                <SelectValue placeholder={t.teamLedgerPage.team} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {teamId ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <BalanceCard
              label={t.teamLedgerPage.balance}
              value={formatLedgerAmount(balance.balance, balance.currency)}
              highlight
            />
            <BalanceCard
              label={t.teamLedgerPage.totalIn}
              value={formatLedgerAmount(balance.totalIn, balance.currency)}
            />
            <BalanceCard
              label={t.teamLedgerPage.totalOut}
              value={formatLedgerAmount(balance.totalOut, balance.currency)}
            />
          </div>
        ) : null}

        {teamId ? (
          <div className="rounded-3xl border border-border/60 bg-card/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Plus className="h-4 w-4" />
              {t.teamLedgerPage.addEntry} {teamName ? `· ${teamName}` : ""}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t.teamLedgerPage.direction}</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as TeamLedgerDirection)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{t.teamLedgerPage.directionIn}</SelectItem>
                    <SelectItem value="out">{t.teamLedgerPage.directionOut}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.teamLedgerPage.amount}</Label>
                <Input data-testid="ledger-amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.teamLedgerPage.category}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TeamLedgerCategory)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_LEDGER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.teamLedgerPage.date}</Label>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <Textarea
              data-testid="ledger-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.teamLedgerPage.description}
              className="min-h-[70px] rounded-xl"
            />
            <Button data-testid="ledger-save" className="rounded-2xl" disabled={saving || !amount} onClick={() => void handlePost()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PiggyBank className="mr-2 h-4 w-4" />}
              {t.teamLedgerPage.saveEntry}
            </Button>
          </div>
        ) : null}

        <div className="rounded-3xl border border-border/60 bg-card/40 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">{t.teamLedgerPage.entries}</div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.teamLedgerPage.empty}</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => {
                const status = entry.status ?? "approved";
                const isSelf = Boolean(user?.id && entry.submitted_by === user.id);
                const showReview = canReview && status === "pending" && !isSelf;
                const showResubmit = status === "rejected" && (isSelf || canReview);
                return (
                  <li
                    key={entry.id}
                    data-testid="ledger-entry"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {entry.direction === "in" ? "+" : "−"}
                        {formatLedgerAmount(entry.amount, balance.currency)} · {categoryLabel(entry.category)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.entry_date}
                        {entry.description ? ` · ${entry.description}` : ""}
                        {" · "}
                        <span
                          className={
                            status === "pending"
                              ? "text-amber-700 dark:text-amber-300"
                              : status === "rejected"
                                ? "text-destructive"
                                : "text-emerald-700 dark:text-emerald-300"
                          }
                        >
                          {statusLabel(status)}
                        </span>
                        {entry.rejection_reason ? ` · ${entry.rejection_reason}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {showReview ? (
                        <>
                          <Button
                            data-testid="ledger-approve"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg"
                            disabled={busyEntryId === entry.id}
                            onClick={() => void handleApprove(entry.id)}
                          >
                            {busyEntryId === entry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-3.5 w-3.5" />
                            )}
                            {t.teamLedgerPage.approve}
                          </Button>
                          <Button
                            data-testid="ledger-reject"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-destructive"
                            disabled={busyEntryId === entry.id}
                            onClick={() => void handleReject(entry.id)}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            {t.teamLedgerPage.reject}
                          </Button>
                        </>
                      ) : null}
                      {showResubmit ? (
                        <Button
                          data-testid="ledger-resubmit"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg"
                          disabled={busyEntryId === entry.id}
                          onClick={() => void handleResubmit(entry)}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          {t.teamLedgerPage.resubmit}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-3xl border px-4 py-3 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/40"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
