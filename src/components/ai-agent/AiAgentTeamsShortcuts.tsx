import { Button } from "@/components/ui/button";
import { Ai4TInlineLabel } from "@/components/ai/Ai4TBrand";
import { useLanguage } from "@/hooks/use-language";
import { useAiAgentOptional } from "@/contexts/ai-agent-context";
import type { AgentIntent } from "@/lib/ai-agent/types";

const TOP_COACH_INTENTS: AgentIntent[] = [
  "plan_training_week",
  "duplicate_training_week",
  "cancel_training",
  "notify_trainers",
];

export function AiAgentTeamsShortcuts() {
  const agent = useAiAgentOptional();
  const { t } = useLanguage();

  if (!agent?.canManageSchedule) return null;

  const labels: Record<(typeof TOP_COACH_INTENTS)[number], string> = {
    plan_training_week: t.coTrainerPage.agent.intentPlanWeek,
    duplicate_training_week: t.coTrainerPage.agent.intentDuplicateWeek,
    cancel_training: t.coTrainerPage.agent.intentCancelTraining,
    notify_trainers: t.coTrainerPage.agent.intentNotifyTrainers,
  };

  return (
    <div className="mb-4 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        <Ai4TInlineLabel text={t.teamsPage.aiAgentShortcutsTitle} logoClassName="h-4 w-4" />
      </div>
      <div className="flex flex-wrap gap-2">
        {TOP_COACH_INTENTS.map((intent) => (
          <Button
            key={intent}
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl text-xs h-8"
            onClick={() => agent.openAgent(intent)}
          >
            {labels[intent]}
          </Button>
        ))}
      </div>
    </div>
  );
}
