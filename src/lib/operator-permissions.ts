// Platform roles are independent from club dashboard roles. Club Admin,
// Trainer, Player, Parent, and Partner roles must never grant /operator access.
export type OperatorRole = "OWNER" | "OPERATOR" | "SUPPORT" | "VIEWER";

export type OperatorPermission =
  | "operator.overview.read"
  | "operator.clubs.read"
  | "operator.clubs.manage"
  | "operator.modules.read"
  | "operator.modules.manage"
  | "operator.plans.read"
  | "operator.plans.manage"
  | "operator.users.read"
  | "operator.users.manage"
  | "operator.analytics.read"
  | "operator.support.use"
  | "operator.audit.read"
  | "operator.logs.read"
  | "operator.settings.read"
  | "operator.access.manage";

export interface OperatorAccess {
  isOperator: boolean;
  role: OperatorRole | null;
  permissions: OperatorPermission[];
  email: string | null;
  displayName: string | null;
  status: "ACTIVE" | "DISABLED" | null;
}

export const OPERATOR_PERMISSIONS: readonly OperatorPermission[] = [
  "operator.overview.read",
  "operator.clubs.read",
  "operator.clubs.manage",
  "operator.modules.read",
  "operator.modules.manage",
  "operator.plans.read",
  "operator.plans.manage",
  "operator.users.read",
  "operator.users.manage",
  "operator.analytics.read",
  "operator.support.use",
  "operator.audit.read",
  "operator.logs.read",
  "operator.settings.read",
  "operator.access.manage",
] as const;

export const OPERATOR_ROLE_PERMISSIONS: Record<OperatorRole, readonly OperatorPermission[]> = {
  OWNER: OPERATOR_PERMISSIONS,
  OPERATOR: [
    "operator.overview.read",
    "operator.clubs.read",
    "operator.clubs.manage",
    "operator.modules.read",
    "operator.modules.manage",
    "operator.plans.read",
    "operator.plans.manage",
    "operator.users.read",
    "operator.users.manage",
    "operator.analytics.read",
    "operator.support.use",
    "operator.audit.read",
    "operator.logs.read",
    "operator.settings.read",
  ],
  SUPPORT: [
    "operator.overview.read",
    "operator.clubs.read",
    "operator.modules.read",
    "operator.plans.read",
    "operator.users.read",
    "operator.support.use",
    "operator.audit.read",
    "operator.logs.read",
    "operator.settings.read",
  ],
  VIEWER: [
    "operator.overview.read",
    "operator.clubs.read",
    "operator.modules.read",
    "operator.plans.read",
    "operator.users.read",
    "operator.analytics.read",
    "operator.audit.read",
    "operator.logs.read",
    "operator.settings.read",
  ],
};

const OPERATOR_ROLE_SET = new Set<OperatorRole>([
  "OWNER",
  "OPERATOR",
  "SUPPORT",
  "VIEWER",
]);

const OPERATOR_PERMISSION_SET = new Set<OperatorPermission>(OPERATOR_PERMISSIONS);

export function normalizeOperatorRole(value: unknown): OperatorRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  return OPERATOR_ROLE_SET.has(normalized as OperatorRole) ? (normalized as OperatorRole) : null;
}

export function normalizeOperatorPermissions(values: unknown): OperatorPermission[] {
  if (!Array.isArray(values)) return [];
  const permissions = new Set<OperatorPermission>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (OPERATOR_PERMISSION_SET.has(value as OperatorPermission)) permissions.add(value as OperatorPermission);
  }
  return Array.from(permissions);
}

export function getDefaultOperatorPermissions(role: OperatorRole | null): OperatorPermission[] {
  if (!role) return [];
  return [...OPERATOR_ROLE_PERMISSIONS[role]];
}

export function hasOperatorPermission(
  access: Pick<OperatorAccess, "isOperator" | "permissions"> | null | undefined,
  permission: OperatorPermission,
): boolean {
  return Boolean(access?.isOperator && access.permissions.includes(permission));
}

export function canManagePlatform(access: Pick<OperatorAccess, "isOperator" | "permissions"> | null | undefined): boolean {
  return hasOperatorPermission(access, "operator.access.manage");
}

export function canViewPlatform(access: Pick<OperatorAccess, "isOperator" | "permissions"> | null | undefined): boolean {
  return hasOperatorPermission(access, "operator.overview.read");
}

export function buildOperatorAccess(input: unknown): OperatorAccess {
  if (typeof input === "boolean") {
    return {
      isOperator: input,
      role: input ? "OWNER" : null,
      permissions: input ? getDefaultOperatorPermissions("OWNER") : [],
      email: null,
      displayName: null,
      status: input ? "ACTIVE" : null,
    };
  }

  if (!input || typeof input !== "object") {
    return { isOperator: false, role: null, permissions: [], email: null, displayName: null, status: null };
  }

  const record = input as Record<string, unknown>;
  const status = record.status === "ACTIVE" || record.status === "DISABLED" ? record.status : null;
  const role = normalizeOperatorRole(record.role);
  const explicitPermissions = normalizeOperatorPermissions(record.permissions);
  const permissions = explicitPermissions.length > 0 ? explicitPermissions : getDefaultOperatorPermissions(role);
  const isOperator = Boolean(record.is_platform_user ?? record.is_operator) && status === "ACTIVE" && role !== null;

  return {
    isOperator,
    role,
    permissions: isOperator ? permissions : [],
    email: typeof record.email === "string" ? record.email : null,
    displayName: typeof record.display_name === "string" ? record.display_name : null,
    status,
  };
}

export const getCurrentPlatformUser = buildOperatorAccess;

export function requirePlatformAccess(access: OperatorAccess): OperatorAccess {
  if (!access.isOperator) throw new Error("Platform access required.");
  return access;
}

export function requirePlatformPermission(
  access: OperatorAccess,
  permission: OperatorPermission,
): OperatorAccess {
  requirePlatformAccess(access);
  if (!hasOperatorPermission(access, permission)) throw new Error("Platform permission required.");
  return access;
}
