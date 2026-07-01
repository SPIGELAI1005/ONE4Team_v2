import { useMemo, useState } from "react";
import { Eye, Loader2, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  sendMarketplaceOfferDraft,
  withdrawMarketplaceOffer,
} from "@/hooks/use-marketplace";
import {
  MARKETPLACE_OFFER_STATUSES,
  type MarketplaceOfferRow,
  type MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import {
  enrichOffers,
  filterOffersByStatus,
  formatOfferPrice,
  type OfferWithContext,
} from "@/lib/marketplace-offer-utils";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceOfferStatusBadge } from "@/components/marketplace/marketplace-offer-status-badge";
import { MarketplaceOfferViewSheet } from "@/components/marketplace/marketplace-offer-view-sheet";
import { cn } from "@/lib/utils";

interface ProviderMarketplaceOffersPanelProps {
  offers: MarketplaceOfferRow[];
  requests: MarketplaceRequestRow[];
  onRefresh: () => void;
  onBrowseRequests?: () => void;
}

export function ProviderMarketplaceOffersPanel({
  offers,
  requests,
  onRefresh,
  onBrowseRequests,
}: ProviderMarketplaceOffersPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const o = m.provider.offers;
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewRow, setViewRow] = useState<OfferWithContext | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const enriched = useMemo(
    () => enrichOffers(offers, requests, []),
    [offers, requests],
  );

  const filtered = useMemo(
    () =>
      filterOffersByStatus(
        enriched,
        statusFilter === "all" ? "all" : (statusFilter as OfferWithContext["offer"]["status"]),
      ),
    [enriched, statusFilter],
  );

  const requestTitle = (requestId: string) =>
    requests.find((r) => r.id === requestId)?.title ?? o.unknownRequest;

  const runWithdraw = async (offerId: string) => {
    setBusyId(offerId);
    const { error } = await withdrawMarketplaceOffer(offerId);
    setBusyId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: o.withdrawnToast });
    onRefresh();
  };

  const runSendDraft = async (row: OfferWithContext) => {
    setBusyId(row.offer.id);
    const { error } = await sendMarketplaceOfferDraft(row.offer.id, row.offer.request_id);
    setBusyId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: o.sentToast });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder={o.filterStatus} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{o.filterAll}</SelectItem>
          {MARKETPLACE_OFFER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {o.statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-xs text-muted-foreground">
        {o.resultsCount.replace("{count}", String(filtered.length))}
      </p>

      {filtered.length === 0 ? (
        <MarketplaceEmptyState
          title={o.emptyTitle}
          description={o.emptyDesc}
          actionLabel={onBrowseRequests ? o.browseRequestsAction : undefined}
          onAction={onBrowseRequests}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const isBusy = busyId === row.offer.id;
            return (
              <article key={row.offer.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground">{row.offer.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.forRequest}: {requestTitle(row.offer.request_id)}
                    </p>
                  </div>
                  <MarketplaceOfferStatusBadge
                    status={row.offer.status}
                    label={o.statusLabels[row.offer.status]}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{o.price}: {formatOfferPrice(row.offer)}</span>
                  {row.offer.delivery_timeline ? (
                    <span>{o.timeline}: {row.offer.delivery_timeline}</span>
                  ) : null}
                </div>

                {row.offer.description ? (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {row.offer.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewRow(row)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {o.view}
                  </Button>
                  {row.offer.status === "draft" ? (
                    <Button size="sm" disabled={isBusy} onClick={() => void runSendDraft(row)}>
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-1 h-3.5 w-3.5" />
                      )}
                      {o.sendDraft}
                    </Button>
                  ) : null}
                  {["draft", "sent", "viewed"].includes(row.offer.status) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => void runWithdraw(row.offer.id)}
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      {o.withdraw}
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MarketplaceOfferViewSheet
        row={viewRow}
        open={viewRow != null}
        onOpenChange={(open) => !open && setViewRow(null)}
        mode="provider"
      />
    </div>
  );
}
