import { ExternalLink, Eye, Loader2, Pause, Play, Rocket, Save, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import {
  canPauseListing,
  canReactivateListing,
  canSubmitListingForReview,
  isListingEditable,
} from "@/lib/marketplace-listing-structure";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

export interface SupplierPublishPanelLabels {
  intro: string;
  lastUpdatedLabel: string;
  neverSaved: string;
  saveChanges: string;
  saving: string;
  submitForReview: string;
  previewPage: string;
  viewLivePage: string;
  pauseListing: string;
  reactivateListing: string;
  visibilityTitle: string;
  visibilityPublic: string;
  visibilityMarketplace: string;
  visibilityPrivate: string;
  statusTitle: string;
  completeness: string;
  rejectionReason: string;
  checklistTitle: string;
  checklistSlug: string;
  checklistName: string;
  checklistDescription: string;
  checklistContact: string;
  checklistCategories: string;
  checklistPackages: string;
}

interface SupplierPublishPanelProps {
  profile: MarketplaceProviderProfileRow | null;
  previewSlug: string | null;
  statusLabel: string;
  visibilityLabel: string;
  saving: boolean;
  actionLoading: boolean;
  labels: SupplierPublishPanelLabels;
  onSave: () => void;
  onPreview: () => void;
  onSubmit: () => void;
  onPause: () => void;
  onReactivate: () => void;
}

export function SupplierPublishPanel({
  profile,
  previewSlug,
  statusLabel,
  visibilityLabel,
  saving,
  actionLoading,
  labels,
  onSave,
  onPreview,
  onSubmit,
  onPause,
  onReactivate,
}: SupplierPublishPanelProps) {
  const busy = saving || actionLoading;
  const editable = isListingEditable(profile?.listing_status);
  const completeness = profile?.profile_completeness ?? 0;
  const publicUrl =
    previewSlug && profile?.visibility === "public" && profile.listing_status === "active"
      ? `/supplier/${previewSlug}`
      : null;

  const visibilityDesc =
    profile?.visibility === "public"
      ? labels.visibilityPublic
      : profile?.visibility === "marketplace_only"
        ? labels.visibilityMarketplace
        : labels.visibilityPrivate;

  const checklist = [
    { label: labels.checklistName, done: Boolean(profile?.provider_name?.trim()) },
    { label: labels.checklistSlug, done: Boolean(previewSlug) },
    { label: labels.checklistDescription, done: Boolean(profile?.short_description?.trim()) },
    { label: labels.checklistContact, done: Boolean(profile?.contact_email?.trim()) },
    { label: labels.checklistCategories, done: Boolean(profile?.categories?.length) },
    { label: labels.checklistPackages, done: Boolean(profile?.packages?.filter((p) => p.kind !== "document").length) },
  ];

  return (
    <div className={cn(PARTNER_PANEL_CLASS, "space-y-5 p-5")}>
      <p className="text-sm text-muted-foreground">{labels.intro}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/30 p-4 text-sm">
          <div className="text-xs text-muted-foreground">{labels.lastUpdatedLabel}</div>
          <div className="font-medium">
            {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : labels.neverSaved}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/30 p-4 text-sm">
          <div className="text-xs text-muted-foreground">{labels.statusTitle}</div>
          <div className="font-medium">{statusLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">{visibilityLabel}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{labels.completeness}</span>
          <span className="font-semibold text-primary">{completeness}%</span>
        </div>
        <Progress value={completeness} className="h-2" />
      </div>

      {profile?.rejection_reason ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {labels.rejectionReason}: {profile.rejection_reason}
        </p>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
        <div className="text-sm font-medium text-foreground">{labels.visibilityTitle}</div>
        <p className="mt-1 text-xs text-muted-foreground">{visibilityDesc}</p>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-foreground">{labels.checklistTitle}</div>
        <ul className="space-y-1.5 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  item.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.done ? "✓" : "·"}
              </span>
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy || !editable} onClick={onSave}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {busy ? labels.saving : labels.saveChanges}
        </Button>
        {canSubmitListingForReview(profile?.listing_status) ? (
          <Button
            size="sm"
            className="bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110"
            disabled={busy || !editable}
            onClick={onSubmit}
          >
            <Send className="mr-1 h-4 w-4" />
            {labels.submitForReview}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-1 h-4 w-4" />
          {labels.previewPage}
        </Button>
        {publicUrl ? (
          <Button asChild variant="outline" size="sm">
            <Link to={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              {labels.viewLivePage}
            </Link>
          </Button>
        ) : previewSlug ? (
          <Button variant="outline" size="sm" disabled title={labels.viewLivePage}>
            <Rocket className="mr-1 h-4 w-4" />
            {labels.viewLivePage}
          </Button>
        ) : null}
        {canPauseListing(profile?.listing_status) ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={onPause}>
            <Pause className="mr-1 h-4 w-4" />
            {labels.pauseListing}
          </Button>
        ) : null}
        {canReactivateListing(profile?.listing_status) ? (
          <Button size="sm" disabled={busy} onClick={onReactivate}>
            <Play className="mr-1 h-4 w-4" />
            {labels.reactivateListing}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
