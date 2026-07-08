import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatModuleSourceLabel,
  setOperatorClubModuleEntitlement,
} from "@/lib/operator-club-module-entitlements";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801103000_operator_club_module_entitlements.sql",
);

describe("operator club module entitlements", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines a protected entitlement mutation RPC with validation", () => {
    expect(migration).toContain("create or replace function public.set_operator_club_module_entitlement(");
    expect(migration).toContain("require_platform_permission('operator.modules.manage')");
    expect(migration).toContain("Reason is required.");
    expect(migration).toContain("Only OWNER can disable core modules.");
    expect(migration).toContain("on conflict (club_id, module_id, source)");
  });

  it("audits enable, disable, and override updates", () => {
    expect(migration).toContain("MODULE_ENABLED");
    expect(migration).toContain("MODULE_DISABLED");
    expect(migration).toContain("MODULE_OVERRIDE_UPDATED");
    expect(migration).toContain("to_jsonb(old)");
    expect(migration).toContain("to_jsonb(new)");
  });

  it("exports module entitlement helper", () => {
    expect(typeof setOperatorClubModuleEntitlement).toBe("function");
    expect(formatModuleSourceLabel("MANUAL_OVERRIDE")).toBe("Manual Override");
    expect(formatModuleSourceLabel("PLAN")).toBe("Plan");
  });
});
