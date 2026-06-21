import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useAiAgent } from "@/contexts/ai-agent-context";
import { AiAgentWorkspace } from "./AiAgentWorkspace";

export function AiAgentSheet() {
  const { t } = useLanguage();
  const { sheetOpen, closeAgent } = useAiAgent();

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeAgent()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.coTrainerPage.tabAgent}</SheetTitle>
          <SheetDescription>{t.coTrainerPage.agent.sheetDesc}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <AiAgentWorkspace compact onRunCompleted={closeAgent} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
