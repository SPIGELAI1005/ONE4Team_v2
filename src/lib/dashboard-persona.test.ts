import { describe, expect, it } from "vitest";
import {
  defaultDashboardPersonaSlug,
  isDashboardPersonaAllowed,
  resolveModuleGateRole,
} from "@/lib/dashboard-persona";

describe("dashboard-persona", () => {
  it("allows club admin personas for preview", () => {
    expect(isDashboardPersonaAllowed("trainer", "admin", [])).toBe(true);
    expect(isDashboardPersonaAllowed("player", "club_admin", [])).toBe(true);
    expect(isDashboardPersonaAllowed("admin", "club_admin", [])).toBe(true);
  });

  it("allows club_admin dashboard for supplier membership when treatAsClubAdmin", () => {
    expect(
      isDashboardPersonaAllowed("club_admin", "supplier", [], { treatAsClubAdmin: true }),
    ).toBe(true);
    expect(
      isDashboardPersonaAllowed("supplier", "supplier", [], { treatAsClubAdmin: true }),
    ).toBe(true);
  });

  it("rejects unauthorized persona escalation", () => {
    expect(isDashboardPersonaAllowed("admin", "player", [])).toBe(false);
    expect(isDashboardPersonaAllowed("trainer", "member", [])).toBe(false);
    expect(isDashboardPersonaAllowed("club_admin", "supplier", [])).toBe(false);
  });

  it("defaults to authorized role slug", () => {
    expect(defaultDashboardPersonaSlug("player", [])).toBe("player");
    expect(defaultDashboardPersonaSlug("admin", [])).toBe("club_admin");
    expect(defaultDashboardPersonaSlug("supplier", [], { treatAsClubAdmin: true })).toBe(
      "club_admin",
    );
  });

  it("module gate uses active supplier persona over club admin elevation", () => {
    expect(
      resolveModuleGateRole("supplier", [], "supplier", { treatAsClubAdmin: true }),
    ).toBe("supplier");
    expect(
      resolveModuleGateRole("admin", [], "club_admin", { treatAsClubAdmin: true }),
    ).toBe("club_admin");
    expect(resolveModuleGateRole("admin", [], null, { treatAsClubAdmin: true })).toBe(
      "club_admin",
    );
  });

  it("never returns null when membership role is unknown", () => {
    expect(resolveModuleGateRole(null, [], null)).toBe("member");
  });
});
