import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import type { AgentProposalPayload, AgentProposeResponse } from "@/lib/ai-agent/types";

interface AiAgentProposalCardProps {
  proposal: AgentProposeResponse;
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function AiAgentProposalCard({ proposal, busy, onConfirm, onDismiss }: AiAgentProposalCardProps) {
  const { t } = useLanguage();
  const p = t.coTrainerPage.agent;
  const body = proposal.proposal as AgentProposalPayload;

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/50 backdrop-blur-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{body.title}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proposal.summary}</p>
        </div>
      </div>

      {body.steps?.length ? (
        <ul className="space-y-2">
          {body.steps.map((step, i) => (
            <li
              key={`${step.tool}-${i}`}
              className="text-xs rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-foreground/90"
            >
              {step.label}
            </li>
          ))}
        </ul>
      ) : null}

      {body.warnings?.map((w) => (
        <p key={w} className="text-[11px] text-amber-600 dark:text-amber-400">
          {w}
        </p>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          className="bg-gradient-gold-static text-primary-foreground font-semibold"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {p.confirm}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onDismiss}>
          {p.dismiss}
        </Button>
      </div>
    </div>
  );
}
