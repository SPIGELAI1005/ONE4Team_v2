import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import type { Ai4TChatMode } from "@/lib/ai-internet-research";

interface Ai4tChatModeToggleProps {
  mode: Ai4TChatMode;
  disabled?: boolean;
  internetAvailable?: boolean;
  onChange: (mode: Ai4TChatMode) => void;
  className?: string;
}

export function Ai4tChatModeToggle({
  mode,
  disabled,
  internetAvailable = true,
  onChange,
  className,
}: Ai4tChatModeToggleProps) {
  const { t } = useLanguage();
  const copy = t.coTrainerPage.internetMode;

  return (
    <div
      className={cn(
        "inline-grid w-[9.5rem] shrink-0 grid-cols-2 gap-0.5 rounded-full border border-border/60 bg-background/50 p-0.5",
        className,
      )}
      role="tablist"
      aria-label={copy.toggleLabel}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "club"}
        disabled={disabled}
        onClick={() => onChange("club")}
        className={cn(
          "inline-flex min-h-[1.375rem] items-center justify-center rounded-full px-1 text-[10px] font-medium transition-colors",
          mode === "club" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {copy.modeClub}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "internet"}
        disabled={disabled || !internetAvailable}
        title={!internetAvailable ? copy.unavailableHint : copy.modeInternetHint}
        onClick={() => onChange("internet")}
        className={cn(
          "inline-flex min-h-[1.375rem] items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-medium transition-colors",
          mode === "internet"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "text-muted-foreground hover:text-foreground",
          (!internetAvailable || disabled) && "opacity-50",
        )}
      >
        <Globe className="h-3 w-3 shrink-0" aria-hidden />
        <span>{copy.modeInternet}</span>
      </button>
    </div>
  );
}
