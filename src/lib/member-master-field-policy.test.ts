import { describe, expect, it } from "vitest";
import {
  buildMemberMasterSavePayload,
  filterMasterPayloadForActor,
  masterRecordDisplayName,
} from "@/lib/member-master-field-policy";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";

describe("member-master-field-policy", () => {
  it("includes identity fields for self-service saves", () => {
    const form: Partial<ClubMemberMasterRecord> = {
      membership_id: "m1",
      club_id: "c1",
      first_name: "Fabia",
      last_name: "Christmann",
      sex: "female",
    };
    const payload = filterMasterPayloadForActor(form, "self");
    expect(payload.first_name).toBe("Fabia");
    expect(payload.last_name).toBe("Christmann");
    expect(payload.sex).toBe("female");
    expect(payload.membership_id).toBeUndefined();
  });

  it("returns null when no editable fields would be sent", () => {
    const payload = buildMemberMasterSavePayload(
      { membership_id: "m1", club_id: "c1" },
      "self",
    );
    expect(payload).toBeNull();
  });

  it("builds a non-empty player self-save payload for name changes", () => {
    const payload = buildMemberMasterSavePayload(
      {
        membership_id: "m1",
        club_id: "c1",
        first_name: "Fabia",
        last_name: "Christmann",
        sex: "female",
      },
      "self",
    );
    expect(payload?.last_name).toBe("Christmann");
  });

  it("prefers master names for display labels", () => {
    expect(
      masterRecordDisplayName({ first_name: "Fabia", last_name: "Christmann" }, "Fabia Klag"),
    ).toBe("Fabia Christmann");
  });
});
