import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlanMatrixLookup,
  formatCatalogPrice,
  isModuleIncludedInPlan,
  setPlatformPlanModule,
  upsertPlatformModule,
  upsertPlatformPlan,
} from "@/lib/platform-catalog-admin";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801110000_operator_modules_plans_management.sql",
);

describe("platform catalog admin", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines protected catalog management RPCs", () => {
    expect(migration).toContain("create or replace function public.upsert_platform_module(");
    expect(migration).toContain("create or replace function public.upsert_platform_plan(");
    expect(migration).toContain("create or replace function public.set_platform_plan_module(");
    expect(migration).toContain("create or replace function public.get_platform_plan_matrix()");
    expect(migration).toContain("Only OWNER can create or edit modules.");
    expect(migration).toContain("Only OWNER can create or edit plans.");
    expect(migration).toContain("require_platform_permission('operator.plans.manage')");
  });

  it("audits plan-module mapping changes with before and after state", () => {
    expect(migration).toContain("PLAN_MODULE_CHANGED");
    expect(migration).toContain("to_jsonb(old)");
    expect(migration).toContain("to_jsonb(new)");
    expect(migration).toContain("app.platform_audit_reason");
  });

  it("exports catalog admin helpers", () => {
    expect(typeof upsertPlatformModule).toBe("function");
    expect(typeof upsertPlatformPlan).toBe("function");
    expect(typeof setPlatformPlanModule).toBe("function");
    expect(formatCatalogPrice(49)).toMatch(/49/);

    const lookup = buildPlanMatrixLookup([
      { plan_id: "plan-1", module_id: "mod-1", included: true },
    ]);
    expect(isModuleIncludedInPlan(lookup, "plan-1", "mod-1")).toBe(true);
    expect(isModuleIncludedInPlan(lookup, "plan-1", "mod-2")).toBe(false);
  });
});
