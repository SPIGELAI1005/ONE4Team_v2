import { cn } from "@/lib/utils";
import ai4tLogo from "@/assets/ai-4-t-logo.png";
import ai4tMark from "@/assets/ai-4-t-mark.png";

const sizeClass = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

interface Ai4TLogoProps {
  size?: keyof typeof sizeClass;
  /** `bubble` = speech-bubble asset; `mark` = letters only (no frame). */
  variant?: "bubble" | "mark";
  className?: string;
  alt?: string;
}

export function Ai4TLogo({ size = "sm", variant = "bubble", className, alt = "AI 4 T" }: Ai4TLogoProps) {
  return (
    <img
      src={variant === "mark" ? ai4tMark : ai4tLogo}
      alt={alt}
      className={cn("shrink-0 object-contain", sizeClass[size], className)}
      draggable={false}
    />
  );
}
