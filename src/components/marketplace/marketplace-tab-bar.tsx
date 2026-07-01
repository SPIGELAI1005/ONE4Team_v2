import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketplaceTabBarProps<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  labelForTab: (tab: T) => string;
  onTabChange: (tab: T) => void;
  className?: string;
}

export function MarketplaceTabBar<T extends string>({
  tabs,
  activeTab,
  labelForTab,
  onTabChange,
  className,
}: MarketplaceTabBarProps<T>) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap gap-2 overflow-x-auto rounded-2xl border border-border/50 bg-muted/15 p-2",
        className,
      )}
      role="tablist"
    >
      {tabs.map((item) => {
        const isActive = activeTab === item;
        return (
          <Button
            key={item}
            role="tab"
            aria-selected={isActive}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "shrink-0 rounded-xl",
              !isActive &&
                "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted/90",
            )}
            onClick={() => onTabChange(item)}
          >
            {labelForTab(item)}
          </Button>
        );
      })}
    </div>
  );
}
