import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useClubMarketplace } from "@/hooks/use-marketplace";
import { getClubMarketplaceTabs, canCreateMarketplaceRequest, canManageClubMarketplace, canModerateMarketplaceListings, canAcceptMarketplaceOffer } from "@/lib/marketplace-access";
import {
  normalizeClubMarketplaceView,
  clubMarketplaceTabLabel,
  type ClubMarketplaceTab,
} from "@/lib/marketplace-product-structure";
import { useMarketplaceTabLabels } from "@/hooks/use-marketplace-tab-labels";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { ClubMarketplaceRequestsPanel } from "@/components/marketplace/club-marketplace-requests-panel";
import { ClubMarketplaceOffersPanel } from "@/components/marketplace/club-marketplace-offers-panel";
import { MarketplaceClubHero } from "@/components/marketplace/marketplace-club-hero";
import { MarketplaceProviderCard } from "@/components/marketplace/marketplace-provider-card";
import { MarketplaceDiscoverPanel } from "@/components/marketplace/marketplace-discover-panel";
import { MarketplaceKpiStrip } from "@/components/marketplace/marketplace-kpi-strip";
import { MarketplaceTabBar } from "@/components/marketplace/marketplace-tab-bar";
import { MarketplaceSchemaBanner } from "@/components/marketplace/marketplace-schema-banner";
import { MarketplaceModerationPanel } from "@/components/marketplace/marketplace-moderation-panel";
import { MarketplaceEngagementReviewsPanel } from "@/components/marketplace/marketplace-engagement-reviews-panel";
import {
  buildClubProviderRelationshipMap,
  type ClubProviderRelationshipStatus,
} from "@/lib/marketplace-club-relationship";
import { cn } from "@/lib/utils";

export default function ClubMarketplaceHub() {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabLabels = useMarketplaceTabLabels();

  const tabs = useMemo(
    () => getClubMarketplaceTabs(perms.role, perms.assignments),
    [perms.role, perms.assignments],
  );
  const canCreateRequest = canCreateMarketplaceRequest(perms.role, perms.assignments);
  const canManage = canManageClubMarketplace(perms.role, perms.assignments);
  const canModerate = canModerateMarketplaceListings(perms.role, perms.assignments);
  const canAcceptOffer = canAcceptMarketplaceOffer(perms.role, perms.assignments);

  const normalizedView = normalizeClubMarketplaceView(searchParams.get("view"));
  const tab: ClubMarketplaceTab =
    normalizedView && tabs.includes(normalizedView) ? normalizedView : tabs[0] ?? "overview";

  const { providers, requests, offers, offerProviders, partners, partnerTasks, saved, pendingApprovals, schemaReady, loading, reload } =
    useClubMarketplace(clubId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const setTab = (next: ClubMarketplaceTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    params.delete("tab");
    setSearchParams(params, { replace: true });
  };

  const openCreateRequest = () => {
    setTab("requests");
    setCreateDialogOpen(true);
  };

  const savedProviders = useMemo(
    () => providers.filter((row) => saved.some((s) => s.provider_profile_id === row.id)),
    [providers, saved],
  );

  const providerPartnerIds = useMemo(
    () => new Map(providers.map((p) => [p.id, p.partner_id])),
    [providers],
  );

  const relationshipMap = useMemo(
    () =>
      buildClubProviderRelationshipMap(
        providers.map((p) => p.id),
        {
          savedProviderIds: new Set(saved.map((s) => s.provider_profile_id)),
          offers,
          providerPartnerIds,
          partnerTasks,
        },
      ),
    [providers, saved, offers, providerPartnerIds, partnerTasks],
  );

  const relationshipLabel = (status: ClubProviderRelationshipStatus) => {
    if (status === "none") return null;
    return m.club.relationshipStatus[status];
  };

  const kpis = useMemo(
    () => ({
      verifiedProviders: providers.filter((p) => p.verification_status === "verified").length,
      savedProviders: saved.length,
      openRequests: requests.filter((r) => r.status === "open" || r.status === "offers_received").length,
      offersReceived: offers.filter((o) => o.status === "sent" || o.status === "viewed").length,
      pendingApprovals,
    }),
    [providers, requests, offers, saved, pendingApprovals],
  );

  const kpiItems = useMemo(
    () => [
      { label: m.club.kpi.verifiedProviders, value: kpis.verifiedProviders },
      { label: m.club.kpi.savedProviders, value: kpis.savedProviders },
      { label: m.club.kpi.openRequests, value: kpis.openRequests },
      { label: m.club.kpi.offersReceived, value: kpis.offersReceived },
      {
        label: m.club.kpi.pendingApprovals,
        value: kpis.pendingApprovals,
        highlight: canModerate && kpis.pendingApprovals > 0,
      },
    ],
    [m.club.kpi, kpis, canModerate],
  );

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const cardLabels = useMemo(
    () => ({
      viewProfile: m.club.discover.viewProfile,
      save: m.club.discover.save,
      saved: m.club.discover.saved,
      requestOffer: m.club.discover.requestOffer,
      message: m.club.discover.message,
      references: m.club.discover.referencesCount,
      featured: m.club.discover.featured,
    }),
    [m.club.discover],
  );

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={m.pageTitle}
        subtitle={m.club.subtitle}
        toolbarRevision={`${tab}-${schemaReady}`}
        rightSlot={
          canCreateRequest ? (
            <Button size="sm" onClick={openCreateRequest}>
              <Plus className="mr-1 h-4 w-4" />
              {m.club.createRequest}
            </Button>
          ) : null
        }
      />

      <div className={`${DASHBOARD_PAGE_INNER} min-w-0 space-y-4`}>
        {!schemaReady ? <MarketplaceSchemaBanner message={m.schemaHint} /> : null}

        <MarketplaceKpiStrip items={kpiItems} />

        <div className={cn(PARTNER_PANEL_CLASS, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground">{m.club.partnersBridge.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.club.partnersBridge.description}</p>
          </div>
          {canManage ? (
            <Button size="sm" variant="outline" onClick={() => navigate("/partners")}>
              {m.club.partnersBridge.openPartners}
            </Button>
          ) : null}
        </div>

        <MarketplaceTabBar
          tabs={tabs}
          activeTab={tab}
          labelForTab={(item) => clubMarketplaceTabLabel(item, tabLabels)}
          onTabChange={setTab}
        />

        {clubLoading || loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="py-20 text-center text-muted-foreground">{t.common.pleaseSignIn}</div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-4">
                <MarketplaceClubHero
                  title={m.club.hero.title}
                  subtitle={m.club.hero.subtitle}
                  cards={m.club.hero.cards}
                  managePartnersCta={canManage ? m.club.hero.managePartnersCta : undefined}
                  managePartnersHint={m.club.hero.managePartnersHint}
                  onDiscover={() => setTab("discover")}
                  onRequests={() => (canCreateRequest ? openCreateRequest() : setTab("requests"))}
                  onOffers={() => setTab("offers")}
                  onManagePartners={canManage ? () => navigate("/partners") : undefined}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3">
                  <h3 className="font-display font-semibold text-foreground">{m.club.sections.featured}</h3>
                  {providers.filter((p) => p.is_featured).slice(0, 3).map((provider) => (
                    <MarketplaceProviderCard
                      key={provider.id}
                      provider={provider}
                      categoryLabel={categoryLabel}
                      typeLabel={(type) => m.providerTypes[type] ?? type}
                      verifiedLabel={m.verified}
                      labels={cardLabels}
                      onView={() => setTab("discover")}
                    />
                  ))}
                  {providers.filter((p) => p.is_featured).length === 0 ? (
                    <MarketplaceEmptyState
                      variant="compact"
                      title={m.club.empty.noProvidersTitle}
                      description={m.club.empty.noProvidersDesc}
                      actionLabel={canCreateRequest ? m.club.empty.createRequestAction : undefined}
                      onAction={canCreateRequest ? openCreateRequest : undefined}
                    />
                  ) : null}
                </section>
                <section className="space-y-3">
                  <h3 className="font-display font-semibold text-foreground">{m.club.sections.openRequests}</h3>
                  {requests.slice(0, 4).map((req) => (
                    <div key={req.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                      <div className="font-display font-semibold text-foreground">{req.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{categoryLabel(req.category)}</div>
                    </div>
                  ))}
                  {requests.length === 0 ? (
                    <MarketplaceEmptyState
                      variant="compact"
                      title={m.club.empty.noRequestsTitle}
                      description={m.club.empty.noRequestsDesc}
                      actionLabel={canCreateRequest ? m.club.empty.createRequestAction : undefined}
                      onAction={canCreateRequest ? openCreateRequest : undefined}
                    />
                  ) : null}
                </section>
                </div>
              </div>
            )}

            {tab === "discover" && clubId ? (
              <MarketplaceDiscoverPanel
                clubId={clubId}
                providers={providers}
                saved={saved}
                canCreateRequest={canCreateRequest}
                onCreateRequest={openCreateRequest}
                onSavedChange={() => void reload()}
                relationshipMap={relationshipMap}
                relationshipLabel={relationshipLabel}
              />
            ) : null}

            {tab === "discover" && !clubId ? (
              <div className="py-20 text-center text-muted-foreground">{t.common.pleaseSignIn}</div>
            ) : null}

            {tab === "requests" && clubId ? (
              <ClubMarketplaceRequestsPanel
                clubId={clubId}
                requests={requests}
                offers={offers}
                providers={providers}
                saved={saved}
                schemaReady={schemaReady}
                canCreateRequest={canCreateRequest}
                onRefresh={() => void reload()}
                createOpen={createDialogOpen}
                onCreateOpenChange={setCreateDialogOpen}
              />
            ) : null}

            {tab === "offers" && clubId ? (
              <ClubMarketplaceOffersPanel
                clubId={clubId}
                requests={requests}
                offers={offers}
                offerProviders={offerProviders}
                partners={partners}
                canAcceptOffer={canAcceptOffer}
                onRefresh={() => void reload()}
              />
            ) : null}

            {tab === "providers" && (
              savedProviders.length === 0 ? (
                <MarketplaceEmptyState
                  title={m.club.empty.noSavedTitle}
                  description={m.club.empty.noSavedDesc}
                  actionLabel={m.club.tabs.discover}
                  onAction={() => setTab("discover")}
                />
              ) : (
                <div className="space-y-3">
                  <h3 className="font-display font-semibold text-foreground">{m.club.sections.savedProviders}</h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {savedProviders.map((provider) => (
                      <MarketplaceProviderCard
                        key={provider.id}
                        provider={provider}
                        categoryLabel={categoryLabel}
                        typeLabel={(type) => m.providerTypes[type] ?? type}
                        verifiedLabel={m.verified}
                        labels={cardLabels}
                        isSaved
                        onMessage={() => navigate("/communication")}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {tab === "reviews" && <MarketplaceEngagementReviewsPanel clubId={clubId} />}

            {tab === "moderation" && canModerate ? (
              <MarketplaceModerationPanel onChanged={() => void reload()} />
            ) : tab === "moderation" ? (
              <MarketplaceEmptyState
                title={m.club.empty.noModerationTitle}
                description={m.club.empty.noModerationDesc}
              />
            ) : null}
          </>
        )}
      </div>

    </div>
  );
}
