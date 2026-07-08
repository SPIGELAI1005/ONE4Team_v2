import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { PlatformModule, PlatformPlan } from "@/lib/platform-catalog";

export interface PlatformPlanMatrixCell {
  plan_id: string;
  module_id: string;
  included: boolean;
}

export interface PlatformPlanMatrixModule {
  id: string;
  key: string;
  name: string;
  category: string;
  status: string;
}

export interface PlatformPlanMatrixPlan {
  id: string;
  key: string;
  name: string;
  status: string;
}

export interface PlatformPlanMatrix {
  modules: PlatformPlanMatrixModule[];
  plans: PlatformPlanMatrixPlan[];
  cells: PlatformPlanMatrixCell[];
}

export interface UpsertPlatformModuleInput {
  moduleId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  category?: string;
  isCore?: boolean;
  isBillable?: boolean;
  defaultEnabled?: boolean;
  status?: PlatformModule["status"];
}

export interface UpsertPlatformPlanInput {
  planId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  maxUsers?: number | null;
  maxTeams?: number | null;
  status?: PlatformPlan["status"];
}

export interface SetPlatformPlanModuleInput {
  planId: string;
  moduleId: string;
  included: boolean;
  reason: string;
}

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

export function formatCatalogPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getPlatformPlanMatrix(): Promise<PlatformPlanMatrix> {
  const { data, error } = await supabaseDynamic.rpc("get_platform_plan_matrix");
  assertNoRpcError(error, "Unable to load plan matrix.");
  return data as PlatformPlanMatrix;
}

export async function upsertPlatformModule(input: UpsertPlatformModuleInput): Promise<PlatformModule> {
  const { data, error } = await supabaseDynamic.rpc("upsert_platform_module", {
    _module_id: input.moduleId ?? null,
    _key: input.key,
    _name: input.name,
    _description: input.description ?? null,
    _category: input.category ?? "core",
    _is_core: input.isCore ?? false,
    _is_billable: input.isBillable ?? false,
    _default_enabled: input.defaultEnabled ?? false,
    _status: input.status ?? "ACTIVE",
  });
  assertNoRpcError(error, "Unable to save module.");
  return data as PlatformModule;
}

export async function upsertPlatformPlan(input: UpsertPlatformPlanInput): Promise<PlatformPlan> {
  const { data, error } = await supabaseDynamic.rpc("upsert_platform_plan", {
    _plan_id: input.planId ?? null,
    _key: input.key,
    _name: input.name,
    _description: input.description ?? null,
    _price_monthly: input.priceMonthly ?? null,
    _price_yearly: input.priceYearly ?? null,
    _max_users: input.maxUsers ?? null,
    _max_teams: input.maxTeams ?? null,
    _status: input.status ?? "ACTIVE",
  });
  assertNoRpcError(error, "Unable to save plan.");
  return data as PlatformPlan;
}

export async function setPlatformPlanModule(input: SetPlatformPlanModuleInput): Promise<void> {
  const { error } = await supabaseDynamic.rpc("set_platform_plan_module", {
    _plan_id: input.planId,
    _module_id: input.moduleId,
    _included: input.included,
    _reason: input.reason.trim(),
  });
  assertNoRpcError(error, "Unable to update plan-module mapping.");
}

export function buildPlanMatrixLookup(cells: PlatformPlanMatrixCell[]): Map<string, boolean> {
  const lookup = new Map<string, boolean>();
  for (const cell of cells) {
    lookup.set(`${cell.plan_id}:${cell.module_id}`, cell.included);
  }
  return lookup;
}

export function isModuleIncludedInPlan(
  lookup: Map<string, boolean>,
  planId: string,
  moduleId: string,
): boolean {
  return lookup.get(`${planId}:${moduleId}`) ?? false;
}
