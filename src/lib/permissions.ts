export type AppRole =
  | "admin"
  | "trainer"
  | "player"
  | "staff"
  | "member"
  | "parent"
  | "sponsor"
  | "supplier"
  | "service_provider"
  | "consultant";

export type Permission =
  | "members:read"
  | "members:write"
  | "schedule:read"
  | "schedule:write"
  | "matches:read"
  | "matches:write"
  | "payments:read"
  | "payments:write"
  | "partners:read"
  | "partners:write"
  | "settings:write";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    "members:read",
    "members:write",
    "schedule:read",
    "schedule:write",
    "matches:read",
    "matches:write",
    "payments:read",
    "payments:write",
    "partners:read",
    "partners:write",
    "settings:write",
  ],
  trainer: [
    "members:read",
    "schedule:read",
    "schedule:write",
    "matches:read",
    "matches:write",
  ],
  staff: ["members:read", "schedule:read", "matches:read"],
  player: ["members:read", "schedule:read", "matches:read"],
  member: ["members:read", "schedule:read", "matches:read"],
  parent: ["schedule:read", "matches:read"],
  sponsor: ["partners:read"],
  supplier: ["partners:read"],
  service_provider: ["partners:read"],
  consultant: ["partners:read"],
};

export function permissionsForRole(role: string | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as AppRole] ?? [];
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
