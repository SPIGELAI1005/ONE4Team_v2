import { describe, expect, it } from "vitest";
import {
  dashboardRouteTransitionKey,
  isDashboardShellPath,
} from "@/lib/dashboard-nav";

describe("isDashboardShellPath", () => {
  it("recognizes dashboard shell routes", () => {
    expect(isDashboardShellPath("/dashboard/club_admin")).toBe(true);
    expect(isDashboardShellPath("/members")).toBe(true);
    expect(isDashboardShellPath("/settings")).toBe(true);
    expect(isDashboardShellPath("/partners")).toBe(true);
    expect(isDashboardShellPath("/members/history/abc")).toBe(true);
  });

  it("excludes marketing and public club routes", () => {
    expect(isDashboardShellPath("/")).toBe(false);
    expect(isDashboardShellPath("/auth")).toBe(false);
    expect(isDashboardShellPath("/club/tsv-allach")).toBe(false);
  });
});

describe("dashboardRouteTransitionKey", () => {
  it("uses a stable key across dashboard navigations", () => {
    const keyA = dashboardRouteTransitionKey("/dashboard/club_admin");
    const keyB = dashboardRouteTransitionKey("/members");
    expect(keyA).toBe(keyB);
    expect(keyA).toBe("__dashboard_shell__");
  });

  it("keeps unique keys for public pages", () => {
    expect(dashboardRouteTransitionKey("/auth")).toBe("/auth");
    expect(dashboardRouteTransitionKey("/pricing")).toBe("/pricing");
  });
});
