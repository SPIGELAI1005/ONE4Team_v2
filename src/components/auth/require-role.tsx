import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/useAuth";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { dashboardPathForPersona } from "@/lib/switch-dashboard-persona";
import { normalizeDashboardRole } from "@/lib/rbac-config";
import { ModuleAccessDenied } from "@/components/auth/module-access-denied";

const DEV_BYPASS_GUARDS =
  import.meta.env.DEV &&
  window.location.hostname === "localhost" &&
  import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface RequireRoleProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireTrainer?: boolean;
  fallbackPath?: string;
  deniedMode?: "redirect" | "lock";
}

export function RequireAdmin({
  children,
  fallbackPath,
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) {
  return <RequireRole requireAdmin fallbackPath={fallbackPath} deniedMode="lock">{children}</RequireRole>;
}

export function RequireTrainer({ children, fallbackPath }: { children: React.ReactNode; fallbackPath?: string }) {
  return <RequireRole requireTrainer fallbackPath={fallbackPath} deniedMode="lock">{children}</RequireRole>;
}

function RequireRole({
  children,
  requireAdmin,
  requireTrainer,
  fallbackPath,
  deniedMode = "lock",
}: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();

  if (authLoading) {
    return (
      <div className="min-h-[40vh] w-full px-6 py-10 text-sm text-stone-500 dark:text-stone-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (perms.activeClubLoading || perms.assignmentsLoading) {
    return (
      <div className="min-h-[40vh] w-full px-6 py-10 text-sm text-stone-500 dark:text-stone-400">
        Loading…
      </div>
    );
  }

  if (DEV_BYPASS_GUARDS) return <>{children}</>;

  if (requireAdmin && !perms.isAdmin) {
    if (deniedMode === "lock") {
      return <ModuleAccessDenied />;
    }
    const redirectRole = gateRole ?? normalizeDashboardRole(perms.role) ?? "member";
    return <Navigate to={fallbackPath || dashboardPathForPersona(redirectRole)} replace />;
  }

  if (requireTrainer && !perms.isTrainer) {
    if (deniedMode === "lock") {
      return <ModuleAccessDenied />;
    }
    const redirectRole = gateRole ?? normalizeDashboardRole(perms.role) ?? "member";
    return <Navigate to={fallbackPath || dashboardPathForPersona(redirectRole)} replace />;
  }

  return <>{children}</>;
}

export default RequireRole;
