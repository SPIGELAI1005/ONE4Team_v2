import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MemberDuplicateReviewFlag, MemberDuplicateReviewReason } from "@/lib/member-duplicate-review";
import { cn } from "@/lib/utils";

interface DuplicateReviewBadgeProps {
  flag: MemberDuplicateReviewFlag;
  label: string;
  tooltipTitle: string;
  reasonLabels: Record<MemberDuplicateReviewReason, string>;
  className?: string;
}

export function DuplicateReviewBadge({
  flag,
  label,
  tooltipTitle,
  reasonLabels,
  className,
}: DuplicateReviewBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200",
            className,
          )}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="mb-1 font-medium">{tooltipTitle}</p>
        <ul className="space-y-0.5 text-xs">
          {flag.reasons.map((reason) => (
            <li key={reason}>{reasonLabels[reason]}</li>
          ))}
        </ul>
        {flag.related.length > 0 ? (
          <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {flag.related.map((related) => (
              <li key={`${related.source}:${related.id}`}>
                {related.name}
                {related.memberNumber ? ` [${related.memberNumber}]` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
