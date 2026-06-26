import { describe, expect, it } from "vitest";
import {
  parseYouthTeamLabel,
  resolveCanonicalYouthTeamName,
  resolveTeamByYouthLabel,
} from "@/lib/youth-team-label";

describe("youth-team-label", () => {
  const teams = [
    { id: "u12i", name: "U12-I" },
    { id: "u13i", name: "U13-I" },
  ];

  it("treats U12-1 and U12-I as the same team", () => {
    expect(parseYouthTeamLabel("U12-1")).toEqual(parseYouthTeamLabel("U12-I"));
    expect(resolveTeamByYouthLabel(teams, "U12-1")?.id).toBe("u12i");
    expect(resolveCanonicalYouthTeamName(teams, "U12-1")).toBe("U12-I");
  });
});
