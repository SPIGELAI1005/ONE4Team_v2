import { cn } from "@/lib/utils";

interface MarketplaceSchemaBannerProps {
  message: string;
  compact?: boolean;
  className?: string;
}

export function MarketplaceSchemaBanner({ message, compact, className }: MarketplaceSchemaBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        compact ? "rounded-xl px-3 py-2 text-xs" : "px-4 py-3 text-sm",
        className,
      )}
    >
      {message}
    </div>
  );
}
