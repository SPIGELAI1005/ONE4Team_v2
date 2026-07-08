import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDashboardModuleFromPath,
  sanitizeUsageMetadata,
  USAGE_EVENT_NAMES,
} from "@/lib/usage-events";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801120000_usage_events.sql",
);

describe("usage events migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("creates the usage_events table with the expected shape", () => {
    expect(migration).toContain("create table if not exists public.usage_events");
    expect(migration).toContain("club_id uuid");
    expect(migration).toContain("user_id uuid");
    expect(migration).toContain("event_name text not null");
    expect(migration).toContain("module_key text");
    expect(migration).toContain("route text");
    expect(migration).toContain("metadata_json jsonb");
    expect(migration).toContain("user_logged_in");
    expect(migration).toContain("public_club_page_viewed");
    expect(migration).toContain("module_opened");
  });

  it("exposes append and aggregation RPCs for platform analytics", () => {
    expect(migration).toContain("create or replace function public.append_usage_event");
    expect(migration).toContain("get_active_users_last_7_days");
    expect(migration).toContain("get_active_users_last_30_days");
    expect(migration).toContain("get_most_used_modules");
    expect(migration).toContain("get_club_usage_summary");
    expect(migration).toContain("get_module_usage_by_club");
    expect(migration).toContain("get_recently_active_clubs");
    expect(migration).toContain("require_platform_permission('operator.analytics.read')");
  });

  it("denies direct table access", () => {
    expect(migration).toContain("usage_events_no_direct_access");
    expect(migration).toContain("using (false)");
  });
});

describe("usage events helpers", () => {
  it("lists the supported event names", () => {
    expect(USAGE_EVENT_NAMES).toContain("invitation_sent");
    expect(USAGE_EVENT_NAMES).toContain("qr_code_scanned");
  });

  it("strips sensitive metadata keys", () => {
    expect(
      sanitizeUsageMetadata({
        email: "secret@example.com",
        role: "trainer",
        count: 2,
      }),
    ).toEqual({
      role: "trainer",
      count: 2,
    });
  });

  it("maps dashboard routes to module keys", () => {
    expect(resolveDashboardModuleFromPath("/members/history/abc")).toBe("members");
    expect(resolveDashboardModuleFromPath("/dashboard/club_admin")).toBe("dashboard");
    expect(resolveDashboardModuleFromPath("/marketplace")).toBe("marketplace");
  });
});
