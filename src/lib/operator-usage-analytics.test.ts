import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatAdoptionRate,
  formatUsageEventName,
  getOperatorUsageAnalytics,
} from "@/lib/operator-usage-analytics";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801130000_operator_usage_analytics.sql",
);

describe("operator usage analytics migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines a protected aggregate RPC for the analytics page", () => {
    expect(migration).toContain("create or replace function public.get_operator_usage_analytics");
    expect(migration).toContain("require_platform_permission('operator.analytics.read')");
    expect(migration).toContain("active_users");
    expect(migration).toContain("club_activity");
    expect(migration).toContain("module_usage");
    expect(migration).toContain("feature_adoption");
    expect(migration).toContain("recent_events");
  });

  it("supports date, club, module, and plan filters", () => {
    expect(migration).toContain("_date_from timestamptz");
    expect(migration).toContain("_club_id uuid");
    expect(migration).toContain("_module_key text");
    expect(migration).toContain("_plan_key text");
  });

  it("does not expose user identifiers in recent events", () => {
    const recentEventsBlock = migration.match(/recent_events as \([\s\S]*?\),/)?.[0] ?? "";
    expect(recentEventsBlock).toContain("se.event_name");
    expect(recentEventsBlock).toContain("c.name as club_name");
    expect(recentEventsBlock).not.toContain("user_id");
  });
});

describe("operator usage analytics helpers", () => {
  it("exports analytics access helpers", () => {
    expect(typeof getOperatorUsageAnalytics).toBe("function");
    expect(formatUsageEventName("module_opened")).toBe("Module Opened");
    expect(formatAdoptionRate(3, 10)).toBe("30%");
  });
});
