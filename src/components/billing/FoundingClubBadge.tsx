import logo from "@/assets/one4team-logo.png";
import { cn } from "@/lib/utils";

interface FoundingClubBadgeProps {
  label?: string;
  className?: string;
  /** Slightly larger badge for marketing surfaces */
  size?: "sm" | "md";
}

/**
 * Official Founding Club special badge (ONE4Team logo + label).
 * Use for promotional clubs, Pricing terms, and status cards.
 */
export function FoundingClubBadge({
  label = "Founding Club",
  className,
  size = "md",
}: FoundingClubBadgeProps) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/10 text-primary",
        isSm ? "px-2.5 py-1" : "px-3 py-1.5",
        className,
      )}
      role="status"
      aria-label={label}
    >
      <img
        src={logo}
        alt=""
        aria-hidden
        className={cn(
          "shrink-0 rounded-full object-contain",
          isSm ? "h-4 w-4" : "h-5 w-5",
        )}
      />
      <span
        className={cn(
          "font-semibold uppercase tracking-[0.14em]",
          isSm ? "text-[10px]" : "text-[11px] sm:text-xs",
        )}
      >
        {label}
      </span>
    </div>
  );
}
