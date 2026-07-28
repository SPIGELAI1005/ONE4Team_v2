import { normalizeDashboardRole } from "@/lib/rbac-config";

/** Roles that may view/claim own + linked ward dues. */
export function isFamilyDuesRole(role: string | null | undefined): boolean {
  const normalized = normalizeDashboardRole(role);
  if (normalized === "parent_supporter") return true;
  const raw = (role || "").trim().toLowerCase();
  return raw === "parent" || raw === "parent_supporter";
}

/** Signed-in personas that should land on the public club site, not ops dashboard. */
export function isPublicClubFirstRole(role: string | null | undefined): boolean {
  const normalized = normalizeDashboardRole(role);
  return normalized === "fan" || normalized === "supporter";
}
