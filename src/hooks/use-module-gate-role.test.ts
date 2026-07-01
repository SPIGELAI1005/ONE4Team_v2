import { describe, expect, it } from "vitest";
import { resolvePortalSide } from "@/hooks/use-module-gate-role";

describe("resolvePortalSide", () => {
  it("does not pick a side while permissions are loading", () => {
    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/partner-reports",
        permissionsLoading: true,
      }),
    ).toBe("loading");
  });

  it("uses gate role when resolved — supplier is partner portal", () => {
    expect(
      resolvePortalSide({
        gateRole: "supplier",
        pathname: "/reports",
        permissionsLoading: false,
      }),
    ).toBe("partner");
  });

  it("uses gate role when resolved — club admin is club portal", () => {
    expect(
      resolvePortalSide({
        gateRole: "club_admin",
        pathname: "/partner-reports",
        permissionsLoading: false,
      }),
    ).toBe("club");
  });

  it("falls back to pathname when gate role is unknown after load", () => {
    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/partner-reports",
        permissionsLoading: false,
      }),
    ).toBe("partner");

    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/reports",
        permissionsLoading: false,
      }),
    ).toBe("club");

    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/supplier-page",
        permissionsLoading: false,
      }),
    ).toBe("partner");

    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/club-page-admin",
        permissionsLoading: false,
      }),
    ).toBe("club");

    expect(
      resolvePortalSide({
        gateRole: "supplier",
        pathname: "/club-page-admin",
        permissionsLoading: false,
      }),
    ).toBe("club");
  });
});
