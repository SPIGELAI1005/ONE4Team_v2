import { Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SharedContactEmailGroup, SharedContactEmailMember } from "@/lib/member-shared-contact-email";
import { cn } from "@/lib/utils";

interface SharedContactAccountsPanelLabels {
  title: string;
  current: string;
  showAll: string;
  openMember: string;
  importPreview: string;
}

interface SharedContactAccountsPanelProps {
  group: SharedContactEmailGroup;
  currentId: string;
  labels: SharedContactAccountsPanelLabels;
  onShowAll: (email: string) => void;
  onOpenMember: (member: SharedContactEmailMember) => void;
  className?: string;
}

export function SharedContactAccountsPanel({
  group,
  currentId,
  labels,
  onShowAll,
  onOpenMember,
  className,
}: SharedContactAccountsPanelProps) {
  if (group.members.length < 2) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-sky-500/20 bg-sky-500/5 p-3",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-sky-300">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {labels.title}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-primary hover:text-primary"
          onClick={() => onShowAll(group.email)}
        >
          <Filter className="mr-1 h-3 w-3" />
          {labels.showAll}
        </Button>
      </div>
      <ul className="space-y-1.5">
        {group.members.map((member) => {
          const isCurrent = member.id === currentId;
          const canOpen = !isCurrent && member.source !== "import";
          const memberLabel = `${member.name}${member.memberNumber ? ` [${member.memberNumber}]` : ""}`;

          return (
            <li
              key={`${member.source}:${member.id}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1"
            >
              {canOpen ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto min-w-0 justify-start px-0 py-0 text-sm font-normal text-foreground"
                  onClick={() => onOpenMember(member)}
                  aria-label={labels.openMember.replace("{name}", member.name)}
                >
                  {memberLabel}
                </Button>
              ) : (
                <span className="min-w-0 text-sm font-medium text-foreground">
                  {memberLabel}
                  {isCurrent ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({labels.current})</span>
                  ) : null}
                </span>
              )}
              {!canOpen && !isCurrent && member.source === "import" ? (
                <span className="text-[10px] text-muted-foreground">{labels.importPreview}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
