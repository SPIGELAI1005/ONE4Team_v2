/**
 * ONE4Team - central dashboard RBAC configuration.
 *
 * **Single source of truth** for private-dashboard module access (menu, routes, data scope).
 *
 * Public club content (`/club/:slug/*`) is intentionally **out of scope** here.
 * A user may view public matches, events, or the club page without gaining dashboard
 * access to the corresponding internal modules.
 *
 * Legacy API permission strings (`members:read`, …) are derived from this matrix in
 * `permissions.ts` - do not define independent role matrices in pages or components.
 */

import type { ClubRoleAssignmentRow, ClubRoleKind } from "@/lib/club-role-assignments";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Normalized dashboard role identifiers (product language, snake_case). */
export type DashboardRole =
  | "admin"
  | "club_admin"
  | "trainer"
  | "team_staff"
  | "player"
  | "parent_supporter"
  | "member"
  | "sponsor"
  | "supplier"
  | "service_provider"
  | "consultant";

export const DASHBOARD_ROLES: readonly DashboardRole[] = [
  "admin",
  "club_admin",
  "trainer",
  "team_staff",
  "player",
  "parent_supporter",
  "member",
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
] as const;

/** Internal club operations roles (players, staff, admins). */
export const INTERNAL_CLUB_ROLES: readonly DashboardRole[] = [
  "admin",
  "club_admin",
  "trainer",
  "team_staff",
  "player",
  "parent_supporter",
  "member",
] as const;

/** External partner / vendor roles. */
export const EXTERNAL_ROLES: readonly DashboardRole[] = [
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
] as const;

/** Roles that participate in team sport operations (trainings, matches, rosters). */
export const SPORTS_ROLES: readonly DashboardRole[] = [
  "admin",
  "club_admin",
  "trainer",
  "team_staff",
  "player",
  "parent_supporter",
] as const;

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

/** Dashboard modules/pages - maps to sidebar items and route guards. */
export type DashboardModule =
  | "dashboard"
  | "assets"
  | "members"
  | "invites"
  | "roles"
  | "trainings"
  | "matches"
  | "events"
  | "reports"
  | "payments"
  | "messages"
  | "tasks"
  | "marketplace"
  | "partners"
  | "ai4t"
  | "club_page"
  | "supplier_page"
  | "club_shop"
  | "settings"
  | "support";

export const DASHBOARD_MODULES: readonly DashboardModule[] = [
  "dashboard",
  "assets",
  "members",
  "invites",
  "roles",
  "trainings",
  "matches",
  "events",
  "reports",
  "payments",
  "messages",
  "tasks",
  "marketplace",
  "partners",
  "ai4t",
  "club_page",
  "club_shop",
  "settings",
  "support",
] as const;

/**
 * Default sidebar order for roles with broad access.
 * @deprecated Prefer {@link getSidebarMenuItems} - role-specific profiles with RBAC gate.
 */
export const MENU_MODULE_ORDER: readonly DashboardModule[] = [
  "dashboard",
  "assets",
  "members",
  "trainings",
  "matches",
  "events",
  "reports",
  "payments",
  "messages",
  "tasks",
  "marketplace",
  "partners",
  "ai4t",
  "club_page",
  "club_shop",
  "settings",
  "support",
] as const;

/** Full admin / club-admin sidebar (all primary modules). */
const FULL_SIDEBAR_MENU: readonly DashboardModule[] = [
  "dashboard",
  "assets",
  "members",
  "trainings",
  "matches",
  "events",
  "reports",
  "payments",
  "messages",
  "tasks",
  "marketplace",
  "partners",
  "ai4t",
  "club_page",
  "club_shop",
  "settings",
  "support",
] as const;

/**
 * Role-specific sidebar order and composition.
 * Each list is filtered by {@link canAccessModule} before rendering.
 */
export const SIDEBAR_MENU_PROFILES: Record<DashboardRole, readonly DashboardModule[]> = {
  admin: FULL_SIDEBAR_MENU,
  club_admin: FULL_SIDEBAR_MENU,
  trainer: [
    "dashboard",
    "members",
    "trainings",
    "matches",
    "events",
    "reports",
    "messages",
    "tasks",
    "assets",
    "ai4t",
    "club_shop",
    "settings",
    "support",
  ],
  team_staff: [
    "dashboard",
    "members",
    "trainings",
    "matches",
    "events",
    "messages",
    "tasks",
    "assets",
    "ai4t",
    "club_shop",
    "settings",
    "support",
  ],
  player: [
    "dashboard",
    "trainings",
    "matches",
    "events",
    "messages",
    "tasks",
    "assets",
    "club_shop",
    "settings",
    "support",
  ],
  parent_supporter: [
    "dashboard",
    "trainings",
    "matches",
    "events",
    "messages",
    "tasks",
    "payments",
    "assets",
    "club_shop",
    "settings",
    "support",
  ],
  member: [
    "dashboard",
    "events",
    "messages",
    "tasks",
    "assets",
    "club_shop",
    "settings",
    "support",
  ],
  sponsor: [
    "dashboard",
    "marketplace",
    "messages",
    "tasks",
    "reports",
    "ai4t",
    "supplier_page",
    "settings",
    "support",
  ],
  supplier: [
    "dashboard",
    "marketplace",
    "messages",
    "tasks",
    "reports",
    "ai4t",
    "supplier_page",
    "settings",
    "support",
  ],
  service_provider: [
    "dashboard",
    "marketplace",
    "messages",
    "tasks",
    "reports",
    "ai4t",
    "supplier_page",
    "settings",
    "support",
  ],
  consultant: [
    "dashboard",
    "marketplace",
    "messages",
    "tasks",
    "reports",
    "ai4t",
    "supplier_page",
    "settings",
    "support",
  ],
};

/** Safe minimal sidebar when role cannot be resolved. */
export const UNKNOWN_SIDEBAR_MENU: readonly DashboardModule[] = [
  "dashboard",
  "messages",
  "settings",
  "support",
] as const;

/** Mobile bottom bar picks up to this many modules from the sidebar profile. */
const MOBILE_NAV_PRIORITY: readonly DashboardModule[] = [
  "dashboard",
  "matches",
  "events",
  "trainings",
  "messages",
  "tasks",
  "marketplace",
  "partners",
  "payments",
  "club_shop",
  "reports",
] as const;

export const MOBILE_NAV_MAX_ITEMS = 5;
export const MODULE_ROUTES: Record<DashboardModule, string> = {
  dashboard: "/dashboard",
  assets: "/asset-layers",
  members: "/members",
  invites: "/members",
  roles: "/members",
  trainings: "/teams",
  matches: "/matches",
  events: "/events",
  reports: "/reports",
  payments: "/payments",
  messages: "/communication",
  tasks: "/tasks",
  marketplace: "/marketplace",
  partners: "/partners",
  ai4t: "/co-trainer",
  club_page: "/club-page-admin",
  supplier_page: "/supplier-page",
  club_shop: "/shop",
  settings: "/settings",
  support: "/support",
};

// ---------------------------------------------------------------------------
// Access levels
// ---------------------------------------------------------------------------

/**
 * Module access level - used for menu visibility, route gates, and data scoping hints.
 *
 * - `none` - hidden; route blocked
 * - `read` - view-only club or public-preview content
 * - `limited` - restricted subset (e.g. anonymized roster, sponsor exposure stats)
 * - `own` - user's own records (profile, tasks, invoices)
 * - `team` - scoped to assigned team(s)
 * - `assigned` - explicitly assigned items only
 * - `full` - club-wide manage access for the module
 */
export type ModuleAccessLevel =
  | "none"
  | "read"
  | "limited"
  | "own"
  | "team"
  | "assigned"
  | "full";

/** Query / RLS scope hint derived from module access (for hooks and future server policies). */
export type DataScope =
  | "none"
  | "club"
  | "team"
  | "own"
  | "assigned"
  | "family"
  | "partner"
  | "limited";

const ACCESS_RANK: Record<ModuleAccessLevel, number> = {
  none: 0,
  read: 1,
  limited: 2,
  own: 3,
  assigned: 4,
  team: 5,
  full: 6,
};

const FULL_ACCESS = Object.fromEntries(
  DASHBOARD_MODULES.map((m) => [m, "full"]),
) as Record<DashboardModule, ModuleAccessLevel>;

/** Safe fallback when role string cannot be normalized - lowest privilege, never admin. */
const UNKNOWN_ROLE_ACCESS: Record<DashboardModule, ModuleAccessLevel> = {
  dashboard: "own",
  assets: "none",
  members: "none",
  invites: "none",
  roles: "none",
  trainings: "none",
  matches: "none",
  events: "none",
  reports: "none",
  payments: "none",
  messages: "read",
  tasks: "none",
  marketplace: "none",
  partners: "none",
  ai4t: "none",
  club_page: "none",
  supplier_page: "none",
  club_shop: "none",
  settings: "own",
  support: "read",
};

// ---------------------------------------------------------------------------
// Role × module matrix (product baseline)
// ---------------------------------------------------------------------------

const RBAC_MATRIX: Record<DashboardRole, Record<DashboardModule, ModuleAccessLevel>> = {
  admin: { ...FULL_ACCESS, supplier_page: "none" },

  club_admin: { ...FULL_ACCESS, supplier_page: "none" },

  trainer: {
    dashboard: "team",
    assets: "team",
    members: "team",
    invites: "team",
    roles: "none",
    trainings: "team",
    matches: "team",
    events: "team",
    reports: "team",
    payments: "none",
    messages: "team",
    tasks: "team",
    marketplace: "none",
    partners: "none",
    ai4t: "team",
    club_page: "none",
    supplier_page: "none",
    club_shop: "read",
    settings: "limited",
    support: "read",
  },

  team_staff: {
    dashboard: "team",
    assets: "team",
    members: "limited",
    invites: "none",
    roles: "none",
    trainings: "assigned",
    matches: "assigned",
    events: "assigned",
    reports: "none",
    payments: "none",
    messages: "team",
    tasks: "assigned",
    marketplace: "none",
    partners: "none",
    ai4t: "limited",
    club_page: "none",
    supplier_page: "none",
    club_shop: "read",
    settings: "own",
    support: "read",
  },

  player: {
    dashboard: "own",
    assets: "read",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "team",
    matches: "team",
    events: "read",
    reports: "none",
    payments: "none",
    messages: "team",
    tasks: "own",
    marketplace: "none",
    partners: "none",
    ai4t: "none",
    club_page: "none",
    supplier_page: "none",
    club_shop: "read",
    settings: "own",
    support: "read",
  },

  parent_supporter: {
    dashboard: "own",
    assets: "limited",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "team",
    matches: "team",
    events: "team",
    reports: "none",
    payments: "own",
    messages: "team",
    tasks: "own",
    marketplace: "none",
    partners: "none",
    ai4t: "none",
    club_page: "none",
    supplier_page: "none",
    club_shop: "read",
    settings: "own",
    support: "read",
  },

  member: {
    dashboard: "own",
    assets: "read",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "none",
    matches: "none",
    events: "read",
    reports: "none",
    payments: "none",
    messages: "read",
    tasks: "own",
    marketplace: "none",
    partners: "none",
    ai4t: "none",
    club_page: "none",
    supplier_page: "none",
    club_shop: "read",
    settings: "own",
    support: "read",
  },

  sponsor: {
    dashboard: "own",
    assets: "own",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "none",
    matches: "none",
    events: "none",
    reports: "limited",
    payments: "own",
    messages: "own",
    tasks: "own",
    marketplace: "own",
    partners: "none",
    ai4t: "limited",
    club_page: "read",
    supplier_page: "own",
    club_shop: "none",
    settings: "own",
    support: "read",
  },

  supplier: {
    dashboard: "own",
    assets: "none",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "none",
    matches: "none",
    events: "none",
    reports: "limited",
    payments: "none",
    messages: "own",
    tasks: "assigned",
    marketplace: "own",
    partners: "none",
    ai4t: "limited",
    club_page: "none",
    supplier_page: "own",
    club_shop: "none",
    settings: "own",
    support: "read",
  },

  service_provider: {
    dashboard: "own",
    assets: "none",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "none",
    matches: "none",
    events: "none",
    reports: "limited",
    payments: "none",
    messages: "own",
    tasks: "assigned",
    marketplace: "own",
    partners: "none",
    ai4t: "limited",
    club_page: "none",
    supplier_page: "own",
    club_shop: "none",
    settings: "own",
    support: "read",
  },

  consultant: {
    dashboard: "own",
    assets: "none",
    members: "none",
    invites: "none",
    roles: "none",
    trainings: "none",
    matches: "none",
    events: "none",
    reports: "limited",
    payments: "none",
    messages: "own",
    tasks: "assigned",
    marketplace: "own",
    partners: "none",
    ai4t: "limited",
    club_page: "none",
    supplier_page: "own",
    club_shop: "none",
    settings: "own",
    support: "read",
  },
};

// ---------------------------------------------------------------------------
// Role normalization
// ---------------------------------------------------------------------------

/** Maps legacy DB values, UI labels, and assignment kinds → normalized dashboard role. */
const ROLE_ALIASES: Record<string, DashboardRole> = {
  admin: "club_admin",
  club_admin: "club_admin",
  "club admin": "club_admin",
  trainer: "trainer",
  staff: "team_staff",
  team_staff: "team_staff",
  "team staff": "team_staff",
  player: "player",
  player_teen: "player",
  player_adult: "player",
  parent: "parent_supporter",
  parent_supporter: "parent_supporter",
  "parent / supporter": "parent_supporter",
  "parent/supporter": "parent_supporter",
  supporter: "parent_supporter",
  member: "member",
  sponsor: "sponsor",
  supplier: "supplier",
  service_provider: "service_provider",
  service: "service_provider",
  "service provider": "service_provider",
  consultant: "consultant",
  team_admin: "trainer",
};

const KIND_TO_DASHBOARD: Record<ClubRoleKind, DashboardRole> = {
  club_admin: "club_admin",
  team_admin: "trainer",
  trainer: "trainer",
  player: "player",
  player_teen: "player",
  player_adult: "player",
  parent: "parent_supporter",
  staff: "team_staff",
  member: "member",
  sponsor: "sponsor",
  supplier: "supplier",
  service_provider: "service_provider",
  consultant: "consultant",
};

/** Role precedence when merging legacy membership + assignments (higher index = higher privilege). */
const ROLE_PRECEDENCE: DashboardRole[] = [
  "member",
  "consultant",
  "supplier",
  "service_provider",
  "sponsor",
  "parent_supporter",
  "player",
  "team_staff",
  "trainer",
  "club_admin",
  "admin",
];

function rolePrecedenceIndex(role: DashboardRole): number {
  const idx = ROLE_PRECEDENCE.indexOf(role);
  return idx === -1 ? 0 : idx;
}

function pickHigherRole(a: DashboardRole, b: DashboardRole): DashboardRole {
  return rolePrecedenceIndex(a) >= rolePrecedenceIndex(b) ? a : b;
}

/**
 * Normalize any role string (DB `app_role`, UI label, localStorage persona) to a dashboard role.
 * Returns `null` when unrecognized - callers must use {@link UNKNOWN_ROLE_ACCESS}, not admin.
 */
export function normalizeDashboardRole(
  raw: string | null | undefined,
): DashboardRole | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const underscored = key.replace(/ /g, "_");
  return ROLE_ALIASES[key] ?? ROLE_ALIASES[underscored] ?? null;
}

/** @deprecated Use {@link normalizeDashboardRole}. Kept for gradual migration. */
export const normalizeRole = normalizeDashboardRole;

/**
 * Resolve the effective dashboard role from legacy membership + optional scoped assignments.
 * Platform-admin context is out of scope - legacy `admin` maps to `club_admin`.
 */
export function resolveDashboardRole(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
): DashboardRole | null {
  let resolved: DashboardRole | null = normalizeDashboardRole(legacyRole);

  if (assignments?.length) {
    for (const row of assignments) {
      const fromKind = KIND_TO_DASHBOARD[row.role_kind];
      if (!fromKind) continue;
      resolved = resolved ? pickHigherRole(resolved, fromKind) : fromKind;
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

function accessRowForRole(role: DashboardRole | null): Record<DashboardModule, ModuleAccessLevel> {
  if (!role) return UNKNOWN_ROLE_ACCESS;
  return RBAC_MATRIX[role] ?? UNKNOWN_ROLE_ACCESS;
}

export function getModuleAccess(
  role: DashboardRole | string | null | undefined,
  module: DashboardModule,
): ModuleAccessLevel {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  return accessRowForRole(normalized)[module];
}

export function canAccessModule(
  role: DashboardRole | string | null | undefined,
  module: DashboardModule,
): boolean {
  return getModuleAccess(role, module) !== "none";
}

export function isAccessAtLeast(
  level: ModuleAccessLevel,
  minimum: ModuleAccessLevel,
): boolean {
  return ACCESS_RANK[level] >= ACCESS_RANK[minimum];
}

export function canWriteModule(
  role: DashboardRole | string | null | undefined,
  module: DashboardModule,
): boolean {
  const level = getModuleAccess(role, module);
  return level === "full" || level === "team";
}

/** Modules with any RBAC access (legacy helper - prefer {@link getSidebarMenuItems}). */
export function getVisibleMenuItems(
  role: DashboardRole | string | null | undefined,
): DashboardModule[] {
  return getSidebarMenuItems(role);
}

/**
 * Sidebar modules for a role: profile order ∩ RBAC `canAccessModule`.
 * Unknown roles receive {@link UNKNOWN_SIDEBAR_MENU} only.
 */
export function getSidebarMenuItems(
  role: DashboardRole | string | null | undefined,
): DashboardModule[] {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  const profile = normalized
    ? SIDEBAR_MENU_PROFILES[normalized] ?? UNKNOWN_SIDEBAR_MENU
    : UNKNOWN_SIDEBAR_MENU;
  return profile.filter((module) => canAccessModule(normalized, module));
}

/** Compact mobile nav subset (max {@link MOBILE_NAV_MAX_ITEMS}) from the sidebar profile. */
export function getMobileNavModules(
  role: DashboardRole | string | null | undefined,
): DashboardModule[] {
  const sidebar = getSidebarMenuItems(role);
  const picked = MOBILE_NAV_PRIORITY.filter((module) => sidebar.includes(module));
  const merged = [...picked];
  for (const module of sidebar) {
    if (merged.length >= MOBILE_NAV_MAX_ITEMS) break;
    if (module === "settings" || module === "support") continue;
    if (!merged.includes(module)) merged.push(module);
  }
  return merged.slice(0, MOBILE_NAV_MAX_ITEMS);
}

/**
 * Resolve which role drives the sidebar menu: URL/localStorage persona when allowed,
 * otherwise the authorized membership role.
 */
export function resolveSidebarMenuRole(
  personaRaw: string | null | undefined,
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
  options?: { treatAsClubAdmin?: boolean },
): DashboardRole | null {
  const persona = normalizeDashboardRole(personaRaw);
  const effective = getEffectiveDashboardPersonas(legacyRole, assignments, options);

  if (persona && effective.includes(persona)) return persona;

  const authorized = resolveDashboardRole(legacyRole, assignments);
  if (options?.treatAsClubAdmin) {
    return authorized && rolePrecedenceIndex(authorized) >= rolePrecedenceIndex("club_admin")
      ? authorized
      : "club_admin";
  }

  return authorized ?? persona;
}

/** Human-readable label for the role badge in the sidebar. */
export function formatDashboardRoleLabel(role: DashboardRole | string | null | undefined): string {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return "Member";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Map module access level → recommended data query scope. */
export function getDataScopeForModule(
  role: DashboardRole | string | null | undefined,
  module: DashboardModule,
): DataScope {
  const level = getModuleAccess(role, module);
  switch (level) {
    case "none":
      return "none";
    case "full":
    case "read":
      return "club";
    case "team":
      return "team";
    case "own":
      return module === "payments" && normalizeDashboardRole(String(role)) === "parent_supporter"
        ? "family"
        : "own";
    case "assigned":
      return "assigned";
    case "limited": {
      const normalized =
        typeof role === "string" ? normalizeDashboardRole(role) : role;
      if (normalized && (EXTERNAL_ROLES as readonly string[]).includes(normalized)) {
        return "partner";
      }
      return "limited";
    }
    default:
      return "none";
  }
}

export function isExternalRole(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  return normalized != null && (EXTERNAL_ROLES as readonly string[]).includes(normalized);
}

export function isInternalClubRole(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  return normalized != null && (INTERNAL_CLUB_ROLES as readonly string[]).includes(normalized);
}

export function isSportsRole(role: DashboardRole | string | null | undefined): boolean {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  return normalized != null && (SPORTS_ROLES as readonly string[]).includes(normalized);
}

/** Route path for a module if the role may access it; otherwise `null`. */
export function getModuleRoute(
  role: DashboardRole | string | null | undefined,
  module: DashboardModule,
): string | null {
  if (!canAccessModule(role, module)) return null;
  return MODULE_ROUTES[module];
}

/** Dashboard persona roles a user may switch to (UI preview) - subset of internal roles. */
export function getDashboardPersonaOptions(
  role: DashboardRole | string | null | undefined,
): DashboardRole[] {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  if (!normalized) return ["member"];
  switch (normalized) {
    case "admin":
    case "club_admin":
      return ["club_admin", "trainer", "player"];
    case "trainer":
      return ["trainer", "player"];
    case "player":
    case "team_staff":
      return ["player"];
    default:
      return [normalized];
  }
}

/**
 * All dashboard personas the user may open - union of legacy role, assignments,
 * preview options, and optional club-admin elevation (RPC / general admin).
 */
export function getEffectiveDashboardPersonas(
  legacyRole: string | null | undefined,
  assignments?: ClubRoleAssignmentRow[] | null,
  options?: { treatAsClubAdmin?: boolean },
): DashboardRole[] {
  const set = new Set<DashboardRole>();

  const addRole = (role: DashboardRole | null) => {
    if (!role) return;
    set.add(role);
    for (const preview of getDashboardPersonaOptions(role)) {
      set.add(preview);
    }
  };

  addRole(normalizeDashboardRole(legacyRole));
  addRole(resolveDashboardRole(legacyRole, assignments));

  for (const row of assignments ?? []) {
    addRole(KIND_TO_DASHBOARD[row.role_kind] ?? normalizeDashboardRole(row.role_kind));
  }

  if (options?.treatAsClubAdmin) {
    addRole("club_admin");
  }

  return Array.from(set);
}

/** Full matrix export for tests and admin tooling. */
export function getRbacMatrix(): Readonly<Record<DashboardRole, Readonly<Record<DashboardModule, ModuleAccessLevel>>>> {
  return RBAC_MATRIX;
}
