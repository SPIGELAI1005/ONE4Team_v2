import { useMemo, useState } from "react";
import { Eye, Send, Store } from "lucide-react";
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
  MARKETPLACE_CATEGORIES,
  type MarketplaceOfferRow,
  type MarketplaceProviderProfileRow,
  type MarketplaceProviderType,
  type MarketplaceRequestRow,
} from "@/lib/marketplace-models";
import { filterRequestsForProvider } from "@/lib/marketplace-request-filters";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceRequestViewSheet } from "@/components/marketplace/marketplace-request-view-sheet";
import { MarketplaceSendOfferDialog } from "@/components/marketplace/marketplace-send-offer-dialog";
import { cn } from "@/lib/utils";

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

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewRequest, setViewRequest] = useState<MarketplaceRequestRow | null>(null);
  const [offerRequest, setOfferRequest] = useState<MarketplaceRequestRow | null>(null);

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const filtered = useMemo(
    () =>
      filterRequestsForProvider(
        requests,
        providerType,
        profile?.categories ?? [],
        { category: categoryFilter },
      ),
    [requests, providerType, profile?.categories, categoryFilter],
  );

  const hasOffer = (requestId: string) => myOffers.some((o) => o.request_id === requestId);

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
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-full max-w-xs">
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

      <p className="text-xs text-muted-foreground">{r.resultsCount.replace("{count}", String(filtered.length))}</p>

      {filtered.length === 0 ? (
        <MarketplaceEmptyState
          title={r.emptyTitle}
          description={r.emptyDesc}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <article key={req.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
              <h3 className="font-display font-semibold text-foreground">{req.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {categoryLabel(req.category)}
                {req.location ? ` · ${req.location}` : ""}
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
