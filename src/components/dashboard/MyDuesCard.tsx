import { useCallback, useEffect, useState } from "react";
import { Loader2, Banknote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import { useMembershipId } from "@/hooks/use-membership-id";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  canMemberClaimDue,
  collectMembershipIdsForDuesView,
  formatDueAmount,
  mapOpenDuesWithClaims,
  type OpenDueRow,
} from "@/lib/my-dues";
import { DASHBOARD_CARD } from "@/lib/dashboard-page-shell";

export function MyDuesCard() {
  const { t, language } = useLanguage();
  const { activeClubId } = useActiveClub();
  const { membershipId } = useMembershipId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [dues, setDues] = useState<OpenDueRow[]>([]);
  const [paymentIban, setPaymentIban] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<string | null>(null);
  const [membershipRole, setMembershipRole] = useState<string>("member");

  const loadDues = useCallback(async () => {
    if (!activeClubId || !membershipId || !user) {
      setDues([]);
      return;
    }
    setLoading(true);
    try {
      const [{ data: clubRow }, { data: membershipRow }] = await Promise.all([
        supabase.from("clubs").select("payment_iban, payment_instructions").eq("id", activeClubId).maybeSingle(),
        supabase.from("club_memberships").select("role").eq("id", membershipId).maybeSingle(),
      ]);

      setPaymentIban((clubRow?.payment_iban as string | null) ?? null);
      setPaymentInstructions((clubRow?.payment_instructions as string | null) ?? null);
      const role = String(membershipRow?.role ?? "member");
      setMembershipRole(role);

      let wardIds: string[] = [];
      if (role === "parent_supporter") {
        const { data: links } = await supabase
          .from("club_member_guardian_links")
          .select("ward_membership_id")
          .eq("club_id", activeClubId)
          .eq("guardian_membership_id", membershipId);
        wardIds = (links ?? []).map((l) => String(l.ward_membership_id));
      }

      const membershipIds = collectMembershipIdsForDuesView({
        membershipId,
        role,
        wardMembershipIds: wardIds,
      });

      const { data: dueRows, error: dueError } = await supabase
        .from("membership_dues")
        .select("id, membership_id, due_date, amount_cents, currency, status, note")
        .eq("club_id", activeClubId)
        .eq("status", "due")
        .in("membership_id", membershipIds)
        .order("due_date", { ascending: true })
        .limit(20);
      if (dueError) throw dueError;

      const dueIds = (dueRows ?? []).map((r) => String(r.id));
      let pendingDueIds = new Set<string>();
      if (dueIds.length > 0) {
        const { data: claims } = await supabase
          .from("dues_payment_claims")
          .select("due_id")
          .eq("club_id", activeClubId)
          .eq("status", "pending")
          .in("due_id", dueIds);
        pendingDueIds = new Set((claims ?? []).map((c) => String(c.due_id)));
      }

      const wardNames = new Map<string, string>();
      wardIds.forEach((id) => wardNames.set(id, t.dashboard.myDuesWardLabel));

      const mapped = mapOpenDuesWithClaims(
        (dueRows ?? []).map((row) => ({
          id: String(row.id),
          membershipId: String(row.membership_id),
          dueDate: String(row.due_date),
          amountCents: row.amount_cents as number | null,
          currency: String(row.currency ?? "EUR"),
          status: String(row.status),
          note: (row.note as string | null) ?? null,
        })),
        pendingDueIds,
        wardNames,
      );
      setDues(mapped);
    } catch {
      setDues([]);
    } finally {
      setLoading(false);
    }
  }, [activeClubId, membershipId, user, t.dashboard.myDuesWardLabel]);

  useEffect(() => {
    void loadDues();
  }, [loadDues]);

  const claimPaid = async (dueId: string) => {
    if (!activeClubId) return;
    setClaimingId(dueId);
    try {
      const { error } = await supabase.rpc("submit_due_payment_claim", {
        _club_id: activeClubId,
        _due_id: dueId,
        _note: null,
      });
      if (error) throw error;
      toast({ title: t.dashboard.myDuesClaimSentTitle, description: t.dashboard.myDuesClaimSentDesc });
      await loadDues();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setClaimingId(null);
    }
  };

  if (!activeClubId || !membershipId) return null;

  const locale = language === "de" ? "de" : "en";

  return (
    <div className={DASHBOARD_CARD}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            {t.dashboard.myDuesTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t.dashboard.myDuesSubtitle}</p>
        </div>
      </div>

      {(paymentIban || paymentInstructions) && (
        <div className="rounded-2xl border border-border/60 bg-background/40 p-3 mb-4 text-xs space-y-1">
          <div className="font-medium text-foreground">{t.dashboard.myDuesPaymentInfo}</div>
          {paymentIban ? (
            <div className="text-muted-foreground">
              {t.dashboard.myDuesIban}: <span className="font-mono text-foreground">{paymentIban}</span>
            </div>
          ) : null}
          {paymentInstructions ? (
            <p className="text-muted-foreground whitespace-pre-wrap">{paymentInstructions}</p>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : dues.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.myDuesEmpty}</p>
      ) : (
        <div className="space-y-2">
          {dues.map((due) => (
            <div
              key={due.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-border/60 bg-background/40 p-3"
            >
              <div>
                {due.wardLabel && membershipRole === "parent_supporter" ? (
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{due.wardLabel}</div>
                ) : null}
                <div className="text-sm font-medium">{formatDueAmount(due.amountCents, due.currency, locale)}</div>
                <div className="text-xs text-muted-foreground">{due.dueDate}</div>
                {due.pendingClaim ? (
                  <div className="text-xs text-primary mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t.dashboard.myDuesClaimPending}
                  </div>
                ) : null}
              </div>
              {canMemberClaimDue(due) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={claimingId === due.id}
                  onClick={() => void claimPaid(due.id)}
                >
                  {claimingId === due.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : null}
                  {t.dashboard.myDuesClaimPaid}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
