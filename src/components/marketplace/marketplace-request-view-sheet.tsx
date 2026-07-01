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
import type { MarketplaceRequestRow } from "@/lib/marketplace-models";
import { parseRequestAttachments } from "@/lib/marketplace-request-filters";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface MarketplaceRequestViewSheetProps {
  request: MarketplaceRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerCount?: number;
  mode: "club" | "provider";
}

export function MarketplaceRequestViewSheet({
  request,
  open,
  onOpenChange,
  offerCount = 0,
  mode,
}: MarketplaceRequestViewSheetProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const r = mode === "club" ? m.club.requests : m.provider.requests;
  const d = m.club.requestDialog;

  if (!request) return null;

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const attachments = parseRequestAttachments(request.attachments);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">{request.title}</SheetTitle>
          <SheetDescription>
            {categoryLabel(request.category)}
            {request.provider_type_wanted
              ? ` · ${m.providerTypes[request.provider_type_wanted]}`
              : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{m.club.requestStatus[request.status]}</Badge>
            <Badge variant="outline">{r.visibilityLabels[request.visibility]}</Badge>
            {mode === "club" ? (
              <Badge variant="outline">
                {r.offers}: {offerCount}
              </Badge>
            ) : null}
          </div>

          {request.description ? (
            <p className="text-sm leading-relaxed text-foreground">{request.description}</p>
          ) : null}

          <dl className="grid gap-2 text-sm">
            {request.quantity ? (
              <div className={cn(PARTNER_PANEL_CLASS, "p-3")}>
                <dt className="text-xs text-muted-foreground">{d.fields.quantity}</dt>
                <dd className="font-medium">{request.quantity}</dd>
              </div>
            ) : null}
            {request.location ? (
              <div className={cn(PARTNER_PANEL_CLASS, "p-3")}>
                <dt className="text-xs text-muted-foreground">{d.fields.location}</dt>
                <dd>{request.location}</dd>
              </div>
            ) : null}
            {request.deadline ? (
              <div className={cn(PARTNER_PANEL_CLASS, "p-3")}>
                <dt className="text-xs text-muted-foreground">{d.fields.deadline}</dt>
                <dd>{request.deadline}</dd>
              </div>
            ) : null}
            {(request.budget_min != null || request.budget_max != null) && (
              <div className={cn(PARTNER_PANEL_CLASS, "p-3")}>
                <dt className="text-xs text-muted-foreground">{r.budget}</dt>
                <dd>
                  €{request.budget_min ?? "-"} – €{request.budget_max ?? "-"}
                </dd>
              </div>
            )}
          </dl>

          {attachments.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {d.fields.attachments}
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
