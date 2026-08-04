import { describe, expect, it } from "vitest";
import { resolveMyMemberDataLoadError, resolveMyMemberDataSaveError } from "@/lib/member-my-data-errors";

const labels = {
  loadFailedGeneric: "generic",
  loadFailedNotAuthenticated: "auth",
  loadFailedNotAuthorized: "forbidden",
  loadFailedServer: "server",
  loadFailedMigration: "migration",
};

const saveLabels = {
  saveFailedGeneric: "generic save",
  saveFailedNoEditableFields: "no fields",
  saveFailedNotAuthorized: "forbidden save",
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

describe("resolveMyMemberDataSaveError", () => {
  it("maps no_editable_fields", () => {
    expect(resolveMyMemberDataSaveError("no_editable_fields", saveLabels)).toBe("no fields");
  });
});
