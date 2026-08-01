import { Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SharedContactEmailGroup } from "@/lib/member-shared-contact-email";
import { cn } from "@/lib/utils";

interface SharedContactEmailBadgeProps {
  group: SharedContactEmailGroup;
  label: string;
  tooltipTitle: string;
  className?: string;
}

export function SharedContactEmailBadge({
  group,
  label,
  tooltipTitle,
  className,
}: SharedContactEmailBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300",
            className,
          )}
        >
          <Users className="h-3 w-3 shrink-0" />
          {label.replace("{count}", String(group.members.length))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="font-medium mb-1">{tooltipTitle}</p>
        <ul className="space-y-0.5 text-xs">
          {group.members.map((member) => (
            <li key={member.id}>
              {member.name}
              {member.memberNumber ? ` [${member.memberNumber}]` : ""}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
