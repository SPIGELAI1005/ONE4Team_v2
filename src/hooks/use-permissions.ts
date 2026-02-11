import { useMemo } from "react";
import { useActiveClub } from "@/hooks/use-active-club";
import { hasPermission, permissionsForRole, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { activeClub } = useActiveClub();
  const role = activeClub?.role ?? null;

  const permissions = useMemo(() => permissionsForRole(role), [role]);

  return {
    role,
    permissions,
    has: (p: Permission) => hasPermission(role, p),
    isAdmin: role === "admin",
    isTrainer: role === "trainer" || role === "admin",
  };
}
