import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/useAuth";

const DEV_BYPASS_GUARDS =
  import.meta.env.DEV &&
  window.location.hostname === "localhost" &&
  import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface RequireRoleProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireTrainer?: boolean;
  fallbackPath?: string;
}

export function RequireAdmin({ children, fallbackPath }: { children: React.ReactNode; fallbackPath?: string }) {
  return <RequireRole requireAdmin>{children}</RequireRole>;
}

export function RequireTrainer({ children, fallbackPath }: { children: React.ReactNode; fallbackPath?: string }) {
  return <RequireRole requireTrainer>{children}</RequireRole>;
}

function RequireRole({ children, requireAdmin, requireTrainer, fallbackPath }: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const perms = usePermissions();

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

  if (requireAdmin && !perms.isAdmin) {
    const role = perms.role || "player";
    return <Navigate to={fallbackPath || `/dashboard/${role}`} replace />;
  }

  if (requireTrainer && !perms.isTrainer) {
    const role = perms.role || "player";
    return <Navigate to={fallbackPath || `/dashboard/${role}`} replace />;
  }

  return <>{children}</>;
}

export default RequireRole;
