import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useActiveClub } from "@/hooks/use-active-club";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import {
  buildDashboardNavItems,
  type DashboardNavItem,
  type DashboardNavLabels,
} from "@/lib/dashboard-nav";
import {
  formatDashboardRoleLabel,
  getMobileNavModules,
  getSidebarMenuItems,
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";

import { useActiveDashboardPersonaSlug } from "@/hooks/use-active-dashboard-persona-slug";
import {
  ACTIVE_DASHBOARD_PERSONA_KEY,
  publishDashboardPersonaChange,
} from "@/lib/switch-dashboard-persona";

export interface UseDashboardNavResult {
  /** Normalized role driving menu contents */
  menuRole: DashboardRole | null;
  /** Raw slug for `/dashboard/:role` links */
  personaSlug: string;
  roleLabel: string;
  sidebarItems: DashboardNavItem[];
  mobileItems: DashboardNavItem[];
}

export function useDashboardNav(labels: DashboardNavLabels): UseDashboardNavResult {
  const { role: urlRole } = useParams();
  const menuRole = useModuleGateRole();
  const storedSlug = useActiveDashboardPersonaSlug();

  useEffect(() => {
    if (!urlRole) return;
    const normalized = normalizeDashboardRole(urlRole);
    if (!normalized) return;
    localStorage.setItem(ACTIVE_DASHBOARD_PERSONA_KEY, normalized);
    localStorage.removeItem("one4team_role");
    publishDashboardPersonaChange(normalized);
  }, [urlRole]);

  const personaFromUrl = urlRole ? normalizeDashboardRole(urlRole) : null;
  const personaSlug = personaFromUrl ?? storedSlug ?? menuRole ?? "member";

  const sidebarModules = useMemo(
    () => getSidebarMenuItems(menuRole),
    [menuRole],
  );

  const mobileModules = useMemo(
    () => getMobileNavModules(menuRole),
    [menuRole],
  );

  const sidebarItems = useMemo(
    () => buildDashboardNavItems(sidebarModules, labels, personaSlug, menuRole),
    [sidebarModules, labels, personaSlug, menuRole],
  );

  const mobileItems = useMemo(
    () => buildDashboardNavItems(mobileModules, labels, personaSlug, menuRole),
    [mobileModules, labels, personaSlug, menuRole],
  );

  const roleLabel = formatDashboardRoleLabel(storedSlug ?? menuRole);

  return {
    menuRole,
    personaSlug,
    roleLabel,
    sidebarItems,
    mobileItems,
  };
}
