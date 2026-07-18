import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { usePlanGuard } from "@/hooks/use-plan-guard";
import { useSubscription } from "@/hooks/use-subscription";
import { daysUntil } from "@/lib/founding-club-offer";
import { Button } from "@/components/ui/button";
import { FoundingClubBadge } from "@/components/billing/FoundingClubBadge";
import { cn } from "@/lib/utils";

interface FoundingClubStatusCardProps {
  className?: string;
  memberCount?: number;
  teamCount?: number;
  adminCount?: number;
}

function readExpiresAt(subscription: ReturnType<typeof useSubscription>["subscription"]): string | null {
  if (!subscription) return null;
  const meta = (subscription.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.expires_at === "string") return meta.expires_at;
  if (typeof meta.offer_expires_at === "string") return meta.offer_expires_at;
  if (subscription.current_period_end) return subscription.current_period_end;
  return null;
}

export function FoundingClubStatusCard({
  className,
  memberCount = 0,
  teamCount = 0,
  adminCount = 0,
}: FoundingClubStatusCardProps) {
  const { t, language } = useLanguage();
  const { isPromotional, effective, maxMembers, maxTeams, maxAdmins } = usePlanGuard();
  const { subscription } = useSubscription();

  if (!isPromotional && effective.status !== "grace") return null;

  const expiresAt = readExpiresAt(subscription);
  const days = daysUntil(expiresAt);
  const locale = language === "de" ? "de-DE" : "en-GB";
  const dateLabel = expiresAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(expiresAt))
    : "—";

  const warning =
    effective.status === "grace" ||
    (days != null && days <= 7);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5 space-y-3",
        warning ? "border-destructive/40 bg-destructive/5" : "border-border/70 bg-card/50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FoundingClubBadge
          size="sm"
          label={t.pricingPage.foundingClubBadge ?? "Founding Club"}
        />
        <span className="text-sm font-medium text-foreground">Kick-off</span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        {effective.status === "grace"
          ? (t.pricingPage.foundingGraceMessage ??
            "Your free season has ended. You are in a read-only grace period. Choose a paid plan to continue editing.")
          : (t.pricingPage.foundingFreeUntil ?? "Your Kick-off package is free until {date}.").replace(
              "{date}",
              dateLabel,
            )}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div>
          {memberCount}/{Number.isFinite(maxMembers) ? maxMembers : "∞"}{" "}
          {t.pricingPage.memberProfilesShort ?? "profiles"}
        </div>
        <div>
          {teamCount}/{Number.isFinite(maxTeams) ? maxTeams : "∞"} {t.nav?.teams ?? "Teams"}
        </div>
        <div>
          {adminCount}/{Number.isFinite(maxAdmins) ? maxAdmins : "∞"}{" "}
          {t.pricingPage.adminsShort ?? "admins"}
        </div>
        <div>{days != null ? `${days}d` : "—"}</div>
      </div>
      <Button asChild size="sm" className="rounded-xl">
        <Link to="/pricing">{t.pricingPage.upgradeCta ?? "View plans"}</Link>
      </Button>
    </div>
  );
}
