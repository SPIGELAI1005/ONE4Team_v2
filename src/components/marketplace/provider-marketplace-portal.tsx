import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, FileEdit, Globe, Loader2, Store } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  useMarketplaceProviderProfile,
  useProviderMarketplaceInteractions,
} from "@/hooks/use-marketplace";
import { getProviderPortalTabs } from "@/lib/marketplace-access";
import {
  normalizeProviderPortalView,
  providerPortalTabLabel,
  type ProviderPortalTab,
} from "@/lib/marketplace-product-structure";
import { providerTypeFromDashboardRole } from "@/lib/marketplace-models";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useMarketplaceTabLabels } from "@/hooks/use-marketplace-tab-labels";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { isPartnerPortalPath } from "@/lib/partner-portal-routes";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceKpiStrip } from "@/components/marketplace/marketplace-kpi-strip";
import { MarketplaceTabBar } from "@/components/marketplace/marketplace-tab-bar";
import { MarketplaceSchemaBanner } from "@/components/marketplace/marketplace-schema-banner";
import { MarketplaceProviderHero } from "@/components/marketplace/marketplace-provider-hero";
import { ProviderListingEditor } from "@/components/marketplace/provider-listing-editor";
import { ProviderMarketplaceRequestsPanel } from "@/components/marketplace/provider-marketplace-requests-panel";
import { ProviderMarketplaceOffersPanel } from "@/components/marketplace/provider-marketplace-offers-panel";
import { cn } from "@/lib/utils";

export default function ProviderMarketplacePortal() {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const tabLabels = useMarketplaceTabLabels();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);

  const providerType = providerTypeFromDashboardRole(gateRole);
  const tabs = useMemo(
    () => getProviderPortalTabs(gateRole, perms.assignments),
    [gateRole, perms.assignments],
  );

  const normalizedView = normalizeProviderPortalView(searchParams.get("view"));
  const tab: ProviderPortalTab =
    normalizedView && tabs.includes(normalizedView) ? normalizedView : tabs[0] ?? "overview";

  const {
    profile,
    schemaReady,
    loading,
    saveProfile,
    submitForReview,
    pauseListing,
    reactivateListing,
  } = useMarketplaceProviderProfile(providerType);

  const { openRequests, offerRequests, myOffers, loading: interactionsLoading, reload: reloadInteractions } =
    useProviderMarketplaceInteractions(profile?.id ?? null, providerType);

  const setTab = (next: ProviderPortalTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    setSearchParams(params, { replace: true });
  };

  const statusLabel = profile
    ? (m.listingStatus as Record<string, string>)[profile.listing_status] ?? profile.listing_status
    : m.listingStatus.draft;

  const kpiItems = useMemo(
    () => [
      { label: m.provider.kpi.listingStatus, value: statusLabel },
      { label: m.provider.kpi.completeness, value: `${profile?.profile_completeness ?? 0}%` },
      { label: m.provider.kpi.openRequests, value: openRequests.length },
      { label: m.provider.kpi.offersSent, value: myOffers.length },
      { label: m.provider.kpi.reviews, value: 0 },
    ],
    [m.provider.kpi, statusLabel, profile?.profile_completeness, openRequests.length, myOffers.length],
  );

  const handleSave = async (payload: Parameters<typeof saveProfile>[0]) => {
    setSaving(true);
    const { error } = await saveProfile(payload);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: m.provider.listing.savedToast });
    return { error: null };
  };

  const handleSubmit = async () => {
    const { error } = await submitForReview();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: m.provider.submittedForReview });
    return { error: null };
  };

  const handlePause = async () => {
    const { error } = await pauseListing();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: m.provider.listing.pausedToast });
    return { error: null };
  };

  const handleReactivate = async () => {
    const { error } = await reactivateListing();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: m.provider.listing.reactivatedToast });
    return { error: null };
  };

  if (!providerType) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <div className={`${DASHBOARD_PAGE_INNER} py-20 text-center text-muted-foreground`}>
          {t.common.notPermitted}
        </div>
      </div>
    );
  }

  const isPartnerPortal = isPartnerPortalPath(location.pathname);
  const pageTitle = isPartnerPortal ? m.provider.title : m.pageTitle;
  const pageSubtitle = m.provider.subtitle;

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={pageTitle}
        subtitle={pageSubtitle}
        toolbarRevision={`${tab}-${providerType}-${schemaReady}`}
      />

      <div className={`${DASHBOARD_PAGE_INNER} min-w-0 space-y-4`}>
        {!schemaReady ? <MarketplaceSchemaBanner message={m.schemaHint} /> : null}

        <MarketplaceKpiStrip items={kpiItems} />

        <MarketplaceTabBar
          tabs={tabs}
          activeTab={tab}
          labelForTab={(item) => providerPortalTabLabel(item, providerType, tabLabels)}
          onTabChange={setTab}
        />

        {loading || interactionsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tab === "overview" && !profile ? (
              <MarketplaceEmptyState
                icon={Store}
                title={m.provider.empty.createTitle}
                description={m.provider.empty.createDesc}
                actionLabel={m.provider.empty.createAction}
                onAction={() => setTab("listing")}
              />
            ) : null}

            {tab === "overview" && profile?.listing_status === "draft" ? (
              <MarketplaceEmptyState
                variant="banner"
                icon={FileEdit}
                title={m.provider.empty.draftTitle}
                description={m.provider.empty.draftDesc}
                actionLabel={m.provider.empty.draftAction}
                onAction={() => setTab("listing")}
              />
            ) : null}

            {tab === "overview" && profile ? (
              <div className="space-y-4">
                <MarketplaceProviderHero
                  title={m.provider.hero.title}
                  subtitle={m.provider.hero.subtitle}
                  cards={m.provider.hero.cards}
                  onListing={() => setTab("listing")}
                  onRequests={() => setTab("requests")}
                  onOffers={() => setTab("offers")}
                />
                <div className={cn(PARTNER_PANEL_CLASS, "space-y-2 p-5")}>
                  <h3 className="font-display text-lg font-semibold text-foreground">{profile.provider_name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.short_description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {statusLabel}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {profile.profile_completeness}% {m.provider.kpi.completeness.toLowerCase()}
                    </span>
                    {profile.verification_status === "verified" ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {m.verified}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {(tab === "listing" || tab === "services") && providerType ? (
              <ProviderListingEditor
                providerType={providerType}
                profile={profile}
                mode={tab === "listing" ? "listing" : "services"}
                saving={saving}
                onSave={handleSave}
                onSubmitForReview={handleSubmit}
                onPause={handlePause}
                onReactivate={handleReactivate}
              />
            ) : null}

            {tab === "settings" && (
              <div className="space-y-4">
                <MarketplaceEmptyState
                  icon={Globe}
                  title={m.provider.empty.settingsTitle}
                  description={m.provider.empty.settingsDesc}
                />
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => navigate("/supplier-page")}>
                    {m.provider.openSupplierPage}
                  </Button>
                </div>
              </div>
            )}

            {tab === "requests" && providerType ? (
              <ProviderMarketplaceRequestsPanel
                requests={openRequests}
                myOffers={myOffers}
                profile={profile}
                providerType={providerType}
                onRefresh={() => void reloadInteractions()}
              />
            ) : null}

            {tab === "offers" ? (
              <ProviderMarketplaceOffersPanel
                offers={myOffers}
                requests={offerRequests}
                onRefresh={() => void reloadInteractions()}
                onBrowseRequests={() => setTab("requests")}
              />
            ) : null}

            {tab === "reviews" && (
              <MarketplaceEmptyState
                icon={BadgeCheck}
                title={m.provider.empty.noReviewsTitle}
                description={m.provider.empty.noReviewsDesc}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
