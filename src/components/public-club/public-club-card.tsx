import type { ReactNode } from "react";
import { clubGlassPanelClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

interface PublicClubCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  interactive?: boolean;
}

const pad = { sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8", none: "p-0" };

export function PublicClubCard({ children, className = "", padding = "md", interactive = false }: PublicClubCardProps) {
  return (
    <div
      className={cn(
        clubGlassPanelClass,
        interactive && "club-glass-interactive",
        "overflow-hidden",
        pad[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
