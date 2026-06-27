import { Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClubTeamOption } from "@/lib/member-team-assignments";

interface MemberTeamAssignmentFieldProps {
  teams: ClubTeamOption[];
  selectedTeamIds: string[];
  onChange: (teamIds: string[]) => void;
  disabled?: boolean;
  /** Saved-list drafts: pick one primary team. */
  single?: boolean;
  labels: {
    title: string;
    hint: string;
    placeholder: string;
    none: string;
    selectedCount: string;
  };
}

export function MemberTeamAssignmentField({
  teams,
  selectedTeamIds,
  onChange,
  disabled = false,
  single = false,
  labels,
}: MemberTeamAssignmentFieldProps) {
  const toggleTeam = (teamId: string) => {
    if (disabled) return;
    if (single) {
      onChange(selectedTeamIds.includes(teamId) ? [] : [teamId]);
      return;
    }
    onChange(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((id) => id !== teamId)
        : [...selectedTeamIds, teamId],
    );
  };

  if (single) {
    const value = selectedTeamIds[0] ?? "__none__";
    return (
      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-primary" />
          {labels.title}
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">{labels.hint}</p>
        <Select
          value={value}
          disabled={disabled || teams.length === 0}
          onValueChange={(next) => onChange(next === "__none__" ? [] : [next])}
        >
          <SelectTrigger className="h-10 bg-background/60 text-sm">
            <SelectValue placeholder={labels.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{labels.none}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
                {team.age_group ? ` · ${team.age_group}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Trophy className="h-4 w-4 text-primary" />
        {labels.title}
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">{labels.hint}</p>
      {teams.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.none}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => {
            const active = selectedTeamIds.includes(team.id);
            return (
              <button
                key={team.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleTeam(team.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {team.name}
                {team.age_group ? ` · ${team.age_group}` : ""}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {labels.selectedCount.replace("{count}", String(selectedTeamIds.length))}
      </p>
    </div>
  );
}
