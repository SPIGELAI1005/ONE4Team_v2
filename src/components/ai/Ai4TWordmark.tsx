import ai4tGlassLogo from "@/assets/ai-4-t-glass-logo.png";
import ai4tWordmark from "@/assets/ai-4-t-wordmark.png";
import { cn } from "@/lib/utils";

interface Ai4TWordmarkProps {
  className?: string;
  alt?: string;
  id?: string;
  /** `compact` = text wordmark; `glass` = full 3D icon + wordmark (marketing). */
  variant?: "compact" | "glass";
}

export function Ai4TWordmark({
  className,
  alt = "AI 4 T by ONE 4 Team",
  id,
  variant = "compact",
}: Ai4TWordmarkProps) {
  return (
    <img
      id={id}
      src={variant === "glass" ? ai4tGlassLogo : ai4tWordmark}
      alt={alt}
      className={cn(
        "shrink-0 object-contain",
        variant === "glass" ? "object-center" : "object-left",
        className,
      )}
      draggable={false}
    />
  );
}
