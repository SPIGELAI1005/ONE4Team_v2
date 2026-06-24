import { useEffect, useState } from "react";
import { CalendarX, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { cancelProposalIsExecutable, enrichAgentProposalDisplay } from "@/lib/ai-agent/enrich-agent-proposal";
import { extractCancelTrainingTarget } from "@/lib/ai-agent/proposal-display";
import type { AgentProposalPayload, AgentProposeResponse } from "@/lib/ai-agent/types";

interface AiAgentProposalCardProps {
  proposal: AgentProposeResponse;
  busy?: boolean;
  variant?: "default" | "light";
  clubId?: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function AiAgentProposalCard({
  proposal,
  busy,
  variant = "default",
  clubId = null,
  onConfirm,
  onDismiss,
}: AiAgentProposalCardProps) {
  const { t, language } = useLanguage();
  const p = t.coTrainerPage.agent;
  const isLight = variant === "light";
  const [displayProposal, setDisplayProposal] = useState(proposal);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    setDisplayProposal(proposal);
    if (!clubId) return;

    const body = proposal.proposal;
    const cancelStep = body?.steps?.find((step) => step.tool === "cancel_training");
    if (!cancelStep) return;

    let cancelled = false;
    setEnriching(true);
    void enrichAgentProposalDisplay(proposal, clubId, language)
      .then((enriched) => {
        if (!cancelled) setDisplayProposal(enriched);
      })
      .finally(() => {
        if (!cancelled) setEnriching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [proposal, clubId, language]);

  const body = displayProposal.proposal as AgentProposalPayload;
  const cancelTarget = extractCancelTrainingTarget(body, language);
  const hasCancelStep = body.steps?.some((step) => step.tool === "cancel_training") ?? false;
  const canExecute = !hasCancelStep || cancelProposalIsExecutable(displayProposal);
  const summaryText = displayProposal.summary?.trim() || body.summary?.trim() || "";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3",
        isLight
          ? "border-neutral-300 bg-white shadow-md"
          : "border-primary/25 bg-card/50 backdrop-blur-2xl",
      )}
    >
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5",
          isLight ? "border-emerald-200 bg-emerald-50/90" : "border-emerald-500/30 bg-emerald-500/10",
        )}
      >
        <p className={cn("text-xs font-semibold", isLight ? "text-emerald-900" : "text-emerald-100")}>
          {p.proposalUnderstoodLabel}
        </p>
        <p
          className={cn(
            "mt-1 text-sm leading-snug font-medium",
            isLight ? "text-neutral-900" : "text-foreground",
          )}
        >
          {summaryText || body.title}
        </p>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
            isLight ? "bg-neutral-50 border-neutral-200 text-neutral-700" : "bg-primary/10 border-primary/20",
          )}
        >
          <ShieldCheck className={cn("w-4 h-4", !isLight && "text-primary")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold", isLight ? "text-neutral-900" : "text-foreground")}>
            {body.title}
          </div>
          <p
            className={cn(
              "text-xs mt-1 leading-relaxed",
              isLight ? "text-neutral-600" : "text-muted-foreground",
            )}
          >
            {p.proposalReviewHint}
          </p>
        </div>
      </div>

      {hasCancelStep ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5 space-y-1.5",
            isLight ? "border-amber-200 bg-amber-50/80" : "border-border/60 bg-background/50",
          )}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
            <CalendarX className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            {p.proposalSessionToCancel}
            {enriching ? <Loader2 className="h-3 w-3 animate-spin text-neutral-500" /> : null}
          </div>
          {enriching && !cancelTarget?.when && !cancelTarget?.teamName ? (
            <p className="text-xs text-neutral-600">{p.proposalLoadingSession}</p>
          ) : (
            <dl className="grid gap-1.5 text-xs">
              {cancelTarget?.teamName ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-neutral-600">{p.proposalTeamLabel}</dt>
                  <dd className="font-semibold text-neutral-900">{cancelTarget.teamName}</dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 font-medium text-neutral-600">{p.proposalTitleLabel}</dt>
                <dd className="font-semibold text-neutral-900">{cancelTarget?.title ?? "Training"}</dd>
              </div>
              {cancelTarget?.when ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-neutral-600">{p.proposalWhenLabel}</dt>
                  <dd className="font-semibold text-neutral-900">{cancelTarget.when}</dd>
                </div>
              ) : (
                <p className="text-[11px] font-medium text-red-700">{p.proposalActivityUnresolved}</p>
              )}
              {cancelTarget?.reason ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-neutral-600">{p.proposalReasonLabel}</dt>
                  <dd className="text-neutral-800">{cancelTarget.reason}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      ) : null}

      {body.steps?.length ? (
        <ul className="space-y-2">
          {body.steps.map((step, i) => (
            <li
              key={`${step.tool}-${i}`}
              className={cn(
                "text-xs rounded-xl border px-3 py-2",
                isLight
                  ? "border-neutral-200 bg-neutral-50 text-neutral-800"
                  : "border-border/60 bg-background/50 text-foreground/90",
              )}
            >
              {step.label}
            </li>
          ))}
        </ul>
      ) : null}

      {body.warnings?.map((w) => (
        <p key={w} className="text-[11px] text-amber-700">
          {w}
        </p>
      ))}

      {hasCancelStep && !canExecute ? (
        <p className="text-xs font-medium text-red-700">{p.proposalConfirmBlocked}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          className={cn(
            "font-semibold",
            isLight
              ? "bg-neutral-800 text-white hover:bg-neutral-700"
              : "bg-gradient-gold-static text-primary-foreground",
          )}
          disabled={busy || enriching || !canExecute}
          onClick={onConfirm}
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {p.confirm}
        </Button>
        <Button
          type="button"
          variant={isLight ? "secondary" : "outline"}
          disabled={busy}
          className={cn(
            isLight &&
              "border border-neutral-300 bg-neutral-200 text-neutral-800 hover:bg-neutral-300 hover:text-neutral-900",
          )}
          onClick={onDismiss}
        >
          {p.dismiss}
        </Button>
      </div>
    </div>
  );
}
