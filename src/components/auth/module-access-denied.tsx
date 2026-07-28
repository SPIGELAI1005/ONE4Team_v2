import { Link } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { Button } from "@/components/ui/button";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import type { DashboardModule } from "@/lib/rbac-config";

interface ModuleAccessDeniedProps {
  module?: DashboardModule;
  title?: string;
  description?: string;
  contactHint?: string;
}

/** Safe in-page denied state - user stays on the route without seeing protected content. */
export function ModuleAccessDenied({
  module,
  title,
  description,
  contactHint,
}: ModuleAccessDeniedProps) {
  const { t } = useLanguage();
  const resolvedTitle = title ?? t.common.accessRestrictedTitle;
  const resolvedDescription =
    description ??
    (module === "marketplace"
      ? (t.marketplacePage?.accessDenied ?? t.common.accessRestrictedBody)
      : t.common.accessRestrictedBody);
  const resolvedContactHint = contactHint ?? t.common.accessRestrictedContactClubAdmin;

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <div
        className={`${DASHBOARD_PAGE_INNER} flex items-center justify-center py-16 sm:py-24`}
      >
        <div className="w-full max-w-2xl rounded-[28px] border border-border/60 bg-card/50 p-6 text-center shadow-sm backdrop-blur-2xl sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </div>

          <div className="mt-5 space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <BrandedText text={resolvedTitle} />
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {resolvedDescription}
            </p>
            <p className="mx-auto max-w-lg text-xs leading-5 text-muted-foreground/90 sm:text-sm">
              {resolvedContactHint}
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="bg-gradient-gold-static text-primary-foreground hover:brightness-110">
              <Link to="/settings">
                <Lock className="mr-2 h-4 w-4" />
                {t.common.reviewMyAccess}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/support">{t.common.openSupport}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
