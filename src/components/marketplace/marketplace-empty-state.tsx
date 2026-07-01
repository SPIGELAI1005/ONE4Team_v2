import { type LucideIcon, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MarketplaceEmptyStateVariant = "panel" | "compact" | "banner";

interface MarketplaceEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
  variant?: MarketplaceEmptyStateVariant;
}

export function MarketplaceEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
  variant = "panel",
}: MarketplaceEmptyStateProps) {
  const hasAction = Boolean(actionLabel && (onAction || actionHref));

  const actionButton = hasAction ? (
    actionHref ? (
      <Button asChild className={cn(variant === "banner" ? "shrink-0" : "mt-6", "bg-gradient-gold-static text-primary-foreground hover:brightness-110")}>
        <Link to={actionHref}>{actionLabel}</Link>
      </Button>
    ) : (
      <Button
        className={cn(variant === "banner" ? "shrink-0" : "mt-6", "bg-gradient-gold-static text-primary-foreground hover:brightness-110")}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    )
  ) : null;

  const iconNode = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold",
        variant === "banner" ? "h-11 w-11" : "h-14 w-14",
      )}
    >
      <Icon className={cn(variant === "banner" ? "h-5 w-5" : "h-7 w-7")} strokeWidth={1.5} />
    </div>
  );

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-card/40 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          {iconNode}
          <div className="min-w-0 text-left">
            <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
          </div>
        </div>
        {actionButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-card/40 to-card/40 text-center backdrop-blur-2xl",
        variant === "compact" ? "px-5 py-10" : "px-6 py-14",
        className,
      )}
    >
      <div className="mb-4">{iconNode}</div>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionButton}
    </div>
  );
}
