import { describe, expect, it } from "vitest";
import {
  allachInterestedRole,
  allachInterestedTeam,
  applicationPayloadForRpc,
  buildAllachApplicationMessage,
  emptyTsvAllachMembershipApplication,
  formatAllachPhone,
} from "@/lib/tsv-allach-membership-application";

describe("tsv-allach-membership-application", () => {
  it("maps child applications to parent role", () => {
    const app = emptyTsvAllachMembershipApplication();
    app.applicantType = "child";
    app.childFullName = "Max Mustermann";
    expect(allachInterestedRole(app)).toBe("parent");
    expect(allachInterestedTeam(app)).toBe("Max Mustermann");
  });

  it("formats phone with country dial code", () => {
    const app = emptyTsvAllachMembershipApplication();
    app.mobilePhone = "1701234567";
    expect(formatAllachPhone(app)).toBe("+49 1701234567");
  });

  it("builds rpc payload with schema marker", () => {
    const payload = applicationPayloadForRpc(emptyTsvAllachMembershipApplication("a@b.de"));
    expect(payload.schema).toBe("tsv-allach-onlineanmeldung-v1");
    expect(payload.email).toBe("a@b.de");
  });

  it("summarizes message for reviewers", () => {
    const app = emptyTsvAllachMembershipApplication();
    app.applicantType = "child";
    app.childFullName = "Max Mustermann";
    app.membershipType = "youth";
    app.street = "Hauptstr. 1";
    app.postalCode = "80999";
    app.city = "München";
    app.country = "DE";
    const msg = buildAllachApplicationMessage(app);
    expect(msg).toContain("Child / youth");
    expect(msg).toContain("Max Mustermann");
    expect(msg).toContain("80999");
  });
});
