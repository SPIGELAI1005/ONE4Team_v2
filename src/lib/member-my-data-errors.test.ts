import { describe, expect, it } from "vitest";
import { resolveMyMemberDataLoadError } from "@/lib/member-my-data-errors";

const labels = {
  loadFailedGeneric: "generic",
  loadFailedNotAuthenticated: "auth",
  loadFailedNotAuthorized: "forbidden",
  loadFailedServer: "server",
  loadFailedMigration: "migration",
};

describe("resolveMyMemberDataLoadError", () => {
  it("maps structure mismatch to migration message", () => {
    expect(
      resolveMyMemberDataLoadError("structure of query does not match function result type", labels),
    ).toBe("migration");
  });

  it("maps not authorized", () => {
    expect(resolveMyMemberDataLoadError("Not authorized", labels)).toBe("forbidden");
  });
});
