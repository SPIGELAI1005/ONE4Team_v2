import { describe, expect, it } from "vitest";
import { getRedeemInviteErrorMessage } from "@/lib/redeem-invite-errors";

const labels = {
  unknown: "unknown",
  notAuthenticated: "not-auth",
  invalidToken: "invalid",
  notFound: "not-found",
  alreadyUsed: "used",
  expired: "expired",
  emailMismatch: "email",
  serverMisconfigured: "server",
};

describe("getRedeemInviteErrorMessage", () => {
  it("maps invite email mismatch from Postgrest-style error", () => {
    expect(
      getRedeemInviteErrorMessage({ message: "Invite email mismatch" }, labels),
    ).toBe("email");
  });

  it("maps missing pgcrypto digest error", () => {
    expect(
      getRedeemInviteErrorMessage({ message: "function digest(text, unknown) does not exist" }, labels),
    ).toBe("server");
  });
});
