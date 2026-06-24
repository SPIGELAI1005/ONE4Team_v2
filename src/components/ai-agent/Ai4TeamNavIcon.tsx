import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ai4TeamAgentIconProps {
  className?: string;
}

/** Robot icon for AI 4 T Agent tab and shortcuts (dashboard + public club). */
export function Ai4TeamAgentIcon({ className }: Ai4TeamAgentIconProps) {
  return <Bot className={cn("h-3.5 w-3.5 shrink-0", className)} aria-hidden />;
}
