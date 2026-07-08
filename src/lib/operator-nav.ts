import {
  AlertCircle,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Scale,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Translations } from "@/i18n";
import type { OperatorPermission } from "@/lib/operator-permissions";

export interface OperatorNavItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  permission: OperatorPermission;
}

type OperatorNavKey = keyof Translations["operator"]["nav"];

interface OperatorNavDef {
  id: string;
  navKey: OperatorNavKey;
  path: string;
  icon: LucideIcon;
  permission: OperatorPermission;
}

export const OPERATOR_NAV_DEFS: readonly OperatorNavDef[] = [
  { id: "overview", navKey: "overview", path: "/operator", icon: LayoutDashboard, permission: "operator.overview.read" },
  { id: "clubs", navKey: "clubs", path: "/operator/clubs", icon: Building2, permission: "operator.clubs.read" },
  { id: "users", navKey: "users", path: "/operator/users", icon: Users, permission: "operator.users.read" },
  { id: "modules", navKey: "modules", path: "/operator/modules", icon: CreditCard, permission: "operator.modules.read" },
  { id: "analytics", navKey: "analytics", path: "/operator/analytics", icon: BarChart3, permission: "operator.analytics.read" },
  { id: "financials", navKey: "financials", path: "/operator/financials", icon: LineChart, permission: "operator.analytics.read" },
  { id: "marketplace", navKey: "marketplace", path: "/operator/marketplace", icon: Store, permission: "operator.analytics.read" },
  { id: "performance", navKey: "performance", path: "/operator/performance", icon: Gauge, permission: "operator.logs.read" },
  { id: "issues", navKey: "issues", path: "/operator/issues", icon: AlertCircle, permission: "operator.logs.read" },
  { id: "audit", navKey: "audit", path: "/operator/audit", icon: ClipboardList, permission: "operator.audit.read" },
  { id: "support", navKey: "support", path: "/operator/support", icon: HelpCircle, permission: "operator.support.use" },
  { id: "legal", navKey: "legal", path: "/operator/legal", icon: Scale, permission: "operator.settings.read" },
  { id: "settings", navKey: "settings", path: "/operator/settings", icon: Settings, permission: "operator.settings.read" },
] as const;

export function getOperatorNavItems(t: Translations): OperatorNavItem[] {
  return OPERATOR_NAV_DEFS.map((def) => {
    const copy = t.operator.nav[def.navKey];
    return {
      id: def.id,
      label: copy.label,
      description: copy.description,
      path: def.path,
      icon: def.icon,
      permission: def.permission,
    };
  });
}

/** @deprecated Use getOperatorNavItems(t) for localized labels. */
export const OPERATOR_NAV_ITEMS: readonly OperatorNavItem[] = OPERATOR_NAV_DEFS.map((def) => ({
  id: def.id,
  label: def.id,
  description: "",
  path: def.path,
  icon: def.icon,
  permission: def.permission,
}));

function findNavItem(pathname: string, items: OperatorNavItem[]): OperatorNavItem | null {
  return (
    [...items]
      .sort((a, b) => b.path.length - a.path.length)
      .find((navItem) => pathname === navItem.path || pathname.startsWith(`${navItem.path}/`)) ?? null
  );
}

export function getOperatorSectionTitle(pathname: string, t: Translations): string {
  const item = findNavItem(pathname, getOperatorNavItems(t));
  return item?.label ?? t.operator.shell.defaultTitle;
}

export function isOperatorPath(pathname: string): boolean {
  return pathname === "/operator" || pathname.startsWith("/operator/");
}

export function operatorRouteTransitionKey(pathname: string): string {
  return isOperatorPath(pathname) ? "__operator_shell__" : pathname;
}

export function getOperatorNavItem(pathname: string, t: Translations): OperatorNavItem | null {
  return findNavItem(pathname, getOperatorNavItems(t));
}
