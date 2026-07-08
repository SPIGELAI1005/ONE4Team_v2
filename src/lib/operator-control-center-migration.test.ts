import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801090000_operator_control_center_foundation.sql",
);

describe("operator control center migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("creates the platform user access foundation", () => {
    expect(migration).toContain("create table if not exists public.platform_users");
    expect(migration).toContain("auth_user_id uuid not null unique references auth.users");
    expect(migration).toContain("check (role in ('OWNER', 'OPERATOR', 'SUPPORT', 'VIEWER'))");
    expect(migration).toContain("check (status in ('ACTIVE', 'DISABLED'))");
    expect(migration).toContain("platform_role_permissions");
  });

  it("exposes guarded access RPCs for operator routes", () => {
    expect(migration).toContain("get_current_platform_user");
    expect(migration).toContain("require_platform_access");
    expect(migration).toContain("require_platform_permission");
    expect(migration).toContain("can_manage_platform");
    expect(migration).toContain("can_view_platform");
    expect(migration).toContain("get_platform_operator_access");
  });

  it("denies direct table reads and keeps platform roles separate from club RBAC", () => {
    expect(migration).toContain("using (false)");
    expect(migration).toContain("Club Admin, Trainer");
    expect(migration).toContain("operator.modules.read");
    expect(migration).toContain("operator.modules.manage");
    expect(migration).toContain("operator.analytics.read");
    expect(migration).toContain("operator.settings.read");
    expect(migration).toContain("operator.access.manage");
  });
});
