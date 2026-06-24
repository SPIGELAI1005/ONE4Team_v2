import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clubCtaFillHoverClass,
  clubCtaOutlineButtonClass,
  clubCtaPrimaryInlineStyle,
} from "@/lib/public-club-cta-classes";

export interface PublicClubButtonProps extends ButtonProps {
  appearance?: "primary" | "outline";
  clubPrimaryColor?: string | null;
}

export const PublicClubButton = forwardRef<HTMLButtonElement, PublicClubButtonProps>(function PublicClubButton(
  { appearance = "primary", clubPrimaryColor, className, style, ...props },
  ref,
) {
  if (appearance === "outline") {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(clubCtaOutlineButtonClass, "rounded-full font-semibold", className)}
        style={style}
        {...props}
      />
    );
  }

  return (
    <Button
      ref={ref}
      className={cn(
        "rounded-full font-semibold shadow-md ring-1 ring-black/10 dark:ring-0",
        clubCtaFillHoverClass,
        className,
      )}
      style={{ ...clubCtaPrimaryInlineStyle(clubPrimaryColor), ...style }}
      {...props}
    />
  );
});
