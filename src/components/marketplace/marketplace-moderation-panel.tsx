import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { cn } from "@/lib/utils";

interface MarketplaceModerationPanelProps {
  onChanged?: () => void;
}

export function MarketplaceModerationPanel({ onChanged }: MarketplaceModerationPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage.club.moderation;
  const { toast } = useToast();
  const [rows, setRows] = useState<MarketplaceProviderProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .select("*")
      .eq("listing_status", "submitted_for_review")
      .order("updated_at", { ascending: true })
      .limit(100);
    if (error) {
      setRows([]);
    } else {
      setRows((data as MarketplaceProviderProfileRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const approve = async (row: MarketplaceProviderProfileRow) => {
    setBusyId(row.id);
    const { error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({
        listing_status: "active",
        rejection_reason: null,
        verification_status: row.verification_status === "unverified" ? "pending" : row.verification_status,
      })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: m.actionFailed, variant: "destructive" });
      return;
    }
    toast({ title: m.approvedToast });
    void reload();
    onChanged?.();
  };

  const reject = async (row: MarketplaceProviderProfileRow) => {
    setBusyId(row.id);
    const reason = (rejectReason[row.id] ?? "").trim();
    const { error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({
        listing_status: "rejected",
        rejection_reason: reason || m.defaultRejectReason,
      })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: m.actionFailed, variant: "destructive" });
      return;
    }
    toast({ title: m.rejectedToast });
    void reload();
    onChanged?.();
  };

  const toggleVerified = async (row: MarketplaceProviderProfileRow) => {
    setBusyId(row.id);
    const next = row.verification_status === "verified" ? "unverified" : "verified";
    const { error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({ verification_status: next })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: m.actionFailed, variant: "destructive" });
      return;
    }
    toast({ title: next === "verified" ? m.verifiedToast : m.unverifiedToast });
    void reload();
    onChanged?.();
  };

  const toggleFeatured = async (row: MarketplaceProviderProfileRow) => {
    setBusyId(row.id);
    const { error } = await supabaseDynamic
      .from("marketplace_provider_profiles")
      .update({ is_featured: !row.is_featured })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: m.actionFailed, variant: "destructive" });
      return;
    }
    toast({ title: row.is_featured ? m.unfeaturedToast : m.featuredToast });
    void reload();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        {m.loading}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <MarketplaceEmptyState title={m.emptyTitle} description={m.emptyDesc} />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{m.subtitle}</p>
      {rows.map((row) => (
        <article key={row.id} className={cn(PARTNER_PANEL_CLASS, "p-4 space-y-3")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-foreground">{row.provider_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {row.provider_type}
                {row.location ? ` · ${row.location}` : ""}
              </p>
              {row.short_description ? (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{row.short_description}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void toggleVerified(row)}
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {row.verification_status === "verified" ? m.unverify : m.verify}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void toggleFeatured(row)}
              >
                <Star className="mr-1 h-3.5 w-3.5" />
                {row.is_featured ? m.unfeature : m.feature}
              </Button>
            </div>
          </div>
          <Textarea
            value={rejectReason[row.id] ?? ""}
            onChange={(e) => setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))}
            placeholder={m.rejectReasonPlaceholder}
            className="min-h-[64px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busyId === row.id} onClick={() => void approve(row)}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {m.approve}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId === row.id}
              onClick={() => void reject(row)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {m.reject}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
