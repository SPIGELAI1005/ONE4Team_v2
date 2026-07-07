import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DASHBOARD_TOOLBAR_BUTTON } from "@/lib/dashboard-page-shell";

export interface DashboardToolbarAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "gold";
  disabled?: boolean;
  hidden?: boolean;
}

interface DashboardToolbarActionsProps {
  actions: DashboardToolbarAction[];
  leading?: ReactNode;
  /** Icon buttons shown before overflow on viewports below lg */
  maxVisibleMobile?: number;
  className?: string;
}

function actionButtonClass(variant: DashboardToolbarAction["variant"]) {
  return cn(
    DASHBOARD_TOOLBAR_BUTTON,
    variant === "gold" &&
      "border-transparent bg-gradient-gold-static text-primary-foreground shadow-gold hover:brightness-110",
    variant === "outline" && "glass-card",
  );
}

function renderDesktopAction(action: DashboardToolbarAction) {
  const Icon = action.icon;
  const content = (
    <>
      <Icon className="mr-1 h-4 w-4" strokeWidth={1.5} />
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button
        key={action.id}
        asChild
        size="sm"
        variant={action.variant === "gold" ? "default" : action.variant ?? "default"}
        className={actionButtonClass(action.variant)}
        disabled={action.disabled}
      >
        <Link to={action.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      key={action.id}
      type="button"
      size="sm"
      variant={action.variant === "gold" ? "default" : action.variant ?? "default"}
      className={actionButtonClass(action.variant)}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

function renderMobileIconAction(action: DashboardToolbarAction) {
  const Icon = action.icon;
  const className = cn(actionButtonClass(action.variant), "h-10 w-10 shrink-0 px-0");

  if (action.href) {
    return (
      <Button
        key={action.id}
        asChild
        size="icon"
        variant={action.variant === "gold" ? "default" : action.variant ?? "default"}
        className={className}
        disabled={action.disabled}
        aria-label={action.label}
        title={action.label}
      >
        <Link to={action.href}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      key={action.id}
      type="button"
      size="icon"
      variant={action.variant === "gold" ? "default" : action.variant ?? "default"}
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
      aria-label={action.label}
      title={action.label}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}

export function DashboardToolbarActions({
  actions,
  leading,
  maxVisibleMobile = 2,
  className,
}: DashboardToolbarActionsProps) {
  const visible = actions.filter((action) => !action.hidden);
  const mobilePrimary = visible.slice(0, maxVisibleMobile);
  const mobileOverflow = visible.slice(maxVisibleMobile);

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {leading}
      {visible.map((action) => (
        <span key={action.id} className="hidden lg:contents">
          {renderDesktopAction(action)}
        </span>
      ))}
      <div className="flex items-center gap-1.5 lg:hidden">
        {mobilePrimary.map((action) => renderMobileIconAction(action))}
        {mobileOverflow.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-xl"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {mobileOverflow.map((action) => {
                const Icon = action.icon;
                if (action.href) {
                  return (
                    <DropdownMenuItem key={action.id} asChild disabled={action.disabled}>
                      <Link to={action.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={action.disabled}
                    onClick={action.onClick}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
