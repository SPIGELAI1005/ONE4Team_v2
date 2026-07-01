import { Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import type { DashboardModule } from "@/lib/rbac-config";

interface ModuleAccessDeniedProps {
  module?: DashboardModule;
}

/** Safe in-page denied state - user stays on the route without seeing protected content. */
export function ModuleAccessDenied({ module }: ModuleAccessDeniedProps) {
  const { t } = useLanguage();
  const message =
    module === "marketplace"
      ? (t.marketplacePage?.accessDenied ?? t.common.notPermitted)
      : t.common.notPermitted;

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <div
        className={`${DASHBOARD_PAGE_INNER} flex flex-col items-center justify-center gap-3 py-24 text-center`}
      >
        <Lock className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
