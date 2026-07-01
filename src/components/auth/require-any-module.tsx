import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/useAuth";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { canAccessModule, type DashboardModule } from "@/lib/rbac-config";
import { ModuleAccessDenied } from "@/components/auth/module-access-denied";

const DEV_BYPASS_GUARDS =
  import.meta.env.DEV &&
  window.location.hostname === "localhost" &&
  import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface RequireAnyModuleProps {
  modules: readonly DashboardModule[];
  children: React.ReactNode;
  fallbackPath?: string;
  deniedMode?: "redirect" | "lock";
}

/** Allow when the user can access at least one of the listed modules. */
export function RequireAnyModule({
  modules,
  children,
  fallbackPath,
  deniedMode = "redirect",
}: RequireAnyModuleProps) {
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

  const allowed = gateRole != null && modules.some((module) => canAccessModule(gateRole, module));

  if (!allowed) {
    if (deniedMode === "lock") {
      return <ModuleAccessDenied module={modules[0]} />;
    }
    const slug = perms.role || "member";
    return <Navigate to={fallbackPath || `/dashboard/${slug}`} replace />;
  }

  return <>{children}</>;
}
