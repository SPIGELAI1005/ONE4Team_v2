import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatOverviewNumber,
  formatOverviewTimestamp,
  getOperatorPlatformOverview,
} from "@/lib/platform-overview";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801094500_operator_platform_overview.sql",
);

describe("operator platform overview", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines a protected aggregate RPC for the overview page", () => {
    expect(migration).toContain("create or replace function public.get_operator_platform_overview()");
    expect(migration).toContain("require_platform_permission('operator.overview.read')");
    expect(migration).toContain("total_clubs");
    expect(migration).toContain("active_users_last_7_days");
    expect(migration).toContain("recent_audit");
    expect(migration).toContain("recent_issues");
    expect(migration).toContain("module_usage");
  });

  it("aggregates platform-wide entities without club scoping", () => {
    expect(migration).toContain("from public.clubs");
    expect(migration).toContain("from public.profiles");
    expect(migration).toContain("from public.teams");
    expect(migration).toContain("from public.events");
    expect(migration).toContain("from public.matches");
    expect(migration).toContain("from public.billing_subscriptions");
    expect(migration).toContain("from public.audit_logs");
    expect(migration).toContain("from public.abuse_alerts");
  });

  it("exports overview data access helpers", () => {
    expect(typeof getOperatorPlatformOverview).toBe("function");
    expect(formatOverviewNumber(1200)).toMatch(/1[.,]200/);
    expect(formatOverviewTimestamp(null)).toBe("—");
  });
});
