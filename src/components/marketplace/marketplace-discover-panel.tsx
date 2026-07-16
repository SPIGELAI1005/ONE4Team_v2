import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Store, X } from "lucide-react";
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
import { toggleMarketplaceSavedProvider } from "@/hooks/use-marketplace";
import {
  DEFAULT_MARKETPLACE_DISCOVER_FILTERS,
  filterMarketplaceProviders,
  hasActiveDiscoverFilters,
  sortMarketplaceProvidersFeaturedFirst,
  type MarketplaceDiscoverFilters,
} from "@/lib/marketplace-discover";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_PROVIDER_TYPES,
  type MarketplaceProviderProfileRow,
  type MarketplaceSavedProviderRow,
} from "@/lib/marketplace-models";
import type { ClubProviderRelationshipStatus } from "@/lib/marketplace-club-relationship";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceProviderCard } from "@/components/marketplace/marketplace-provider-card";
import {
  MarketplaceProviderProfileSheet,
  type MarketplaceProviderProfileLabels,
} from "@/components/marketplace/marketplace-provider-profile-sheet";
import { cn } from "@/lib/utils";

interface MarketplaceDiscoverPanelProps {
  clubId: string;
  providers: MarketplaceProviderProfileRow[];
  saved: MarketplaceSavedProviderRow[];
  canCreateRequest: boolean;
  onCreateRequest: () => void;
  onSavedChange: () => void;
  relationshipMap?: Map<string, ClubProviderRelationshipStatus>;
  relationshipLabel?: (status: ClubProviderRelationshipStatus) => string | null;
}

export function MarketplaceDiscoverPanel({
  clubId,
  providers,
  saved,
  canCreateRequest,
  onCreateRequest,
  onSavedChange,
  relationshipMap,
  relationshipLabel,
}: MarketplaceDiscoverPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const d = m.club.discover;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<MarketplaceDiscoverFilters>(DEFAULT_MARKETPLACE_DISCOVER_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [previewProvider, setPreviewProvider] = useState<MarketplaceProviderProfileRow | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const savedIds = useMemo(
    () => new Set(saved.map((row) => row.provider_profile_id)),
    [saved],
  );

  const filteredProviders = useMemo(
    () => sortMarketplaceProvidersFeaturedFirst(filterMarketplaceProviders(providers, savedIds, filters)),
    [providers, savedIds, filters],
  );

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const profileLabels: MarketplaceProviderProfileLabels = useMemo(
    () => ({
      verified: m.verified,
      featured: d.featured,
      serviceArea: d.serviceArea,
      serviceAreaRemote: d.serviceAreaRemote,
      serviceAreaLocal: d.serviceAreaLocal,
      serviceAreaHybrid: d.serviceAreaHybrid,
      serviceAreaKm: d.serviceAreaKm,
      packages: d.packages,
      services: d.services,
      references: d.references,
      documents: d.documents,
      documentsEmpty: d.documentsEmpty,
      contact: d.contact,
      viewProfile: d.viewProfile,
      save: d.save,
      saved: d.saved,
      requestOffer: d.requestOffer,
      message: d.message,
      noPackages: d.noPackages,
      noReferences: d.noReferences,
      priceFrom: d.priceFrom,
    }),
    [m, d],
  );

  const cardLabels = useMemo(
    () => ({
      viewProfile: d.viewProfile,
      save: d.save,
      saved: d.saved,
      requestOffer: d.requestOffer,
      message: d.message,
      references: d.referencesCount,
      featured: d.featured,
    }),
    [d],
  );

  const patchFilters = (patch: Partial<MarketplaceDiscoverFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const clearFilters = () => setFilters(DEFAULT_MARKETPLACE_DISCOVER_FILTERS);

  const handleToggleSave = async (provider: MarketplaceProviderProfileRow) => {
    setSavingId(provider.id);
    const isSaved = savedIds.has(provider.id);
    const { error } = await toggleMarketplaceSavedProvider(clubId, provider.id, isSaved);
    setSavingId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    onSavedChange();
  };

  const relationshipFor = (providerId: string) => {
    const status = relationshipMap?.get(providerId) ?? "none";
    const label = relationshipLabel?.(status);
    if (!label || status === "none") return undefined;
    return { status, label };
  };

  const openPreview = (provider: MarketplaceProviderProfileRow) => setPreviewProvider(provider);

  return (
    <div className="space-y-4">
      <div className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            {d.filtersTitle}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveDiscoverFilters(filters) ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                {d.clearFilters}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersExpanded((v) => !v)}
            >
              {filtersExpanded ? d.hideFilters : d.showFilters}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "space-y-3",
            !filtersExpanded && "hidden lg:block",
          )}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="border-border/60 bg-background/80 pl-9"
              placeholder={m.club.searchProviders}
              value={filters.q}
              onChange={(e) => patchFilters({ q: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.type} onValueChange={(value) => patchFilters({ type: value })}>
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder={m.club.filterType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{m.club.filterAllTypes}</SelectItem>
                {MARKETPLACE_PROVIDER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {m.providerTypes[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(value) => patchFilters({ category: value })}>
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder={m.club.filterCategory} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{m.club.filterAllCategories}</SelectItem>
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="bg-background/80"
              placeholder={d.locationPlaceholder}
              value={filters.location}
              onChange={(e) => patchFilters({ location: e.target.value })}
            />

            <Select
              value={filters.serviceArea}
              onValueChange={(value) =>
                patchFilters({ serviceArea: value as MarketplaceDiscoverFilters["serviceArea"] })
              }
            >
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder={d.serviceAreaFilter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{d.serviceAreaAll}</SelectItem>
                <SelectItem value="remote">{d.serviceAreaRemote}</SelectItem>
                <SelectItem value="local">{d.serviceAreaLocal}</SelectItem>
                <SelectItem value="hybrid">{d.serviceAreaHybrid}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={filters.verifiedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => patchFilters({ verifiedOnly: !filters.verifiedOnly })}
            >
              {m.club.verifiedOnly}
            </Button>
            <Button
              type="button"
              variant={filters.savedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => patchFilters({ savedOnly: !filters.savedOnly })}
            >
              {m.club.savedOnly}
            </Button>
            <Button
              type="button"
              variant={filters.referencesFilter === "with_references" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                patchFilters({
                  referencesFilter:
                    filters.referencesFilter === "with_references" ? "all" : "with_references",
                })
              }
            >
              {d.withReferences}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {d.resultsCount.replace("{count}", String(filteredProviders.length))}
      </p>

      {filteredProviders.length === 0 ? (
        <MarketplaceEmptyState
          icon={Store}
          title={m.club.empty.noProvidersTitle}
          description={m.club.empty.noProvidersDesc}
          actionLabel={canCreateRequest ? m.club.empty.createRequestAction : undefined}
          onAction={canCreateRequest ? onCreateRequest : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => (
            <MarketplaceProviderCard
              key={provider.id}
              provider={provider}
              categoryLabel={categoryLabel}
              typeLabel={(type) => m.providerTypes[type] ?? type}
              verifiedLabel={m.verified}
              labels={cardLabels}
              isSaved={savedIds.has(provider.id)}
              saveLoading={savingId === provider.id}
              onView={() => openPreview(provider)}
              onSave={() => void handleToggleSave(provider)}
              onRequestOffer={canCreateRequest ? onCreateRequest : undefined}
              onMessage={() => navigate("/communication")}
              relationship={relationshipFor(provider.id)}
            />
          ))}
        </div>
      )}

      <MarketplaceProviderProfileSheet
        provider={previewProvider}
        open={previewProvider != null}
        onOpenChange={(open) => {
          if (!open) setPreviewProvider(null);
        }}
        categoryLabel={categoryLabel}
        typeLabel={(type) => m.providerTypes[type] ?? type}
        labels={profileLabels}
        isSaved={previewProvider ? savedIds.has(previewProvider.id) : false}
        onSave={
          previewProvider
            ? () => void handleToggleSave(previewProvider)
            : undefined
        }
        onRequestOffer={canCreateRequest ? onCreateRequest : undefined}
        onMessage={() => navigate("/communication")}
        relationship={
          previewProvider ? relationshipFor(previewProvider.id) : undefined
        }
      />
    </div>
  );
}
