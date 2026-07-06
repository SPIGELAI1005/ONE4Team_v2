import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface SommerfestRegulationsInfoButtonProps {
  className?: string;
}

export function SommerfestRegulationsInfoButton({ className }: SommerfestRegulationsInfoButtonProps) {
  const { t } = useLanguage();
  const copy = t.sommerfest2026;
  const lines = [
    copy.regulations.kleinfeld,
    copy.regulations.kompaktfeld,
    copy.regulations.damen,
    copy.regulations.herren,
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 transition-colors",
            "hover:bg-white/25 active:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:min-h-10 sm:px-3.5 sm:text-xs",
            className,
          )}
          aria-label={copy.regulationsButtonLabel}
        >
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{copy.regulationsButtonLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-4">
        <p className="text-xs font-semibold text-foreground">{copy.regulationsTitle}</p>
        <ul className="space-y-1.5 text-xs leading-snug text-muted-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
