import type { ReactNode } from "react";

interface PublicClubCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const pad = { sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export function PublicClubCard({ children, className = "", padding = "md" }: PublicClubCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${pad[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
