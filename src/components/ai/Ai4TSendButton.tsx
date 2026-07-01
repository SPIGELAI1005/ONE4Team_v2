import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Ai4TSendButtonProps {
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  variant?: "default" | "club";
  "aria-label"?: string;
}

const clubButtonClass =
  "h-11 w-11 shrink-0 rounded-xl border border-neutral-200/90 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50 hover:text-neutral-900 [&_svg]:text-neutral-800";

export function Ai4TSendButton({
  disabled,
  onClick,
  className,
  variant = "club",
  "aria-label": ariaLabel = "Send",
}: Ai4TSendButtonProps) {
  const isClub = variant === "club";

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        isClub
          ? clubButtonClass
          : "h-11 w-11 shrink-0 rounded-xl border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:text-foreground",
        "transition-[box-shadow,opacity,transform] active:scale-[0.97] disabled:opacity-40",
        isClub && "disabled:hover:bg-white disabled:hover:shadow-sm",
        !isClub && "disabled:hover:bg-background",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
