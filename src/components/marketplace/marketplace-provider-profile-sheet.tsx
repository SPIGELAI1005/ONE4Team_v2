import {
  BadgeCheck,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Send,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarketplaceRelationshipBadge } from "@/components/marketplace/marketplace-relationship-badge";
import type { ClubProviderRelationshipStatus } from "@/lib/marketplace-club-relationship";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

export interface MarketplaceProviderProfileLabels {
  verified: string;
  featured: string;
  serviceArea: string;
  serviceAreaRemote: string;
  serviceAreaLocal: string;
  serviceAreaHybrid: string;
  serviceAreaKm: string;
  packages: string;
  services: string;
  references: string;
  documents: string;
  documentsEmpty: string;
  contact: string;
  viewProfile: string;
  save: string;
  saved: string;
  requestOffer: string;
  message: string;
  noPackages: string;
  noReferences: string;
  priceFrom: string;
}

interface MarketplaceProviderProfileSheetProps {
  provider: MarketplaceProviderProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: (key: string) => string;
  typeLabel: (type: string) => string;
  labels: MarketplaceProviderProfileLabels;
  isSaved?: boolean;
  onSave?: () => void;
  onRequestOffer?: () => void;
  onMessage?: () => void;
  relationship?: { status: ClubProviderRelationshipStatus; label: string };
}

function serviceAreaLabel(
  provider: MarketplaceProviderProfileRow,
  labels: MarketplaceProviderProfileLabels,
): string | null {
  if (provider.availability_mode === "remote") return labels.serviceAreaRemote;
  if (provider.availability_mode === "local") {
    return provider.service_area_km
      ? `${labels.serviceAreaLocal} · ${labels.serviceAreaKm.replace("{km}", String(provider.service_area_km))}`
      : labels.serviceAreaLocal;
  }
  if (provider.availability_mode === "hybrid") {
    return provider.service_area_km
      ? `${labels.serviceAreaHybrid} · ${labels.serviceAreaKm.replace("{km}", String(provider.service_area_km))}`
      : labels.serviceAreaHybrid;
  }
  if (provider.service_area_km) {
    return labels.serviceAreaKm.replace("{km}", String(provider.service_area_km));
  }
  return null;
}

export function MarketplaceProviderProfileSheet({
  provider,
  open,
  onOpenChange,
  categoryLabel,
  typeLabel,
  labels,
  isSaved,
  onSave,
  onRequestOffer,
  onMessage,
  relationship,
}: MarketplaceProviderProfileSheetProps) {
  if (!provider) return null;

  const area = serviceAreaLabel(provider, labels);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border/60 sm:max-w-xl lg:max-w-2xl"
      >
        <div className="relative -mx-6 -mt-6 mb-5 h-36 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background">
          {provider.cover_image_url ? (
            <img
              src={provider.cover_image_url}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 font-display text-xl font-bold text-primary shadow-sm">
              {provider.logo_url ? (
                <img src={provider.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                provider.provider_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-xl">{provider.provider_name}</SheetTitle>
              <SheetDescription className="text-sm">{typeLabel(provider.provider_type)}</SheetDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                {provider.verification_status === "verified" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {labels.verified}
                  </span>
                ) : null}
                {provider.is_featured ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {labels.featured}
                  </Badge>
                ) : null}
                {relationship ? (
                  <MarketplaceRelationshipBadge
                    status={relationship.status}
                    label={relationship.label}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {(provider.short_description || provider.detailed_description) && (
            <section className="space-y-2">
              <p className="text-sm leading-relaxed text-foreground">
                {provider.detailed_description || provider.short_description}
              </p>
            </section>
          )}

          {provider.categories.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.services}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {provider.categories.map((cat) => (
                  <Badge key={cat} variant="outline" className="font-normal">
                    {categoryLabel(cat)}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {provider.packages.filter((p) => p.kind !== "document").length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.packages}
              </h4>
              <div className="grid gap-2">
                {provider.packages
                  .filter((p) => p.kind !== "document")
                  .map((pkg) => (
                  <div key={pkg.id} className={cn(PARTNER_PANEL_CLASS, "p-3")}>
                    <div className="flex items-start gap-2">
                      <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{pkg.name}</div>
                        {pkg.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                        ) : null}
                        {pkg.priceIndication ? (
                          <p className="mt-1 text-xs text-primary">{pkg.priceIndication}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className={cn(PARTNER_PANEL_CLASS, "p-4 text-sm text-muted-foreground")}>
              <Package className="mb-2 h-4 w-4 text-primary" />
              {labels.noPackages}
            </section>
          )}

          {area || provider.location ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.serviceArea}
              </h4>
              <div className={cn(PARTNER_PANEL_CLASS, "flex items-start gap-2 p-3 text-sm")}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  {provider.location ? <div className="text-foreground">{provider.location}</div> : null}
                  {area ? <div className="text-muted-foreground">{area}</div> : null}
                  {provider.availability_notes ? (
                    <div className="mt-1 text-xs text-muted-foreground">{provider.availability_notes}</div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.documents}
            </h4>
            {provider.packages.some((p) => p.kind === "document" && p.url) ? (
              <ul className="space-y-2">
                {provider.packages
                  .filter((p) => p.kind === "document" && p.url)
                  .map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(PARTNER_PANEL_CLASS, "flex items-center gap-2 p-3 text-sm text-primary hover:underline")}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        {doc.name || doc.url}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className={cn(PARTNER_PANEL_CLASS, "flex items-start gap-2 p-3 text-sm text-muted-foreground")}>
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {labels.documentsEmpty}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.references}
            </h4>
            {provider.references.length > 0 ? (
              <ul className="space-y-2">
                {provider.references.map((ref, index) => (
                  <li
                    key={`${ref}-${index}`}
                    className={cn(PARTNER_PANEL_CLASS, "flex items-start gap-2 p-3 text-sm")}
                  >
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{ref}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={cn(PARTNER_PANEL_CLASS, "p-4 text-sm text-muted-foreground")}>{labels.noReferences}</div>
            )}
          </section>

          <section className="space-y-3 border-t border-border/60 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.contact}
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              {provider.contact_person ? (
                <span className="text-foreground">{provider.contact_person}</span>
              ) : null}
              {provider.contact_email ? (
                <a
                  href={`mailto:${provider.contact_email}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {provider.contact_email}
                </a>
              ) : null}
              {provider.phone ? (
                <a
                  href={`tel:${provider.phone}`}
                  className="inline-flex items-center gap-2 text-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {provider.phone}
                </a>
              ) : null}
              {provider.website ? (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {provider.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {onSave ? (
                <Button size="sm" variant="outline" onClick={onSave}>
                  {isSaved ? labels.saved : labels.save}
                </Button>
              ) : null}
              {onRequestOffer ? (
                <Button size="sm" onClick={onRequestOffer}>
                  <Send className="mr-1 h-4 w-4" />
                  {labels.requestOffer}
                </Button>
              ) : null}
              {onMessage ? (
                <Button size="sm" variant="ghost" onClick={onMessage}>
                  <MessageCircle className="mr-1 h-4 w-4" />
                  {labels.message}
                </Button>
              ) : null}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
