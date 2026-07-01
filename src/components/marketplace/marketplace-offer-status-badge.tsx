import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MarketplaceOfferStatus } from "@/lib/marketplace-models";

const STATUS_VARIANT: Record<MarketplaceOfferStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  viewed: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

interface MarketplaceOfferStatusBadgeProps {
  status: MarketplaceOfferStatus;
  label: string;
  className?: string;
}

export function MarketplaceOfferStatusBadge({
  status,
  label,
  className,
}: MarketplaceOfferStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_VARIANT[status], className)}>
      {label}
    </Badge>
  );
}
