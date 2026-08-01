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
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 p-1",
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
          "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
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
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
          mode === "internet"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "text-muted-foreground hover:text-foreground",
          (!internetAvailable || disabled) && "opacity-50",
        )}
      >
        <Globe className="h-3 w-3" />
        {copy.modeInternet}
      </button>
    </div>
  );
}

interface Ai4tInternetModeBannerProps {
  className?: string;
}

export function Ai4tInternetModeBanner({ className }: Ai4tInternetModeBannerProps) {
  const { t } = useLanguage();
  const copy = t.coTrainerPage.internetMode;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-foreground/90",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <div>
          <div className="font-semibold text-amber-800 dark:text-amber-200">{copy.bannerTitle}</div>
          <p className="mt-0.5 text-muted-foreground">{copy.bannerBody}</p>
        </div>
      </div>
    </div>
  );
}
