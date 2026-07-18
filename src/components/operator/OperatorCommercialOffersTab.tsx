import { Gift } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useLanguage } from "@/hooks/use-language";
import { FOUNDING_CLUB_OFFER_CODE } from "@/lib/plan-catalog";
import { potentialKickoffMrr } from "@/lib/effective-plan";

interface CommercialOfferRow {
  id: string;
  code: string;
  name_en: string;
  name_de: string;
  status: string;
  max_redemptions: number | null;
  duration_months: number;
  promotional_price: number;
  grace_period_days: number;
}

interface RedemptionRow {
  id: string;
  status: string;
  club_id: string;
  expires_at: string | null;
  redeemed_at: string;
}

export function OperatorCommercialOffersTab({ canManage }: { canManage: boolean }) {
  const { language } = useLanguage();
  const [offers, setOffers] = useState<CommercialOfferRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [offersRes, redemptionsRes] = await Promise.all([
        supabaseDynamic.from("commercial_offers").select("*").order("created_at", { ascending: false }),
        supabaseDynamic
          .from("club_offer_redemptions")
          .select("id, status, club_id, expires_at, redeemed_at")
          .order("redeemed_at", { ascending: false })
          .limit(200),
      ]);
      setOffers((offersRes.data as CommercialOfferRow[]) ?? []);
      setRedemptions((redemptionsRes.data as RedemptionRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function setStatus(code: string, status: string) {
    if (!canManage) return;
    setBusy(true);
    try {
      const { error } = await supabaseDynamic.rpc("set_commercial_offer_status", {
        _offer_code: code,
        _status: status,
        _reason: `operator_ui_${status}`,
      });
      if (error) throw error;
      toast.success(`Offer ${code} → ${status}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update offer");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const activeRedemptions = redemptions.filter((r) =>
    ["active", "expiring", "grace", "reserved"].includes(r.status),
  );
  const converted = redemptions.filter((r) => r.status === "converted").length;
  const conversionRate =
    redemptions.length > 0 ? Math.round((converted / redemptions.length) * 1000) / 10 : 0;
  const potentialMrr = activeRedemptions.length * potentialKickoffMrr(250);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Active / grace redemptions</p>
          <p className="text-2xl font-semibold tabular-nums">{activeRedemptions.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Conversion rate</p>
          <p className="text-2xl font-semibold tabular-nums">{conversionRate}%</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Potential conversion MRR (est.)</p>
          <p className="text-2xl font-semibold tabular-nums">EUR {potentialMrr.toFixed(0)}</p>
        </div>
      </div>

      {offers.map((offer) => {
        const name = language === "de" ? offer.name_de : offer.name_en;
        const used = redemptions.filter((r) => r.status !== "cancelled").length;
        // Cap is global per offer; redemptions table is not joined here so approximate with all rows when single offer.
        const remaining =
          offer.max_redemptions == null ? null : Math.max(0, offer.max_redemptions - used);
        return (
          <div key={offer.id} className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-foreground/5 p-2">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{offer.code}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {offer.duration_months} months · EUR {Number(offer.promotional_price).toFixed(0)} ·
                    status <span className="font-medium text-foreground">{offer.status}</span>
                    {remaining != null ? ` · ${remaining} remaining` : ""}
                  </p>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {offer.status !== "active" ? (
                    <Button size="sm" disabled={busy} onClick={() => void setStatus(offer.code, "active")}>
                      Activate
                    </Button>
                  ) : null}
                  {offer.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void setStatus(offer.code, "paused")}
                    >
                      Pause
                    </Button>
                  ) : null}
                  {offer.status !== "closed" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void setStatus(offer.code, "closed")}
                    >
                      Close
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {offer.code === FOUNDING_CLUB_OFFER_CODE ? (
              <p className="text-xs text-muted-foreground">
                Founding Club: Kick-off promotional access. Operator module entitlements still apply at
                runtime for pilot unlocks (chat, AI, etc.).
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 text-sm font-medium">Recent redemptions</div>
        <div className="max-h-72 overflow-auto divide-y divide-border/40">
          {redemptions.slice(0, 50).map((r) => (
            <div key={r.id} className="px-4 py-2 text-xs flex flex-wrap gap-3 justify-between">
              <span className="font-mono text-muted-foreground">{r.club_id.slice(0, 8)}…</span>
              <span className="font-medium">{r.status}</span>
              <span className="text-muted-foreground">
                {r.expires_at
                  ? `expires ${new Date(r.expires_at).toLocaleDateString()}`
                  : `redeemed ${new Date(r.redeemed_at).toLocaleDateString()}`}
              </span>
            </div>
          ))}
          {redemptions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No redemptions yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
