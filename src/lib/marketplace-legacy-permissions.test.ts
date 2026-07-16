import { describe, expect, it } from "vitest";
import { legacyPermissionsFromRbac } from "@/lib/permissions";

describe("marketplace:read / marketplace:write", () => {
  it("maps marketplace module to distinct permissions for club admin", () => {
    const perms = legacyPermissionsFromRbac("club_admin");
    expect(perms).toContain("marketplace:read");
    expect(perms).toContain("marketplace:write");
    expect(perms).toContain("partners:read");
  });

  it("does not grant marketplace permissions to trainers", () => {
    const perms = legacyPermissionsFromRbac("trainer");
    expect(perms).not.toContain("marketplace:read");
    expect(perms).not.toContain("marketplace:write");
  });
});
