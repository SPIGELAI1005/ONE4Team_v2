import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { usePlanGuard } from "@/hooks/use-plan-guard";
import { canMutateClubData } from "@/lib/write-access-guard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Banner when club is in grace / no-plan write lock. */
export function GraceWriteBanner({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { effective } = usePlanGuard();

  if (canMutateClubData(effective)) return null;

  const isGrace = effective.status === "grace";
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between",
        className,
      )}
    >
      <p className="text-sm text-foreground/90">
        {isGrace
          ? (t.pricingPage.foundingGraceMessage ??
            "Your free season has ended. You are in a read-only grace period. Choose a paid plan to continue editing.")
          : (t.pricingPage.noPlanWriteMessage ??
            "Your club does not have an active plan. Choose a package to unlock editing.")}
      </p>
      <Button asChild size="sm" className="shrink-0 rounded-xl">
        <Link to="/pricing">{t.pricingPage.upgradeCta ?? "View plans"}</Link>
      </Button>
    </div>
  );
}
