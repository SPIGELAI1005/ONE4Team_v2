import ai4tWordmark from "@/assets/ai-4-t-wordmark.png";
import { cn } from "@/lib/utils";

interface Ai4TWordmarkProps {
  className?: string;
  alt?: string;
  id?: string;
}

export function Ai4TWordmark({ className, alt = "AI 4 T by ONE 4 Team", id }: Ai4TWordmarkProps) {
  return (
    <img
      id={id}
      src={ai4tWordmark}
      alt={alt}
      className={cn("shrink-0 object-contain object-left", className)}
      draggable={false}
    />
  );
}
