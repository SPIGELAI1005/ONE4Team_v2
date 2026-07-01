/**
 * Dashboard navigation — maps RBAC modules to sidebar/mobile nav items.
 * Visual metadata only; access is driven by `rbac-config.ts`.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  CreditCard,
  MessageSquare,
  Briefcase,
  Store,
  ShoppingBag,
  Globe,
  Bot,
  Settings,
  CalendarDays,
  BarChart3,
  Layers3,
  HelpCircle,
  ClipboardList,
  Truck,
} from "lucide-react";
import {
  MODULE_ROUTES,
  type DashboardModule,
  type DashboardRole,
} from "@/lib/rbac-config";
import { resolveModuleRoute } from "@/lib/partner-portal-routes";

export interface DashboardNavLabels {
  dashboard: string;
  assetLayers: string;
  members: string;
  training: string;
  matches: string;
  events: string;
  playerStats: string;
  payments: string;
  messages: string;
  tasks: string;
  marketplace: string;
  partners: string;
  ai4Team: string;
  clubPage: string;
  supplierPage: string;
  shop: string;
  settings: string;
  supportFaq: string;
  home: string;
}

export interface DashboardNavItem {
  module: DashboardModule;
  /** Stable id for active-state matching */
  id: string;
  icon: LucideIcon;
  label: string;
  route: string;
}

/** Nav item id per module (matches legacy sidebar `pathToId` values). */
export const MODULE_NAV_IDS: Record<DashboardModule, string> = {
  dashboard: "overview",
  assets: "asset-layers",
  members: "members",
  invites: "members",
  roles: "members",
  trainings: "training",
  matches: "matches",
  events: "events",
  reports: "stats",
  payments: "payments",
  messages: "messages",
  tasks: "tasks",
  marketplace: "marketplace",
  partners: "partners",
  ai4t: "ai",
  club_page: "clubpage",
  supplier_page: "supplierpage",
  club_shop: "shop",
  settings: "settings",
  support: "support",
};

const MODULE_ICONS: Record<DashboardModule, LucideIcon> = {
  dashboard: LayoutDashboard,
  assets: Layers3,
  members: Users,
  invites: Users,
  roles: Users,
  trainings: Calendar,
  matches: Trophy,
  events: CalendarDays,
  reports: BarChart3,
  payments: CreditCard,
  messages: MessageSquare,
  tasks: ClipboardList,
  marketplace: Store,
  partners: Briefcase,
  ai4t: Bot,
  club_page: Globe,
  supplier_page: Truck,
  club_shop: ShoppingBag,
  settings: Settings,
  support: HelpCircle,
};

function labelForModule(module: DashboardModule, labels: DashboardNavLabels): string {
  switch (module) {
    case "dashboard":
      return labels.dashboard;
    case "assets":
      return labels.assetLayers;
    case "members":
    case "invites":
    case "roles":
      return labels.members;
    case "trainings":
      return labels.training;
    case "matches":
      return labels.matches;
    case "events":
      return labels.events;
    case "reports":
      return labels.playerStats;
    case "payments":
      return labels.payments;
    case "messages":
      return labels.messages;
    case "tasks":
      return labels.tasks;
    case "marketplace":
      return labels.marketplace;
    case "partners":
      return labels.partners;
    case "ai4t":
      return labels.ai4Team;
    case "club_page":
      return labels.clubPage;
    case "supplier_page":
      return labels.supplierPage;
    case "club_shop":
      return labels.shop;
    case "settings":
      return labels.settings;
    case "support":
      return labels.supportFaq;
    default:
      return labels.dashboard;
  }
}

function routeForModule(
  module: DashboardModule,
  dashboardPersonaSlug: string,
  gateRole: DashboardRole | null,
): string {
  return resolveModuleRoute(module, gateRole, dashboardPersonaSlug);
}

/** Build nav items from RBAC module list (already filtered for the role). */
export function buildDashboardNavItems(
  modules: DashboardModule[],
  labels: DashboardNavLabels,
  dashboardPersonaSlug: string,
  gateRole: DashboardRole | null = null,
): DashboardNavItem[] {
  return modules.map((module) => ({
    module,
    id: MODULE_NAV_IDS[module],
    icon: MODULE_ICONS[module],
    label: labelForModule(module, labels),
    route: routeForModule(module, dashboardPersonaSlug, gateRole),
  }));
}

/** Map current pathname → nav item id for active highlighting. */
export function pathnameToNavId(pathname: string): string {
  const pathToId: Record<string, string> = {
    "/members": "members",
    "/teams": "training",
    "/asset-layers": "asset-layers",
    "/property-layers": "asset-layers",
    "/matches": "matches",
    "/events": "events",
    "/reports": "stats",
    "/player-stats": "stats",
    "/payments": "payments",
    "/communication": "messages",
    "/partner-messages": "messages",
    "/tasks": "tasks",
    "/partner-tasks": "tasks",
    "/marketplace": "marketplace",
    "/partner-marketplace": "marketplace",
    "/partnermarketplace": "marketplace",
    "/partners": "partners",
    "/reports": "stats",
    "/partner-reports": "stats",
    "/player-stats": "stats",
    "/co-trainer": "ai",
    "/partner-ai": "ai",
    "/ai": "ai",
    "/activities": "schedule",
    "/live-scores": "live",
    "/dues": "dues",
    "/shop": "shop",
    "/club-page-admin": "clubpage",
    "/supplier-page": "supplierpage",
    "/settings": "settings",
    "/support": "support",
  };

  if (pathToId[pathname]) return pathToId[pathname];
  if (pathname.startsWith("/dashboard")) return "overview";
  return "overview";
}

/** Persona slug stored in URL/localStorage (may differ from normalized DashboardRole). */
export function dashboardPersonaSlug(
  personaRaw: string | null | undefined,
  menuRole: string | null | undefined,
): string {
  const raw = personaRaw?.trim() || menuRole || "member";
  return raw;
}
