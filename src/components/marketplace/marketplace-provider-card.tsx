import { BadgeCheck, Loader2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketplaceRelationshipBadge } from "@/components/marketplace/marketplace-relationship-badge";
import type { ClubProviderRelationshipStatus } from "@/lib/marketplace-club-relationship";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

export interface MarketplaceProviderCardLabels {
  viewProfile: string;
  save: string;
  saved: string;
  requestOffer: string;
  message: string;
  references: string;
  featured: string;
}

interface MarketplaceProviderCardProps {
  provider: MarketplaceProviderProfileRow;
  categoryLabel: (key: string) => string;
  typeLabel: (type: string) => string;
  verifiedLabel: string;
  labels: MarketplaceProviderCardLabels;
  onView?: () => void;
  onSave?: () => void;
  onRequestOffer?: () => void;
  onMessage?: () => void;
  isSaved?: boolean;
  saveLoading?: boolean;
  relationship?: { status: ClubProviderRelationshipStatus; label: string };
}

export function MarketplaceProviderCard({
  provider,
  categoryLabel,
  typeLabel,
  verifiedLabel,
  labels,
  onView,
  onSave,
  onRequestOffer,
  onMessage,
  isSaved,
  saveLoading,
  relationship,
}: MarketplaceProviderCardProps) {
  const isVerified = provider.verification_status === "verified";
  const referenceCount = provider.references.length;

  return (
    <article
      className={cn(
        PARTNER_PANEL_CLASS,
        "group flex flex-col overflow-hidden transition-colors hover:border-primary/25",
        isVerified && "border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background",
      )}
    >
      {provider.is_featured ? (
        <div className="bg-primary/10 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-primary">
          {labels.featured}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border font-display text-lg font-bold",
              isVerified
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            {provider.logo_url ? (
              <img src={provider.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              provider.provider_name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{provider.provider_name}</h3>
              {relationship ? (
                <MarketplaceRelationshipBadge
                  status={relationship.status}
                  label={relationship.label}
                />
              ) : null}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <BadgeCheck className="h-3 w-3" />
                  {verifiedLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{typeLabel(provider.provider_type)}</p>
            {provider.location ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{provider.location}</span>
              </p>
            ) : null}
          </div>
        </div>

        {provider.short_description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {provider.short_description}
          </p>
        ) : null}

        {provider.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {provider.categories.slice(0, 4).map((cat) => (
              <Badge key={cat} variant="outline" className="text-[10px] font-normal">
                {categoryLabel(cat)}
              </Badge>
            ))}
            {provider.categories.length > 4 ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                +{provider.categories.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {referenceCount > 0 ? (
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-primary" />
            {labels.references.replace("{count}", String(referenceCount))}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {onView ? (
            <Button size="sm" variant="default" onClick={onView}>
              {labels.viewProfile}
            </Button>
          ) : null}
          {onSave ? (
            <Button size="sm" variant="outline" disabled={saveLoading} onClick={onSave}>
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSaved ? labels.saved : labels.save}
            </Button>
          ) : null}
          {onRequestOffer ? (
            <Button size="sm" variant="outline" onClick={onRequestOffer}>
              {labels.requestOffer}
            </Button>
          ) : null}
          {onMessage ? (
            <Button size="sm" variant="ghost" onClick={onMessage}>
              {labels.message}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
