import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { ModuleOverride } from "@/lib/effective-plan";

/**
 * Load Operator module entitlement overrides for the current user's club.
 * Used by runtime PlanGate / effective-plan resolver.
 */
export async function fetchMyClubModuleOverrides(clubId: string): Promise<ModuleOverride[]> {
  const { data, error } = await supabaseDynamic.rpc("get_my_club_module_overrides", {
    _club_id: clubId,
  });
  if (error || !Array.isArray(data)) return [];
  return data.map((row: { module_key?: string; enabled?: boolean }) => ({
    moduleKey: String(row.module_key ?? ""),
    enabled: row.enabled !== false,
  })).filter((row) => row.moduleKey.length > 0);
}

/** Treat broad enabled overrides as operator full-access when AI + chat + shop are forced on. */
export function inferOperatorFullAccess(overrides: ModuleOverride[]): boolean {
  if (overrides.length === 0) return false;
  const enabled = new Set(overrides.filter((o) => o.enabled).map((o) => o.moduleKey));
  const critical = ["ai", "communication", "shop", "marketplace", "analytics"];
  return critical.every((key) => enabled.has(key)) && overrides.length >= 8;
}
