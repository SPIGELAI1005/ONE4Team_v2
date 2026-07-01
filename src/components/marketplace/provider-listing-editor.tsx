import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import {
  Eye,
  Loader2,
  Pause,
  Play,
  Save,
  Send,
  Store,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import {
  MARKETPLACE_AVAILABILITY_MODES,
  MARKETPLACE_VISIBILITY,
  type MarketplaceProviderProfileRow,
  type MarketplaceProviderType,
} from "@/lib/marketplace-models";
import {
  draftAsPreviewProfile,
  listingDraftFromProfile,
  listingDraftToProfilePayload,
  normalizeProviderSlug,
  type MarketplaceListingDraft,
} from "@/lib/marketplace-listing-draft";
import {
  canPauseListing,
  canReactivateListing,
  canSubmitListingForReview,
  isListingEditable,
} from "@/lib/marketplace-listing-structure";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceProviderProfileSheet } from "@/components/marketplace/marketplace-provider-profile-sheet";
import { SupplierPublicPagePreviewSheet } from "@/components/supplier-page-admin/supplier-public-page-preview-sheet";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { ProviderServicesEditor } from "@/components/marketplace/provider-services-editor";
import { ProviderBrandingImageField } from "@/components/marketplace/provider-branding-image-field";
import { cn } from "@/lib/utils";

export type ProviderListingSection =
  | "status"
  | "actions"
  | "onboarding"
  | "branding"
  | "profile"
  | "location"
  | "contact"
  | "services"
  | "locked";

export interface ProviderListingEditorHandle {
  saveDraft: () => Promise<{ error: Error | null }>;
  openPreview: () => void;
}

interface ProviderListingEditorProps {
  providerType: MarketplaceProviderType;
  profile: MarketplaceProviderProfileRow | null;
  mode: "listing" | "services";
  saving: boolean;
  onSave: (payload: Partial<MarketplaceProviderProfileRow>) => Promise<{ error: Error | null }>;
  onSubmitForReview: () => Promise<{ error: Error | null }>;
  onPause: () => Promise<{ error: Error | null }>;
  onReactivate: () => Promise<{ error: Error | null }>;
  /** `publicPage` shows your `/supplier/:slug` layout - not the club marketplace discover sheet. */
  previewVariant?: "discover" | "publicPage";
  onDraftPreviewChange?: (profile: MarketplaceProviderProfileRow) => void;
  /** When set, only render these sections (plus preview sheet). */
  visibleSections?: ProviderListingSection[];
  /** Hide status banner and action bar - parent supplies header actions. */
  hideChrome?: boolean;
  slugHelper?: string;
}

export const ProviderListingEditor = forwardRef<ProviderListingEditorHandle, ProviderListingEditorProps>(
function ProviderListingEditor(
  {
    providerType,
    profile,
    mode,
    saving,
    onSave,
    onSubmitForReview,
    onPause,
    onReactivate,
    previewVariant = "discover",
    onDraftPreviewChange,
    visibleSections,
    hideChrome = false,
    slugHelper,
  },
  ref,
) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const m = t.marketplacePage;
  const l = m.provider.listing;

  const [draft, setDraft] = useState<MarketplaceListingDraft>(() =>
    listingDraftFromProfile(profile, user?.email),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setDraft(listingDraftFromProfile(profile, user?.email));
  }, [profile, user?.email]);

  const completeness = useMemo(
    () => listingDraftToProfilePayload(draft, providerType, profile?.listing_status).profile_completeness ?? 0,
    [draft, providerType, profile?.listing_status],
  );

  const statusKey = profile?.listing_status ?? "draft";
  const statusLabel =
    (m.listingStatus as Record<string, string>)[statusKey] ?? statusKey;
  const editable = isListingEditable(profile?.listing_status);
  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const patchDraft = (patch: Partial<MarketplaceListingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveDraft = async () => {
    const payload = listingDraftToProfilePayload(draft, providerType, profile?.listing_status ?? "draft");
    return onSave(payload);
  };

  useImperativeHandle(ref, () => ({
    saveDraft: handleSaveDraft,
    openPreview: () => setPreviewOpen(true),
  }));

  const showSection = (section: ProviderListingSection) =>
    !visibleSections || visibleSections.includes(section);

  const runAction = async (fn: () => Promise<{ error: Error | null }>) => {
    setActionLoading(true);
    const saveResult = await handleSaveDraft();
    if (saveResult.error) {
      setActionLoading(false);
      return saveResult;
    }
    const result = await fn();
    setActionLoading(false);
    return result;
  };

  const previewProfile = useMemo(
    () => draftAsPreviewProfile(draft, providerType, profile),
    [draft, providerType, profile],
  );

  useEffect(() => {
    onDraftPreviewChange?.(previewProfile);
  }, [previewProfile, onDraftPreviewChange]);

  const previewActionLabel =
    previewVariant === "publicPage" ? l.actions.previewPublicPage : l.actions.preview;

  const profileLabels = useMemo(
    () => ({
      verified: m.verified,
      featured: m.club.discover.featured,
      serviceArea: m.club.discover.serviceArea,
      serviceAreaRemote: m.club.discover.serviceAreaRemote,
      serviceAreaLocal: m.club.discover.serviceAreaLocal,
      serviceAreaHybrid: m.club.discover.serviceAreaHybrid,
      serviceAreaKm: m.club.discover.serviceAreaKm,
      packages: l.preview.packages,
      services: l.preview.services,
      references: l.preview.references,
      documents: l.preview.documents,
      documentsEmpty: l.preview.documentsEmpty,
      contact: l.preview.contact,
      viewProfile: m.club.discover.viewProfile,
      save: m.club.discover.save,
      saved: m.club.discover.saved,
      requestOffer: m.club.discover.requestOffer,
      message: m.club.discover.message,
      noPackages: l.preview.noPackages,
      noReferences: l.preview.noReferences,
      priceFrom: m.club.discover.priceFrom,
    }),
    [m, l],
  );

  const listingOnboarding = !profile ? (
    <MarketplaceEmptyState
      variant="banner"
      icon={Store}
      title={m.provider.empty.createTitle}
      description={m.provider.empty.createDesc}
    />
  ) : profile.listing_status === "draft" ? (
    <MarketplaceEmptyState
      variant="banner"
      icon={FileEdit}
      title={m.provider.empty.draftTitle}
      description={m.provider.empty.draftDesc}
      actionLabel={m.provider.empty.draftAction}
      onAction={() => {
        document.getElementById("marketplace-listing-profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    />
  ) : null;

  if (mode === "services") {
    return (
      <div className="space-y-4">
        {showSection("onboarding") ? listingOnboarding : null}
        {showSection("status") && !hideChrome ? (
          <ListingStatusBanner
            statusLabel={statusLabel}
            completeness={completeness}
            rejectionReason={profile?.rejection_reason}
            labels={l.status}
          />
        ) : null}
        {showSection("actions") && !hideChrome ? (
          <ListingActionsBar
            saving={saving || actionLoading}
            editable={editable}
            status={profile?.listing_status}
            labels={{ ...l.actions, preview: previewActionLabel }}
            onSave={() => void handleSaveDraft()}
            onPreview={() => setPreviewOpen(true)}
            onSubmit={() => void runAction(onSubmitForReview)}
            onPause={() => void runAction(onPause)}
            onReactivate={() => void runAction(onReactivate)}
          />
        ) : null}
        {showSection("services") ? (
          <ProviderServicesEditor
            providerType={providerType}
            draft={draft}
            onChange={patchDraft}
            disabled={!editable}
          />
        ) : null}
        <PreviewSheet
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          profile={previewProfile}
          variant={previewVariant}
          categoryLabel={categoryLabel}
          typeLabel={(type) => m.providerTypes[type] ?? type}
          labels={profileLabels}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSection("onboarding") ? listingOnboarding : null}

      {showSection("status") && !hideChrome ? (
        <ListingStatusBanner
          statusLabel={statusLabel}
          completeness={completeness}
          rejectionReason={profile?.rejection_reason}
          labels={l.status}
        />
      ) : null}

      {showSection("actions") && !hideChrome ? (
        <ListingActionsBar
          saving={saving || actionLoading}
          editable={editable}
          status={profile?.listing_status}
          labels={{ ...l.actions, preview: previewActionLabel }}
          onSave={() => void handleSaveDraft()}
          onPreview={() => setPreviewOpen(true)}
          onSubmit={() => void runAction(onSubmitForReview)}
          onPause={() => void runAction(onPause)}
          onReactivate={() => void runAction(onReactivate)}
        />
      ) : null}

      {showSection("locked") && !editable ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {l.lockedHint}
        </div>
      ) : null}

      {showSection("branding") ? (
      <section id="marketplace-listing-profile" className={cn(PARTNER_PANEL_CLASS, "space-y-4 p-5")}>
        <h3 className="font-display text-lg font-semibold text-foreground">{l.sections.branding}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <ProviderBrandingImageField
            kind="logo"
            label={l.fields.logoUrl}
            value={draft.logo_url}
            disabled={!editable}
            onChange={(url) => patchDraft({ logo_url: url })}
          />
          <ProviderBrandingImageField
            kind="cover"
            label={l.fields.coverUrl}
            value={draft.cover_image_url}
            disabled={!editable}
            onChange={(url) => patchDraft({ cover_image_url: url })}
          />
        </div>
        {(draft.logo_url || draft.cover_image_url) && (
          <div className="flex gap-3">
            {draft.logo_url ? (
              <img
                src={draft.logo_url}
                alt=""
                className="h-14 w-14 rounded-2xl border object-cover"
              />
            ) : null}
            {draft.cover_image_url ? (
              <img
                src={draft.cover_image_url}
                alt=""
                className="h-14 w-28 rounded-xl border object-cover"
              />
            ) : null}
          </div>
        )}
      </section>
      ) : null}

      {showSection("profile") ? (
      <section className={cn(PARTNER_PANEL_CLASS, "space-y-4 p-5")}>
        <h3 className="font-display text-lg font-semibold text-foreground">{l.sections.profile}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={l.fields.name}>
            <Input
              value={draft.provider_name}
              disabled={!editable}
              onChange={(e) => patchDraft({ provider_name: e.target.value })}
            />
          </Field>
          <Field label={l.fields.providerType}>
            <Input value={m.providerTypes[providerType]} disabled readOnly className="bg-muted/40" />
          </Field>
          <Field label={l.fields.slug} className="md:col-span-2">
            <Input
              value={draft.slug}
              disabled={!editable}
              placeholder="my-company"
              onChange={(e) => patchDraft({ slug: normalizeProviderSlug(e.target.value) })}
            />
            {slugHelper ? <p className="text-[11px] text-muted-foreground">{slugHelper}</p> : null}
          </Field>
          <Field label={l.fields.shortDescription} className="md:col-span-2">
            <Textarea
              rows={2}
              disabled={!editable}
              value={draft.short_description}
              onChange={(e) => patchDraft({ short_description: e.target.value })}
            />
          </Field>
          <Field label={l.fields.detailedDescription} className="md:col-span-2">
            <Textarea
              rows={5}
              disabled={!editable}
              value={draft.detailed_description}
              onChange={(e) => patchDraft({ detailed_description: e.target.value })}
            />
          </Field>
        </div>
      </section>
      ) : null}

      {showSection("location") ? (
      <section className={cn(PARTNER_PANEL_CLASS, "space-y-4 p-5")}>
        <h3 className="font-display text-lg font-semibold text-foreground">{l.sections.location}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={l.fields.location}>
            <Input
              value={draft.location}
              disabled={!editable}
              onChange={(e) => patchDraft({ location: e.target.value })}
            />
          </Field>
          <Field label={l.fields.serviceAreaKm}>
            <Input
              type="number"
              min={0}
              disabled={!editable}
              value={draft.service_area_km}
              onChange={(e) => patchDraft({ service_area_km: e.target.value })}
            />
          </Field>
          <Field label={l.fields.availabilityMode}>
            <Select
              value={draft.availability_mode || "unset"}
              disabled={!editable}
              onValueChange={(v) =>
                patchDraft({
                  availability_mode: v === "unset" ? "" : (v as MarketplaceListingDraft["availability_mode"]),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={l.fields.availabilityMode} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">{l.fields.availabilityUnset}</SelectItem>
                {MARKETPLACE_AVAILABILITY_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {l.availabilityModes[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={l.fields.visibility}>
            <Select
              value={draft.visibility}
              disabled={!editable}
              onValueChange={(v) => patchDraft({ visibility: v as MarketplaceListingDraft["visibility"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_VISIBILITY.map((vis) => (
                  <SelectItem key={vis} value={vis}>
                    {l.visibility[vis]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>
      ) : null}

      {showSection("contact") ? (
      <section className={cn(PARTNER_PANEL_CLASS, "space-y-4 p-5")}>
        <h3 className="font-display text-lg font-semibold text-foreground">{l.sections.contact}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={l.fields.contactPerson}>
            <Input
              value={draft.contact_person}
              disabled={!editable}
              onChange={(e) => patchDraft({ contact_person: e.target.value })}
            />
          </Field>
          <Field label={l.fields.email}>
            <Input
              type="email"
              value={draft.contact_email}
              disabled={!editable}
              onChange={(e) => patchDraft({ contact_email: e.target.value })}
            />
          </Field>
          <Field label={l.fields.phone}>
            <Input
              value={draft.phone}
              disabled={!editable}
              onChange={(e) => patchDraft({ phone: e.target.value })}
            />
          </Field>
          <Field label={l.fields.website}>
            <Input
              value={draft.website}
              disabled={!editable}
              onChange={(e) => patchDraft({ website: e.target.value })}
            />
          </Field>
        </div>
      </section>
      ) : null}

      <PreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        profile={previewProfile}
        variant={previewVariant}
        categoryLabel={categoryLabel}
        typeLabel={(type) => m.providerTypes[type] ?? type}
        labels={profileLabels}
      />
    </div>
  );
});

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ListingStatusBanner({
  statusLabel,
  completeness,
  rejectionReason,
  labels,
}: {
  statusLabel: string;
  completeness: number;
  rejectionReason?: string | null;
  labels: { title: string; completeness: string };
}) {
  return (
    <div className={cn(PARTNER_PANEL_CLASS, "space-y-3 border-primary/20 bg-primary/[0.04] p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {labels.title}
          </p>
          <p className="font-display text-lg font-semibold text-foreground">{statusLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{labels.completeness}</p>
          <p className="font-display text-2xl font-bold text-primary">{completeness}%</p>
        </div>
      </div>
      <Progress value={completeness} className="h-2" />
      {rejectionReason ? (
        <p className="text-sm text-destructive">{rejectionReason}</p>
      ) : null}
    </div>
  );
}

function ListingActionsBar({
  saving,
  editable,
  status,
  labels,
  onSave,
  onPreview,
  onSubmit,
  onPause,
  onReactivate,
}: {
  saving: boolean;
  editable: boolean;
  status?: string;
  labels: {
    saveDraft: string;
    preview: string;
    submit: string;
    pause: string;
    reactivate: string;
  };
  onSave: () => void;
  onPreview: () => void;
  onSubmit: () => void;
  onPause: () => void;
  onReactivate: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={saving || !editable} onClick={onSave}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        {labels.saveDraft}
      </Button>
      <Button size="sm" variant="outline" onClick={onPreview}>
        <Eye className="mr-1 h-4 w-4" />
        {labels.preview}
      </Button>
      {canSubmitListingForReview(status) ? (
        <Button size="sm" disabled={saving || !editable} onClick={onSubmit}>
          <Send className="mr-1 h-4 w-4" />
          {labels.submit}
        </Button>
      ) : null}
      {canPauseListing(status) ? (
        <Button size="sm" variant="secondary" disabled={saving} onClick={onPause}>
          <Pause className="mr-1 h-4 w-4" />
          {labels.pause}
        </Button>
      ) : null}
      {canReactivateListing(status) ? (
        <Button size="sm" disabled={saving} onClick={onReactivate}>
          <Play className="mr-1 h-4 w-4" />
          {labels.reactivate}
        </Button>
      ) : null}
    </div>
  );
}

function PreviewSheet({
  open,
  onOpenChange,
  profile,
  variant,
  categoryLabel,
  typeLabel,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MarketplaceProviderProfileRow;
  variant: "discover" | "publicPage";
  categoryLabel: (key: string) => string;
  typeLabel: (type: string) => string;
  labels: Parameters<typeof MarketplaceProviderProfileSheet>[0]["labels"];
}) {
  if (variant === "publicPage") {
    return (
      <SupplierPublicPagePreviewSheet
        open={open}
        onOpenChange={onOpenChange}
        profile={profile}
        categoryLabel={categoryLabel}
      />
    );
  }

  return (
    <MarketplaceProviderProfileSheet
      provider={profile}
      open={open}
      onOpenChange={onOpenChange}
      categoryLabel={categoryLabel}
      typeLabel={typeLabel}
      labels={labels}
    />
  );
}
