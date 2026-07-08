import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPERATOR_CLUB_STATUSES,
  previewOperatorClubPlanChange,
  setOperatorClubPlan,
  setOperatorClubStatus,
} from "@/lib/operator-club-controls";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801170000_operator_settings_and_club_controls.sql",
);

describe("operator club controls migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("expands club lifecycle statuses", () => {
    expect(migration).toContain("'ACTIVE', 'TRIAL', 'PAYING', 'SUSPENDED', 'ARCHIVED'");
  });

  it("defines controlled club status and plan RPCs", () => {
    expect(migration).toContain("create or replace function public.set_operator_club_status(");
    expect(migration).toContain("create or replace function public.set_operator_club_plan(");
    expect(migration).toContain("create or replace function public.preview_operator_club_plan_change(");
    expect(migration).toContain("require_platform_permission('operator.clubs.manage')");
  });

  it("audits club plan changes without deleting manual overrides", () => {
    expect(migration).toContain("'PLAN_CHANGED'");
    expect(migration).toContain("kept_active_not_in_plan");
    expect(migration).not.toContain("delete from public.club_module_entitlements");
  });
});

describe("operator club controls helpers", () => {
  it("exports club lifecycle constants and RPC helpers", () => {
    expect(OPERATOR_CLUB_STATUSES.length).toBe(5);
    expect(typeof previewOperatorClubPlanChange).toBe("function");
    expect(typeof setOperatorClubStatus).toBe("function");
    expect(typeof setOperatorClubPlan).toBe("function");
  });
});
