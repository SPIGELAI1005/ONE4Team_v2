import type { LucideIcon } from "lucide-react";

interface OperatorSectionEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export function OperatorSectionEmptyState({ icon: Icon, title, description }: OperatorSectionEmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/40 p-8 text-center">
      {Icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
