import { describe, expect, it } from "vitest";
import { aiRoleToAgentPerms, aiRoleToContextScope, resolvePublicClubAiRole } from "./public-club-ai-role";

describe("public-club-ai-role", () => {
  it("maps report persona and legacy role to AI role keys", () => {
    expect(resolvePublicClubAiRole("admin", "member")).toBe("admin");
    expect(resolvePublicClubAiRole("trainer", "player")).toBe("trainer");
    expect(resolvePublicClubAiRole("player", "player")).toBe("player");
    expect(resolvePublicClubAiRole("member", "parent")).toBe("parent");
    expect(resolvePublicClubAiRole("member", "staff")).toBe("staff");
  });

  it("grants agent workflows only to admin and trainer", () => {
    expect(aiRoleToAgentPerms("admin")).toEqual({ canManageSchedule: true, canManageMembers: true });
    expect(aiRoleToAgentPerms("trainer")).toEqual({ canManageSchedule: true, canManageMembers: false });
    expect(aiRoleToAgentPerms("player")).toEqual({ canManageSchedule: false, canManageMembers: false });
  });

  it("scopes context for player and public team filter", () => {
    expect(aiRoleToContextScope("admin", null)).toBe("staff");
    expect(aiRoleToContextScope("player", null)).toBe("player");
    expect(aiRoleToContextScope("member", "team-1")).toBe("public");
  });
});
