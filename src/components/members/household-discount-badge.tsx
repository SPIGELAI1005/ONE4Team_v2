import { Percent } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HouseholdDiscountGroup } from "@/lib/member-household-discount";
import { cn } from "@/lib/utils";

interface HouseholdDiscountBadgeProps {
  group: HouseholdDiscountGroup;
  label: string;
  tooltip: string;
  className?: string;
}

export function HouseholdDiscountBadge({ group, label, tooltip, className }: HouseholdDiscountBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300",
            className,
          )}
        >
          <Percent className="h-3 w-3 shrink-0" />
          {label.replace("{count}", String(group.members.length))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="font-medium mb-1">{tooltip}</p>
        <ul className="space-y-0.5 text-xs">
          {group.members.map((member) => (
            <li key={member.id}>
              {[member.firstName, member.lastName].filter(Boolean).join(" ")}
              {member.memberNumber ? ` [${member.memberNumber}]` : ""}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
