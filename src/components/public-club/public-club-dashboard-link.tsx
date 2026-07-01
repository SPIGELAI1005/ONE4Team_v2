import { ExternalLink, Info } from "lucide-react";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { PublicClubCard } from "@/components/public-club/public-club-card";
interface PublicClubDashboardLinkProps {
  label: string;
  onClick: () => void;
  hint?: string;
}

/** Secondary link to open the full dashboard view (mirrors AI 4 T modal footer). */
export function PublicClubDashboardLink({ label, onClick, hint }: PublicClubDashboardLinkProps) {
  return (
    <PublicClubCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {hint ? <p className="text-sm text-[color:var(--club-muted)]">{hint}</p> : null}
      <PublicClubButton
        type="button"
        appearance="outline"
        onClick={onClick}
        className="shrink-0 gap-1.5 px-4 py-2 text-sm min-h-[44px]"
      >
        {label}
        <ExternalLink className="h-4 w-4 shrink-0" />
      </PublicClubButton>    </PublicClubCard>
  );
}

interface PublicClubReportsIntroProps {
  scope: string;
  financialNote?: string;
}

export function PublicClubReportsIntro({ scope, financialNote }: PublicClubReportsIntroProps) {
  return (
    <PublicClubCard padding="sm" className="flex gap-3 text-left">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--club-primary)]" aria-hidden />
      <div className="min-w-0 space-y-2 text-sm leading-relaxed text-[color:var(--club-muted)]">
        <p>{scope}</p>
        {financialNote ? (
          <p className="rounded-lg border border-[color:var(--club-border)]/40 bg-white/5 px-3 py-2 text-xs">
            {financialNote}
          </p>
        ) : null}
      </div>
    </PublicClubCard>
  );
}

/** Shared width + alignment for club microsite detail pages (reports, live scores). */
export const publicClubDetailStackClass = "mx-auto w-full max-w-4xl space-y-6 text-left";
