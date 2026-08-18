import { describe, expect, it } from "vitest";
import {
  canEditRoleAssignment,
  filterAssignableRoleKinds,
  isMemberManagerAssignableRoleKind,
} from "@/lib/club-role-assignment-access";

const ALL = [
  { value: "club_admin" as const, label: "clubAdmin" },
  { value: "trainer" as const, label: "trainer" },
  { value: "player" as const, label: "player" },
  { value: "consultant" as const, label: "consultant" },
];

describe("club-role-assignment-access", () => {
  it("allows member managers to assign operational roles only", () => {
    expect(isMemberManagerAssignableRoleKind("trainer")).toBe(true);
    expect(isMemberManagerAssignableRoleKind("club_admin")).toBe(false);
    expect(isMemberManagerAssignableRoleKind("consultant")).toBe(false);
  });

  it("filters role picker options for non-admins", () => {
    const filtered = filterAssignableRoleKinds(ALL, false);
    expect(filtered.map((r) => r.value)).toEqual(["trainer", "player"]);
  });

  it("allows club admins to edit any assignment row", () => {
    expect(canEditRoleAssignment(true, "consultant")).toBe(true);
    expect(canEditRoleAssignment(false, "consultant")).toBe(false);
    expect(canEditRoleAssignment(false, "player")).toBe(true);
  });
});
