import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const OPERATOR_PAGE_CLASS =
  "mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8";

export const OPERATOR_CARD_CLASS = "min-w-0 border-border/70 bg-card/70";

export const OPERATOR_HERO_CLASS =
  "rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-6";

interface OperatorPageShellProps {
  children: ReactNode;
  className?: string;
}

export function OperatorPageShell({ children, className }: OperatorPageShellProps) {
  return <div className={cn(OPERATOR_PAGE_CLASS, className)}>{children}</div>;
}

interface OperatorPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function OperatorPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  meta,
}: OperatorPageHeaderProps) {
  return (
    <section className={OPERATOR_HERO_CLASS}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
              {badge}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            {meta ? <div className="mt-3">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

interface OperatorPageErrorProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function OperatorPageError({ title, message, action }: OperatorPageErrorProps) {
  return (
    <OperatorPageShell>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="font-display text-lg text-destructive">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{message}</p>
          {action}
        </CardContent>
      </Card>
    </OperatorPageShell>
  );
}

interface OperatorInternalBannerProps {
  children: ReactNode;
  className?: string;
}

export function OperatorInternalBanner({ children, className }: OperatorInternalBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface OperatorPlaceholderBadgeProps {
  label?: string;
}

export function OperatorPlaceholderBadge({ label = "Placeholder" }: OperatorPlaceholderBadgeProps) {
  return <Badge variant="secondary">{label}</Badge>;
}

interface OperatorComingSoonActionProps {
  label?: string;
}

export function OperatorComingSoonAction({ label = "Coming soon" }: OperatorComingSoonActionProps) {
  return (
    <Button variant="outline" size="sm" disabled>
      {label}
    </Button>
  );
}
