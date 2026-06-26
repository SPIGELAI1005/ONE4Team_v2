import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { clubCtaFillHoverClass } from "@/lib/public-club-cta-classes";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { isSommerfestLivePulsateActive } from "@/lib/sommerfest-live-pulse";
import { cn } from "@/lib/utils";

interface SommerfestLiveTournamentCtaProps {
  to: string;
  clubPrimaryColor?: string | null;
  className?: string;
}

export function SommerfestLiveTournamentCta({ to, clubPrimaryColor, className }: SommerfestLiveTournamentCtaProps) {
  const { t } = useLanguage();
  const pulsate = isSommerfestLivePulsateActive();

  if (pulsate) {
    return (
      <Link
        to={to}
        className={cn(
          "sommerfest-live-cta-pulse inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
          className,
        )}
      >
        <Radio className="sommerfest-live-cta-icon h-4 w-4 shrink-0" aria-hidden />
        {t.sommerfest2026.viewLiveTournament}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold ${clubCtaFillHoverClass}`,
        className,
      )}
      style={{
        backgroundColor: "var(--club-primary)",
        color: readableTextOnSolid(clubPrimaryColor || "#C4A052"),
      }}
    >
      <Radio className="h-4 w-4 shrink-0" aria-hidden />
      {t.sommerfest2026.viewLiveTournament}
    </Link>
  );
}
