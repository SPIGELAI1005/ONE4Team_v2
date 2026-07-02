import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/useAuth";
import { useModuleGateRole, readActiveDashboardPersonaRaw } from "@/hooks/use-module-gate-role";
import { defaultPartnerPortalPath } from "@/lib/partner-portal-routes";
import { canAccessModule } from "@/lib/rbac-config";
import type { DashboardModule } from "@/lib/rbac-config";
import { ModuleAccessDenied } from "@/components/auth/module-access-denied";

const DEV_BYPASS_GUARDS =
  import.meta.env.DEV &&
  window.location.hostname === "localhost" &&
  import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface RequireModuleProps {
  module: DashboardModule;
  children: React.ReactNode;
  fallbackPath?: string;
  /** `redirect` sends user away; `lock` shows a safe denied state on the current route. */
  deniedMode?: "redirect" | "lock";
}

export function RequireModule({
  module,
  children,
  fallbackPath,
  deniedMode = "redirect",
}: RequireModuleProps) {
  const { user, loading: authLoading } = useAuth();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();

  if (authLoading || perms.activeClubLoading || perms.assignmentsLoading) {
    return (
      <div className="min-h-[40vh] w-full px-6 py-10 text-sm text-stone-500 dark:text-stone-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (DEV_BYPASS_GUARDS) return <>{children}</>;

  const roleForGate =
    gateRole ??
    (perms.isAdmin && !perms.assignmentsLoading
      ? ("club_admin" as const)
      : null);

  if (!roleForGate || !canAccessModule(roleForGate, module)) {
    if (deniedMode === "lock") {
      return <ModuleAccessDenied module={module} />;
    }
    const persona = readActiveDashboardPersonaRaw() ?? perms.role ?? "member";
    const fallback = defaultPartnerPortalPath(roleForGate ?? gateRole, persona);
    return <Navigate to={fallbackPath || fallback} replace />;
  }

  return <>{children}</>;
}

export default RequireModule;
