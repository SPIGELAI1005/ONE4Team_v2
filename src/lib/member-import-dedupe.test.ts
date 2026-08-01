import { describe, expect, it } from "vitest";
import { mergeBulkImportRows, summarizeMasterPayloadForDisplay } from "@/lib/member-import-dedupe";

describe("member-import-dedupe", () => {
  it("merges duplicate rows by club member number", () => {
    const existing = [
      {
        id: "a",
        email: "family@example.com",
        name: "Child One",
        role: "player",
        team: "Jugend",
        ageGroup: "",
        position: "",
        masterData: { internal_club_number: "11281", first_name: "Child", last_name: "One" },
      },
    ];

    const incoming = [
      {
        id: "b",
        email: "family@example.com",
        name: "Child One",
        role: "player",
        team: "Jugend",
        ageGroup: "",
        position: "",
        masterData: { internal_club_number: "11281", first_name: "Child", last_name: "One", city: "München" },
      },
      {
        id: "c",
        email: "other@example.com",
        name: "Other Person",
        role: "member",
        team: "",
        ageGroup: "",
        position: "",
        masterData: { internal_club_number: "12001", first_name: "Other", last_name: "Person" },
      },
    ];

    const result = mergeBulkImportRows(existing, incoming);
    expect(result.rows).toHaveLength(2);
    expect(result.updated).toBe(1);
    expect(result.added).toBe(1);
    expect(result.rows[0]?.masterData.city).toBe("München");
  });

  it("shows extracted values instead of field keys", () => {
    expect(
      summarizeMasterPayloadForDisplay({
        internal_club_number: "11281",
        first_name: "Alexander",
        last_name: "Neacsu",
        city: "München",
      }),
    ).toBe("#11281 · Alexander · Neacsu · München");
  });
});
