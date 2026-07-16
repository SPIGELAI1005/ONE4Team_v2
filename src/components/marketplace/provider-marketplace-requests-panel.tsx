import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Send, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  MARKETPLACE_CATEGORIES,
  type MarketplaceOfferRow,
  type MarketplaceProviderProfileRow,
  type MarketplaceProviderType,
  type MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import {
  computeProviderRequestInboxKpis,
  filterRequestsForProvider,
  parseProviderRequestFiltersFromSearch,
  providerRequestFiltersToSearchParams,
} from "@/lib/marketplace-request-filters";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceRequestViewSheet } from "@/components/marketplace/marketplace-request-view-sheet";
import { MarketplaceSendOfferDialog } from "@/components/marketplace/marketplace-send-offer-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProviderMarketplaceRequestsPanelProps {
  requests: MarketplaceRequestRow[];
  myOffers: MarketplaceOfferRow[];
  profile: MarketplaceProviderProfileRow | null;
  providerType: MarketplaceProviderType;
  onRefresh: () => void;
}

export function ProviderMarketplaceRequestsPanel({
  requests,
  myOffers,
  profile,
  providerType,
  onRefresh,
}: ProviderMarketplaceRequestsPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const r = m.provider.requests;
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parseProviderRequestFiltersFromSearch(searchParams.toString()),
    [searchParams],
  );

  const [viewRequest, setViewRequest] = useState<MarketplaceRequestRow | null>(null);
  const [offerRequest, setOfferRequest] = useState<MarketplaceRequestRow | null>(null);

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const offeredIds = useMemo(
    () => new Set(myOffers.map((o) => o.request_id)),
    [myOffers],
  );

  const matchingBase = useMemo(
    () => filterRequestsForProvider(requests, providerType, profile?.categories ?? []),
    [requests, providerType, profile?.categories],
  );

  const filtered = useMemo(
    () =>
      filterRequestsForProvider(requests, providerType, profile?.categories ?? [], {
        category: filters.category,
        location: filters.location,
        budgetMin: filters.budgetMin,
        budgetMax: filters.budgetMax,
        status: filters.status,
        noOfferYet: filters.noOfferYet,
        offeredRequestIds: offeredIds,
      }),
    [requests, providerType, profile?.categories, filters, offeredIds],
  );

  const kpis = useMemo(
    () => computeProviderRequestInboxKpis(matchingBase, myOffers),
    [matchingBase, myOffers],
  );

  const patchFilters = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    setSearchParams(providerRequestFiltersToSearchParams(next, searchParams), { replace: true });
  };

  const hasOffer = (requestId: string) => offeredIds.has(requestId);

  if (!profile) {
    return (
      <MarketplaceEmptyState
        icon={Store}
        title={m.provider.empty.createTitle}
        description={m.provider.empty.createDesc}
        actionLabel={m.provider.empty.createAction}
        actionHref="/marketplace?view=listing"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className={cn(PARTNER_PANEL_CLASS, "p-3 text-center")}>
          <div className="text-lg font-display font-bold">{kpis.openMatching}</div>
          <div className="text-[11px] text-muted-foreground">{r.kpiOpen}</div>
        </div>
        <div className={cn(PARTNER_PANEL_CLASS, "p-3 text-center")}>
          <div className="text-lg font-display font-bold">{kpis.offered}</div>
          <div className="text-[11px] text-muted-foreground">{r.kpiOffered}</div>
        </div>
        <div className={cn(PARTNER_PANEL_CLASS, "p-3 text-center")}>
          <div className="text-lg font-display font-bold">{kpis.won}</div>
          <div className="text-[11px] text-muted-foreground">{r.kpiWon}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Select value={filters.category} onValueChange={(v) => patchFilters({ category: v })}>
          <SelectTrigger>
            <SelectValue placeholder={r.filterCategory} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{r.filterAll}</SelectItem>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabel(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={filters.location}
          onChange={(e) => patchFilters({ location: e.target.value })}
          placeholder={r.filterLocation}
        />

        <Select value={filters.status} onValueChange={(v) => patchFilters({ status: v })}>
          <SelectTrigger>
            <SelectValue placeholder={r.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{r.filterStatusAll}</SelectItem>
            <SelectItem value="open">{r.statusOpen}</SelectItem>
            <SelectItem value="offers_received">{r.statusOffersReceived}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={filters.budgetMin ?? ""}
          onChange={(e) =>
            patchFilters({ budgetMin: e.target.value === "" ? null : Number(e.target.value) })
          }
          placeholder={r.filterBudgetMin}
        />
        <Input
          type="number"
          value={filters.budgetMax ?? ""}
          onChange={(e) =>
            patchFilters({ budgetMax: e.target.value === "" ? null : Number(e.target.value) })
          }
          placeholder={r.filterBudgetMax}
        />

        <label className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <input
            type="checkbox"
            checked={filters.noOfferYet}
            onChange={(e) => patchFilters({ noOfferYet: e.target.checked })}
          />
          {r.filterNoOffer}
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        {r.resultsCount.replace("{count}", String(filtered.length))}
      </p>

      {filtered.length === 0 ? (
        <MarketplaceEmptyState title={r.emptyTitle} description={r.emptyDesc} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <article key={req.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
              <h3 className="font-display font-semibold text-foreground">{req.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {categoryLabel(req.category)}
                {req.location ? ` · ${req.location}` : ""}
                {req.budget_min != null || req.budget_max != null
                  ? ` · ${r.budget}: ${req.budget_min ?? "—"}–${req.budget_max ?? "—"}`
                  : ""}
              </p>
              {req.description ? (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{req.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewRequest(req)}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  {r.view}
                </Button>
                <Button
                  size="sm"
                  disabled={!profile || hasOffer(req.id)}
                  onClick={() => setOfferRequest(req)}
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {hasOffer(req.id) ? r.offerSent : m.provider.sendOffer}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <MarketplaceRequestViewSheet
        request={viewRequest}
        open={viewRequest != null}
        onOpenChange={(open) => !open && setViewRequest(null)}
        mode="provider"
      />

      <MarketplaceSendOfferDialog
        open={offerRequest != null}
        onOpenChange={(open) => !open && setOfferRequest(null)}
        request={offerRequest}
        profile={profile}
        providerType={providerType}
        onSent={() => {
          toast({ title: r.offerSentToast });
          onRefresh();
        }}
      />
    </div>
  );
}
