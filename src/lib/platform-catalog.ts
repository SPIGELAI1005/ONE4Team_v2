import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  createAuditLog,
  createClubAuditLog,
  createModuleAuditLog,
  createPlanAuditLog,
  getPlatformAuditLogs,
  type PlatformAuditLog,
  type PlatformAuditLogInput,
} from "@/lib/platform-audit";

export interface PlatformModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_core: boolean;
  is_billable: boolean;
  default_enabled: boolean;
  status: "ACTIVE" | "INACTIVE" | "DEPRECATED";
  created_at: string;
  updated_at: string;
}

export interface PlatformPlanModule {
  id: string;
  key: string;
  name: string;
  included: boolean;
  limits_json: Record<string, unknown>;
}

export interface PlatformPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  max_users: number | null;
  max_teams: number | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  modules: PlatformPlanModule[];
  created_at: string;
  updated_at: string;
}

export interface ClubModuleEntitlement {
  id: string;
  club_id: string;
  module_id: string;
  module_key: string;
  module_name: string;
  enabled: boolean;
  source: "PLAN" | "MANUAL_OVERRIDE" | "TRIAL" | "PROMOTION" | "SUPPORT" | "SYSTEM";
  valid_from: string;
  valid_until: string | null;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type { PlatformAuditLog, PlatformAuditLogInput };

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

export async function getPlatformModules(): Promise<PlatformModule[]> {
  const { data, error } = await supabaseDynamic.rpc("get_platform_modules");
  assertNoRpcError(error, "Unable to load platform modules.");
  return (Array.isArray(data) ? data : []) as PlatformModule[];
}

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  const { data, error } = await supabaseDynamic.rpc("get_platform_plans");
  assertNoRpcError(error, "Unable to load platform plans.");
  return (Array.isArray(data) ? data : []) as PlatformPlan[];
}

export async function getClubModuleEntitlements(clubId: string): Promise<ClubModuleEntitlement[]> {
  const { data, error } = await supabaseDynamic.rpc("get_club_module_entitlements", {
    _club_id: clubId,
  });
  assertNoRpcError(error, "Unable to load club module entitlements.");
  return (Array.isArray(data) ? data : []) as ClubModuleEntitlement[];
}

export const appendPlatformAuditLog = createAuditLog;

export { createAuditLog, createClubAuditLog, createModuleAuditLog, createPlanAuditLog, getPlatformAuditLogs };
