import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useAiAgentOptional } from "@/contexts/ai-agent-context";
import type { AgentIntent } from "@/lib/ai-agent/types";

interface AiAgentHeaderButtonProps {
  intent?: AgentIntent;
  className?: string;
}

export function AiAgentHeaderButton({ intent, className }: AiAgentHeaderButtonProps) {
  const agent = useAiAgentOptional();
  const { t } = useLanguage();

  if (!agent) return null;
  if (!agent.canManageSchedule && !agent.canManageMembers) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className ?? "rounded-2xl gap-1.5 shrink-0"}
      onClick={() => agent.openAgent(intent)}
      title={t.coTrainerPage.agent.headerShortcutTitle}
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline">{t.coTrainerPage.tabAgent}</span>
    </Button>
  );
}
