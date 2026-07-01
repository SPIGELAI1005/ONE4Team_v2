import { useCallback, useMemo, useRef, useState } from "react";

import { ExternalLink, Eye, Globe, Loader2, Palette, MapPin, Package, Rocket, Save, Send } from "lucide-react";

import { Link } from "react-router-dom";

import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SupplierPageAdminLivePreview } from "@/components/supplier-page-admin/supplier-page-admin-live-preview";

import { SupplierPublishPanel } from "@/components/supplier-page-admin/supplier-publish-panel";

import {

  ProviderListingEditor,

  type ProviderListingEditorHandle,

  type ProviderListingSection,

} from "@/components/marketplace/provider-listing-editor";

import { useAuth } from "@/contexts/useAuth";

import { useLanguage } from "@/hooks/use-language";

import { useModuleGateRole } from "@/hooks/use-module-gate-role";

import { useToast } from "@/hooks/use-toast";

import { useMarketplaceProviderProfile } from "@/hooks/use-marketplace";

import { draftAsPreviewProfile, listingDraftFromProfile } from "@/lib/marketplace-listing-draft";

import { providerTypeFromDashboardRole, type MarketplaceProviderProfileRow } from "@/lib/marketplace-models";

import {

  DASHBOARD_PAGE_INNER,

  DASHBOARD_PAGE_INNER_SM,

  DASHBOARD_PAGE_MAX_INNER,

  DASHBOARD_PAGE_ROOT,

} from "@/lib/dashboard-page-shell";



const supplierPageTabTriggerClass =

  "min-h-11 justify-center rounded-none border-b-2 border-transparent bg-transparent px-1.5 py-3 text-center text-[11px] font-medium leading-snug text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:!bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-2 sm:text-xs md:text-sm";



type SupplierPageTab = "basics" | "branding" | "services" | "contact" | "publish";



const TAB_EDITOR_CONFIG: Record<

  Exclude<SupplierPageTab, "publish">,

  { mode: "listing" | "services"; sections: ProviderListingSection[] }

> = {

  basics: { mode: "listing", sections: ["profile", "location", "locked"] },

  branding: { mode: "listing", sections: ["branding"] },

  services: { mode: "services", sections: ["services", "locked"] },

  contact: { mode: "listing", sections: ["contact"] },

};



export default function SupplierPageAdmin() {

  const { t } = useLanguage();

  const sp = t.supplierPortal;

  const mp = t.marketplacePage;

  const l = mp.provider.listing;

  const { toast } = useToast();

  const { user } = useAuth();

  const gateRole = useModuleGateRole();

  const providerType = providerTypeFromDashboardRole(gateRole);

  const editorRef = useRef<ProviderListingEditorHandle>(null);

  const [saving, setSaving] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<SupplierPageTab>("basics");

  const [livePreviewProfile, setLivePreviewProfile] = useState<MarketplaceProviderProfileRow | null>(null);



  const {

    profile,

    schemaReady,

    loading,

    saveProfile,

    submitForReview,

    pauseListing,

    reactivateListing,

  } = useMarketplaceProviderProfile(providerType);



  const categoryLabel = useCallback(

    (key: string) => (mp.categories as Record<string, string>)[key] ?? key.replace(/_/g, " "),

    [mp.categories],

  );



  const fallbackPreview = useMemo(() => {

    if (!providerType) return null;

    return draftAsPreviewProfile(

      listingDraftFromProfile(profile, user?.email),

      providerType,

      profile,

    );

  }, [profile, providerType, user?.email]);



  const previewProfile = livePreviewProfile ?? fallbackPreview;

  const previewSlug = previewProfile?.slug ?? profile?.slug ?? null;



  const publicUrl = useMemo(() => {

    if (!previewSlug || profile?.visibility !== "public" || profile?.listing_status !== "active") {

      return null;

    }

    return `/supplier/${previewSlug}`;

  }, [previewSlug, profile?.listing_status, profile?.visibility]);



  const statusLabel = profile

    ? (mp.listingStatus as Record<string, string>)[profile.listing_status] ?? profile.listing_status

    : mp.listingStatus.draft;



  const visibilityLabel = profile

    ? (mp.provider.listing.visibility as Record<string, string>)[profile.visibility] ?? profile.visibility

    : "—";



  const wrapSave = async (payload: Parameters<typeof saveProfile>[0]) => {

    setSaving(true);

    const result = await saveProfile(payload);

    setSaving(false);

    if (!result.error) {

      toast({ title: mp.provider.profileSaved });

    } else {

      toast({ title: t.common.error, description: result.error.message, variant: "destructive" });

    }

    return result;

  };



  const runHeaderSave = async () => {

    const result = await editorRef.current?.saveDraft();

    if (result?.error) {

      toast({ title: t.common.error, description: result.error.message, variant: "destructive" });

    }

  };



  const runAction = async (
    fn: () => Promise<{ error: Error | null }>,
    successMessage?: string,
  ) => {

    setActionLoading(true);

    const saveResult = await editorRef.current?.saveDraft();

    if (saveResult?.error) {

      setActionLoading(false);

      toast({ title: t.common.error, description: saveResult.error.message, variant: "destructive" });

      return;

    }

    const result = await fn();

    setActionLoading(false);

    if (result.error) {

      toast({ title: t.common.error, description: result.error.message, variant: "destructive" });

      return;

    }

    if (successMessage) {
      toast({ title: successMessage });
    }
  };

  const runSubmitForReview = () => void runAction(submitForReview, mp.provider.submittedForReview);
  const runPause = () => void runAction(pauseListing, l.pausedToast);
  const runReactivate = () => void runAction(reactivateListing, l.reactivatedToast);



  const editorTab = activeTab === "publish" ? "basics" : activeTab;

  const editorConfig = TAB_EDITOR_CONFIG[editorTab];



  const publishLabels = useMemo(

    () => ({

      intro: sp.publishTabIntro,

      lastUpdatedLabel: sp.lastUpdatedLabel,

      neverSaved: sp.neverSaved,

      saveChanges: sp.saveChanges,

      saving: sp.saving,

      submitForReview: sp.submitForReview,

      previewPage: l.actions.previewPublicPage,

      viewLivePage: sp.viewPublicPage,

      pauseListing: l.actions.pause,

      reactivateListing: l.actions.reactivate,

      visibilityTitle: sp.visibilityTitle,

      visibilityPublic: l.visibility.public,

      visibilityMarketplace: l.visibility.marketplace_only,

      visibilityPrivate: l.visibility.private,

      statusTitle: sp.publishStatusLabel,

      completeness: l.status.completeness,

      rejectionReason: sp.rejectionReasonLabel,

      checklistTitle: sp.checklistTitle,

      checklistSlug: sp.checklistSlug,

      checklistName: sp.checklistName,

      checklistDescription: sp.checklistDescription,

      checklistContact: sp.checklistContact,

      checklistCategories: sp.checklistCategories,

      checklistPackages: sp.checklistPackages,

    }),

    [sp, l],

  );



  if (!providerType) {

    return (

      <div className={DASHBOARD_PAGE_ROOT}>

        <DashboardHeaderSlot title={sp.supplierPageTitle} greeting={sp.supplierPageSubtitle} showBack={false} />

        <div className={`${DASHBOARD_PAGE_INNER} py-20 text-center text-muted-foreground`}>{t.common.notPermitted}</div>

      </div>

    );

  }



  if (loading) {

    return (

      <div className={DASHBOARD_PAGE_ROOT}>

        <DashboardHeaderSlot title={sp.supplierPageTitle} greeting={sp.supplierPageSubtitle} showBack={false} />

        <div className="flex justify-center py-20">

          <Loader2 className="h-6 w-6 animate-spin text-primary" />

        </div>

      </div>

    );

  }



  return (

    <div className={DASHBOARD_PAGE_ROOT}>

      <DashboardHeaderSlot

        title={sp.supplierPageTitle}

        greeting={sp.supplierPageSubtitle}

        showBack={false}

        toolbarRevision={`${profile?.id ?? "new"}-${profile?.listing_status}-${saving}-${activeTab}`}

        rightSlot={

          <div className="flex flex-wrap items-center justify-end gap-2">

            <Button variant="secondary" size="sm" disabled={saving || actionLoading} onClick={() => void runHeaderSave()}>

              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}

              {saving ? sp.saving : sp.saveChanges}

            </Button>

            <Button variant="outline" size="sm" onClick={() => editorRef.current?.openPreview()}>

              <Eye className="mr-1 h-3.5 w-3.5" />

              {l.actions.previewPublicPage}

            </Button>

            {publicUrl ? (

              <Button asChild variant="outline" size="sm">

                <Link to={publicUrl} target="_blank" rel="noopener noreferrer">

                  <ExternalLink className="mr-1 h-3.5 w-3.5" />

                  {sp.viewPublicPage}

                </Link>

              </Button>

            ) : null}

            <Button

              size="sm"

              className="bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110"

              disabled={saving || actionLoading || !profile}

              onClick={runSubmitForReview}

            >

              <Send className="mr-1 h-4 w-4" />

              {sp.submitForReview}

            </Button>

          </div>

        }

      />



      <div className="border-b border-border/60">

        <div className={`${DASHBOARD_PAGE_INNER_SM} space-y-2`}>

          <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-2.5 text-[11px]">

            <div className="flex flex-wrap items-center gap-2">

              <span className="font-semibold text-foreground">{sp.publishStatusLabel}</span>

              <Badge variant={profile?.listing_status === "active" ? "default" : "secondary"}>{statusLabel}</Badge>

              <Badge variant={profile?.visibility === "public" ? "default" : "outline"}>{visibilityLabel}</Badge>

              <Badge variant="outline">

                {sp.completenessLabel}: {profile?.profile_completeness ?? 0}%

              </Badge>

            </div>

            <p className="text-muted-foreground">{sp.publishStatusHint}</p>

            {previewSlug ? (

              <p className="text-muted-foreground">

                {sp.publicUrlLabel}: <span className="font-mono text-foreground">/supplier/{previewSlug}</span>

              </p>

            ) : (

              <p className="text-muted-foreground">{sp.slugHint}</p>

            )}

          </div>

        </div>

      </div>



      <div className={`${DASHBOARD_PAGE_MAX_INNER} max-w-5xl py-4 sm:py-6`}>

        {!schemaReady ? <p className="mb-4 text-xs text-muted-foreground">{mp.schemaHint}</p> : null}



        {previewProfile ? (

          <SupplierPageAdminLivePreview profile={previewProfile} categoryLabel={categoryLabel} />

        ) : null}



        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SupplierPageTab)} className="mt-10 space-y-6">

          <TabsList className="grid h-auto w-full grid-cols-5 gap-0 rounded-none border-b border-border bg-transparent p-0 text-muted-foreground">

            <TabsTrigger value="basics" className={supplierPageTabTriggerClass}>

              {sp.tabBasics}

            </TabsTrigger>

            <TabsTrigger value="branding" className={supplierPageTabTriggerClass}>

              {sp.tabBranding}

            </TabsTrigger>

            <TabsTrigger value="services" className={supplierPageTabTriggerClass}>

              {sp.tabServices}

            </TabsTrigger>

            <TabsTrigger value="contact" className={supplierPageTabTriggerClass}>

              {sp.tabContact}

            </TabsTrigger>

            <TabsTrigger value="publish" className={supplierPageTabTriggerClass}>

              {sp.tabPublish}

            </TabsTrigger>

          </TabsList>



          <TabsContent value="basics" className="mt-0 space-y-4">

            <TabHero icon={Globe} title={sp.basicsHeroTitle} desc={sp.basicsHeroDesc} />

          </TabsContent>

          <TabsContent value="branding" className="mt-0 space-y-4">

            <TabHero icon={Palette} title={sp.brandingHeroTitle} desc={sp.brandingHeroDesc} />

          </TabsContent>

          <TabsContent value="services" className="mt-0 space-y-4">

            <TabHero icon={Package} title={sp.servicesHeroTitle} desc={sp.servicesHeroDesc} />

          </TabsContent>

          <TabsContent value="contact" className="mt-0 space-y-4">

            <TabHero icon={MapPin} title={sp.contactHeroTitle} desc={sp.contactHeroDesc} />

          </TabsContent>

          <TabsContent value="publish" className="mt-0 space-y-4">

            <TabHero icon={Rocket} title={sp.publishHeroTitle} desc={sp.publishHeroDesc} />

            <SupplierPublishPanel

              profile={profile}

              previewSlug={previewSlug}

              statusLabel={statusLabel}

              visibilityLabel={visibilityLabel}

              saving={saving}

              actionLoading={actionLoading}

              labels={publishLabels}

              onSave={() => void runHeaderSave()}

              onPreview={() => editorRef.current?.openPreview()}

              onSubmit={runSubmitForReview}
              onPause={runPause}
              onReactivate={runReactivate}

            />

          </TabsContent>

        </Tabs>



        <div className={activeTab === "publish" ? "hidden" : "mt-4"}>

          <ProviderListingEditor

            ref={editorRef}

            key="supplier-page-editor"

            providerType={providerType}

            profile={profile}

            mode={editorConfig.mode}

            saving={saving || actionLoading}

            previewVariant="publicPage"

            visibleSections={editorConfig.sections}

            hideChrome

            slugHelper={sp.slugHelper}

            onDraftPreviewChange={setLivePreviewProfile}

            onSave={wrapSave}

            onSubmitForReview={submitForReview}

            onPause={pauseListing}

            onReactivate={reactivateListing}

          />

        </div>

      </div>

    </div>

  );

}



function TabHero({

  icon: Icon,

  title,

  desc,

}: {

  icon: typeof Globe;

  title: string;

  desc: string;

}) {

  return (

    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">

        <Icon className="h-4 w-4" />

      </div>

      <div>

        <div className="text-sm font-semibold text-foreground">{title}</div>

        <p className="mt-1 max-w-xl text-xs text-muted-foreground">{desc}</p>

      </div>

    </div>

  );

}

