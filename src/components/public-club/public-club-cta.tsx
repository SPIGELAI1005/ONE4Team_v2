import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PublicClubCtaProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline";
}

export function PublicClubCta({ children, variant = "primary", className = "", ...rest }: PublicClubCtaProps) {
  if (variant === "outline") {
    return (
      <Button
        variant="outline"
        className={`rounded-full border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)] shadow-sm hover:bg-white/10 ${className}`}
        {...rest}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      className={`rounded-full font-semibold text-white shadow-md ring-1 ring-black/10 hover:brightness-110 dark:ring-0 ${className}`}
      style={{ backgroundColor: "var(--club-primary)" }}
      {...rest}
    >
      {children}
    </Button>
  );
}
