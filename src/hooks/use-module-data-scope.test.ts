import { describe, expect, it } from "vitest";
import { useModuleDataScope, filterRowsByTeamScope } from "@/hooks/use-module-data-scope";

// Hook tests via pure helpers and documented behavior in rbac-config tests.
describe("filterRowsByTeamScope", () => {
  it("returns all rows for club-wide scope", () => {
    const rows = [{ team_id: "a" }, { team_id: "b" }];
    expect(filterRowsByTeamScope(rows, "all")).toHaveLength(2);
  });

  it("filters to assigned teams", () => {
    const rows = [{ team_id: "a" }, { team_id: "b" }, { team_id: null }];
    expect(filterRowsByTeamScope(rows, ["a"]).map((r) => r.team_id)).toEqual(["a"]);
  });

  it("returns empty when no teams assigned", () => {
    expect(filterRowsByTeamScope([{ team_id: "a" }], [])).toEqual([]);
  });
});

describe("useModuleDataScope", () => {
  it("is exported for page hooks", () => {
    expect(typeof useModuleDataScope).toBe("function");
  });
});
