import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  GitCompare,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  acceptMarketplaceOffer,
  markMarketplaceOfferViewed,
  rejectMarketplaceOffer,
} from "@/hooks/use-marketplace";
import {
  MARKETPLACE_OFFER_STATUSES,
  type MarketplaceOfferRow,
  type MarketplaceProviderProfileRow,
  type MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import type { PartnerRow } from "@/lib/partner-workflow-models";
import {
  enrichOffers,
  filterOffersByStatus,
  formatOfferPrice,
  groupOffersByRequest,
  parseOfferAttachments,
  type OfferWithContext,
} from "@/lib/marketplace-offer-utils";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceOfferCompareDialog } from "@/components/marketplace/marketplace-offer-compare-dialog";
import { MarketplaceOfferStatusBadge } from "@/components/marketplace/marketplace-offer-status-badge";
import { MarketplaceOfferViewSheet } from "@/components/marketplace/marketplace-offer-view-sheet";
import { marketplacePartnerPath } from "@/lib/marketplace-club-relationship";
import { cn } from "@/lib/utils";

interface ClubMarketplaceOffersPanelProps {
  clubId: string;
  requests: MarketplaceRequestRow[];
  offers: MarketplaceOfferRow[];
  offerProviders: MarketplaceProviderProfileRow[];
  partners: PartnerRow[];
  canAcceptOffer: boolean;
  onRefresh: () => void;
}

export function ClubMarketplaceOffersPanel({
  clubId,
  requests,
  offers,
  offerProviders,
  partners,
  canAcceptOffer,
  onRefresh,
}: ClubMarketplaceOffersPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const o = m.club.offers;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewRow, setViewRow] = useState<OfferWithContext | null>(null);
  const [compareOffers, setCompareOffers] = useState<OfferWithContext[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const enriched = useMemo(
    () => enrichOffers(offers, requests, offerProviders),
    [offers, requests, offerProviders],
  );

  const filtered = useMemo(
    () =>
      filterOffersByStatus(
        enriched,
        statusFilter === "all" ? "all" : (statusFilter as OfferWithContext["offer"]["status"]),
      ),
    [enriched, statusFilter],
  );

  const grouped = useMemo(
    () => groupOffersByRequest(filtered, requests),
    [filtered, requests],
  );

  const openView = async (row: OfferWithContext) => {
    if (row.offer.status === "sent") {
      await markMarketplaceOfferViewed(row.offer.id);
      onRefresh();
    }
    setViewRow(row);
  };

  const toggleCompare = (offerId: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(offerId)) next.delete(offerId);
      else next.add(offerId);
      return next;
    });
  };

  const openCompare = () => {
    const selected = enriched.filter((row) => selectedForCompare.has(row.offer.id));
    if (selected.length < 2) {
      toast({ title: t.common.error, description: o.compareMin, variant: "destructive" });
      return;
    }
    const requestIds = new Set(selected.map((row) => row.offer.request_id));
    if (requestIds.size > 1) {
      toast({ title: t.common.error, description: o.compareSameRequest, variant: "destructive" });
      return;
    }
    setCompareOffers(selected);
    setCompareOpen(true);
  };

  const runAccept = async (row: OfferWithContext) => {
    if (!row.request || !row.provider) return;
    setBusyId(row.offer.id);
    const { error, partnerId } = await acceptMarketplaceOffer({
      offerId: row.offer.id,
      clubId,
      offer: row.offer,
      request: row.request,
      provider: row.provider,
    });
    setBusyId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: o.acceptedToast,
      description: o.acceptedPartnersHint,
    });
    if (partnerId) {
      navigate(marketplacePartnerPath(partnerId));
    }
    onRefresh();
  };

  const runReject = async (offerId: string) => {
    setBusyId(offerId);
    const { error } = await rejectMarketplaceOffer(offerId);
    setBusyId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: o.rejectedToast });
    onRefresh();
  };

  const partnerIdForOffer = (offerId: string, provider: OfferWithContext["provider"]) => {
    const fromPartner = partners.find((p) => p.marketplace_offer_id === offerId)?.id;
    if (fromPartner) return fromPartner;
    return provider?.partner_id ?? null;
  };
  const canActOn = (status: MarketplaceOfferRow["status"]) =>
    canAcceptOffer && (status === "sent" || status === "viewed");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
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

        {selectedForCompare.size >= 2 ? (
          <Button size="sm" variant="outline" onClick={openCompare}>
            <GitCompare className="mr-1 h-4 w-4" />
            {o.compareSelected} ({selectedForCompare.size})
          </Button>
        ) : null}
      </div>

      {grouped.length === 0 ? (
        <MarketplaceEmptyState title={m.club.empty.noOffersTitle} description={m.club.empty.noOffersDesc} />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ request, offers: requestOffers }) => (
            <section key={request.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{request.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {requestOffers.length} {o.offersForRequest}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {requestOffers.map((row) => {
                  const isBusy = busyId === row.offer.id;
                  const docCount = parseOfferAttachments(row.offer.attachments).length;
                  return (
                    <article key={row.offer.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedForCompare.has(row.offer.id)}
                              onCheckedChange={() => toggleCompare(row.offer.id)}
                              aria-label={o.selectForCompare}
                            />
                            <h4 className="font-display font-semibold text-foreground">
                              {row.provider?.provider_name ?? row.offer.title}
                            </h4>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.providerTypes[row.offer.provider_role]}
                            {row.offer.delivery_timeline ? ` · ${row.offer.delivery_timeline}` : ""}
                          </p>
                        </div>
                        <MarketplaceOfferStatusBadge
                          status={row.offer.status}
                          label={o.statusLabels[row.offer.status]}
                        />
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <span>{o.price}: {formatOfferPrice(row.offer)}</span>
                        <span>
                          {o.includedServices}:{" "}
                          {row.offer.included_services.length || "—"}
                        </span>
                        <span>{o.documents}: {docCount}</span>
                        <span>{o.offerTitle}: {row.offer.title}</span>
                      </div>

                      {row.offer.description ? (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {row.offer.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void openView(row)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          {o.view}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate("/communication")}>
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          {o.message}
                        </Button>
                        {row.offer.status === "accepted" ? (
                          (() => {
                            const partnerId = partnerIdForOffer(row.offer.id, row.provider);
                            return partnerId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(marketplacePartnerPath(partnerId))}
                              >
                                {o.viewPartner}
                              </Button>
                            ) : null;
                          })()
                        ) : null}
                        {canActOn(row.offer.status) ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void runAccept(row)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-3.5 w-3.5" />
                              )}
                              {o.accept}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => void runReject(row.offer.id)}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              {o.reject}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <MarketplaceOfferViewSheet
        row={viewRow}
        open={viewRow != null}
        onOpenChange={(open) => !open && setViewRow(null)}
        mode="club"
      />

      <MarketplaceOfferCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        offers={compareOffers}
      />
    </div>
  );
}
