import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

export interface MarketplaceKpiItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface MarketplaceKpiStripProps {
  items: MarketplaceKpiItem[];
  className?: string;
}

export function MarketplaceKpiStrip({ items, className }: MarketplaceKpiStripProps) {
  const cols = items.length >= 5 ? "lg:grid-cols-5" : items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-2 gap-3", cols, className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            PARTNER_PANEL_CLASS,
            "p-4",
            item.highlight && "border-primary/25 bg-primary/[0.04]",
          )}
        >
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
