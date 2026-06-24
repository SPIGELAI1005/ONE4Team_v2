import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { clubCtaFillHoverClass, clubCtaOutlineButtonClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";

interface PublicClubCtaProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline";
  clubPrimaryColor?: string | null;
}

export function PublicClubCta({
  children,
  variant = "primary",
  clubPrimaryColor,
  className = "",
  style,
  ...rest
}: PublicClubCtaProps) {
  if (variant === "outline") {
    return (
      <Button
        variant="outline"
        className={`rounded-full ${clubCtaOutlineButtonClass} ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      className={`rounded-full font-semibold shadow-md ring-1 ring-black/10 dark:ring-0 ${clubCtaFillHoverClass} ${className}`}
      style={{ ...clubCtaPrimaryInlineStyle(clubPrimaryColor), ...style }}
      {...rest}
    >
      {children}
    </Button>
  );
}
