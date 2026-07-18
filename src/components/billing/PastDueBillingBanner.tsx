import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClubId } from "@/hooks/use-club-id";
import { useLanguage } from "@/hooks/use-language";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";

export function PastDueBillingBanner() {
  const { clubId } = useClubId();
  const { subscription } = useSubscription();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!clubId || subscription?.status !== "past_due") return null;

  async function openPortal() {
    if (!clubId) return;
    setBusy(true);
    try {
      const headers = await getEdgeFunctionAuthHeaders();
      const { data, error } = await supabase.functions.invoke("stripe-billing-portal", {
        headers,
        body: { clubId, returnUrl: `${window.location.origin}/settings` },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error(t.settingsPage.billingPortalFailed);
      window.location.href = url;
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : t.settingsPage.billingPortalFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-foreground">{t.settingsPage.pastDueTitle}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{t.settingsPage.pastDueDesc}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void openPortal()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
        {t.settingsPage.updatePaymentMethod}
      </Button>
    </div>
  );
}
