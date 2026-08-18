import { Link } from "react-router-dom";
import { Heart, CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuardianWardSummary } from "@/lib/member-guardian-api";

export interface GuardianFamilyPanelLabels {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDesc: string;
  editRegistry: string;
  openActivities: string;
  inactiveBadge: string;
}

interface GuardianFamilyPanelProps {
  wards: GuardianWardSummary[];
  labels: GuardianFamilyPanelLabels;
  getRoleLabel: (role: string) => string;
  unknownMemberLabel: string;
  onSelectWard?: (wardMembershipId: string) => void;
}

export function GuardianFamilyPanel({
  wards,
  labels,
  getRoleLabel,
  unknownMemberLabel,
  onSelectWard,
}: GuardianFamilyPanelProps) {
  if (wards.length === 0) {
    return (
      <div
        className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm"
        data-testid="guardian-family-panel-empty"
      >
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          {labels.emptyTitle}
        </div>
        <p className="mt-2 text-muted-foreground leading-relaxed">{labels.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3"
      data-testid="guardian-family-panel"
    >
      <div>
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          {labels.title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{labels.subtitle}</p>
      </div>
      <div className="space-y-2">
        {wards.map((ward) => {
          const name = ward.displayName?.trim() || unknownMemberLabel;
          return (
            <div
              key={ward.linkId}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`guardian-ward-${ward.wardMembershipId}`}
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {getRoleLabel(ward.role)}
                  {ward.teamLabel ? ` · ${ward.teamLabel}` : ""}
                  {ward.status !== "active" ? ` · ${labels.inactiveBadge}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {onSelectWard ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => onSelectWard(ward.wardMembershipId)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {labels.editRegistry}
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <Link to="/activities">
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    {labels.openActivities}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
