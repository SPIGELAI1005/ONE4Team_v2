import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import type { OfferWithContext } from "@/lib/marketplace-offer-utils";
import {
  formatOfferPrice,
  parseOfferAttachments,
  providerReferenceCount,
} from "@/lib/marketplace-offer-utils";
import { MarketplaceOfferStatusBadge } from "@/components/marketplace/marketplace-offer-status-badge";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface MarketplaceOfferCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: OfferWithContext[];
}

export function MarketplaceOfferCompareDialog({
  open,
  onOpenChange,
  offers,
}: MarketplaceOfferCompareDialogProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const c = m.club.offers.compare;

  if (offers.length < 2) return null;

  const rows: { key: string; label: string; render: (row: OfferWithContext) => string }[] = [
    {
      key: "provider",
      label: c.provider,
      render: (row) => row.provider?.provider_name ?? "-",
    },
    {
      key: "type",
      label: c.providerType,
      render: (row) => m.providerTypes[row.offer.provider_role] ?? row.offer.provider_role,
    },
    {
      key: "references",
      label: c.references,
      render: (row) => String(providerReferenceCount(row.provider)),
    },
    {
      key: "price",
      label: c.price,
      render: (row) => formatOfferPrice(row.offer),
    },
    {
      key: "timeline",
      label: c.timeline,
      render: (row) => row.offer.delivery_timeline ?? "-",
    },
    {
      key: "services",
      label: c.includedServices,
      render: (row) =>
        row.offer.included_services.length ? row.offer.included_services.join(", ") : "-",
    },
    {
      key: "notes",
      label: c.notes,
      render: (row) => row.offer.notes ?? "-",
    },
    {
      key: "documents",
      label: c.documents,
      render: (row) => String(parseOfferAttachments(row.offer.attachments).length),
    },
    {
      key: "status",
      label: c.status,
      render: (row) => m.club.offers.statusLabels[row.offer.status] ?? row.offer.status,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                  {c.field}
                </th>
                {offers.map((row) => (
                  <th key={row.offer.id} className="p-2 text-left align-top">
                    <div className="space-y-1">
                      <div className="font-display font-semibold text-foreground">
                        {row.provider?.provider_name ?? row.offer.title}
                      </div>
                      <MarketplaceOfferStatusBadge
                        status={row.offer.status}
                        label={m.club.offers.statusLabels[row.offer.status] ?? row.offer.status}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowDef) => (
                <tr key={rowDef.key} className="border-t border-border/50">
                  <td className="p-2 font-medium text-muted-foreground">{rowDef.label}</td>
                  {offers.map((row) => (
                    <td key={row.offer.id} className={cn(PARTNER_PANEL_CLASS, "p-2 align-top")}>
                      {rowDef.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
