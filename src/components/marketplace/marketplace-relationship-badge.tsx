import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClubProviderRelationshipStatus } from "@/lib/marketplace-club-relationship";

const STATUS_CLASS: Record<ClubProviderRelationshipStatus, string> = {
  none: "",
  saved: "bg-muted text-muted-foreground",
  offer_sent: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  active_partner: "bg-primary/15 text-primary",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

interface MarketplaceRelationshipBadgeProps {
  status: ClubProviderRelationshipStatus;
  label: string;
  className?: string;
}

export function MarketplaceRelationshipBadge({
  status,
  label,
  className,
}: MarketplaceRelationshipBadgeProps) {
  if (status === "none") return null;
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_CLASS[status], className)}>
      {label}
    </Badge>
  );
}
