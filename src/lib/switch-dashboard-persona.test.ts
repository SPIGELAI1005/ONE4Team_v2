import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ACTIVE_DASHBOARD_PERSONA_KEY,
  persistDashboardPersona,
  switchDashboardPersona,
} from "@/lib/switch-dashboard-persona";

describe("switch-dashboard-persona", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persistDashboardPersona stores normalized club_admin for admin", () => {
    expect(persistDashboardPersona("admin")).toBe("club_admin");
    expect(localStorage.getItem(ACTIVE_DASHBOARD_PERSONA_KEY)).toBe("club_admin");
  });

  it("switchDashboardPersona does not write active club id", () => {
    localStorage.setItem("one4team.activeClubId:user-1", "club-keep");
    const navigate = vi.fn();

    switchDashboardPersona("admin", navigate);

    expect(localStorage.getItem("one4team.activeClubId:user-1")).toBe("club-keep");
    expect(navigate).toHaveBeenCalledWith("/dashboard/club_admin", { replace: true });
  });

  it("switchDashboardPersona can skip navigation", () => {
    const navigate = vi.fn();

    switchDashboardPersona("trainer", navigate, { navigateToHome: false });

    expect(localStorage.getItem(ACTIVE_DASHBOARD_PERSONA_KEY)).toBe("trainer");
    expect(navigate).not.toHaveBeenCalled();
  });
});
