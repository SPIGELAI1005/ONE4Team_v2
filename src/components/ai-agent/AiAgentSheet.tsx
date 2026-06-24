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
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{t.coTrainerPage.tabAgent}</SheetTitle>
          <SheetDescription>{t.coTrainerPage.agent.sheetDesc}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
          <AiAgentWorkspace compact onRunCompleted={closeAgent} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
