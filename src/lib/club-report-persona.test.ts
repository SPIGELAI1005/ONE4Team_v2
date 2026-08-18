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

  it("maps team_management to trainer report persona (no finance)", () => {
    expect(resolveClubReportPersona({ legacyRole: "team_management" })).toBe("trainer");
    expect(
      canAccessFinancialReports("admin", "dashboard", "team_management"),
    ).toBe(false);
  });

  it("never exposes financial reports on the public club surface", () => {
    expect(canAccessFinancialReports("admin", "public")).toBe(false);
    expect(canAccessFinancialReports("admin", "dashboard")).toBe(true);
    expect(canAccessFinancialReports("admin", "dashboard", "club_admin")).toBe(true);
    expect(canAccessFinancialReports("trainer", "dashboard")).toBe(false);
  });
});
