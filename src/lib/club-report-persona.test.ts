import { describe, expect, it } from "vitest";
import {
  canAccessFinancialReports,
  resolveClubReportPersona,
} from "@/lib/club-report-persona";

describe("club-report-persona", () => {
  it("resolves trainer and admin personas from legacy role and assignments", () => {
    expect(resolveClubReportPersona({ legacyRole: "trainer" })).toBe("trainer");
    expect(resolveClubReportPersona({ legacyRole: "admin", isClubAdminRpc: true })).toBe("admin");
    expect(resolveClubReportPersona({ legacyRole: "player" })).toBe("player");
  });

  it("never exposes financial reports on the public club surface", () => {
    expect(canAccessFinancialReports("admin", "public")).toBe(false);
    expect(canAccessFinancialReports("admin", "dashboard")).toBe(true);
    expect(canAccessFinancialReports("trainer", "dashboard")).toBe(false);
  });
});
