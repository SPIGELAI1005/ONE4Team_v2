import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import type { OfferWithContext } from "@/lib/marketplace-offer-utils";
import {
  formatOfferPrice,
  parseOfferAttachments,
  providerReferenceCount,
} from "@/lib/marketplace-offer-utils";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceOfferStatusBadge } from "@/components/marketplace/marketplace-offer-status-badge";
import { cn } from "@/lib/utils";

interface MarketplaceOfferViewSheetProps {
  row: OfferWithContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "club" | "provider";
}

export function MarketplaceOfferViewSheet({
  row,
  open,
  onOpenChange,
  mode,
}: MarketplaceOfferViewSheetProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const labels = mode === "club" ? m.club.offers : m.provider.offers;

  if (!row) return null;

  const { offer, request, provider } = row;
  const attachments = parseOfferAttachments(offer.attachments);
  const statusLabel = labels.statusLabels[offer.status] ?? offer.status;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">{offer.title}</SheetTitle>
          <SheetDescription>
            {request?.title ? `${labels.forRequest}: ${request.title}` : labels.offerDetail}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <MarketplaceOfferStatusBadge status={offer.status} label={statusLabel} />
            {mode === "club" && provider ? (
              <Badge variant="secondary">{provider.provider_name}</Badge>
            ) : null}
            {mode === "club" && provider ? (
              <Badge variant="outline">{m.providerTypes[offer.provider_role]}</Badge>
            ) : null}
          </div>

          {offer.description ? (
            <p className="text-sm leading-relaxed text-foreground">{offer.description}</p>
          ) : null}

          <dl className="grid gap-2 text-sm">
            <Detail label={labels.price}>{formatOfferPrice(offer)}</Detail>
            {offer.delivery_timeline ? (
              <Detail label={labels.timeline}>{offer.delivery_timeline}</Detail>
            ) : null}
            {mode === "club" && provider ? (
              <Detail label={labels.references}>
                {providerReferenceCount(provider)} {labels.referencesCount}
              </Detail>
            ) : null}
            {offer.notes ? <Detail label={labels.notes}>{offer.notes}</Detail> : null}
          </dl>

          {offer.included_services.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.includedServices}
              </h4>
              <ul className="list-inside list-disc text-sm text-foreground">
                {offer.included_services.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {attachments.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.documents}
              </h4>
              <ul className="space-y-2">
                {attachments.map((file) => (
                  <li key={file.url}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        PARTNER_PANEL_CLASS,
                        "flex items-center gap-2 p-3 text-sm text-primary hover:underline",
                      )}
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn(PARTNER_PANEL_CLASS, "p-3")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{children}</dd>
    </div>
  );
}
