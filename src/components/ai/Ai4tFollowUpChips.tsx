import { Button } from "@/components/ui/button";
import type { ClubQuickPrompt } from "@/lib/ai-context";

interface Ai4tFollowUpChipsProps {
  prompts: ClubQuickPrompt[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function Ai4tFollowUpChips({ prompts, disabled, onSelect }: Ai4tFollowUpChipsProps) {
  if (!prompts.length) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {prompts.map((p) => (
        <Button
          key={p.label}
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full text-xs h-8"
          disabled={disabled}
          onClick={() => onSelect(p.prompt)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
