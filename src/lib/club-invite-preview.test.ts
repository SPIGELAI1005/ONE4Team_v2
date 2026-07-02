import { describe, expect, it } from "vitest";
import { parseClubInvitePreviewRow, splitInviteMemberName } from "@/lib/club-invite-preview";

describe("splitInviteMemberName", () => {
  it("splits on first space", () => {
    expect(splitInviteMemberName("Alexander Neacsu")).toEqual({
      firstName: "Alexander",
      lastName: "Neacsu",
    });
  });

  it("handles single token names", () => {
    expect(splitInviteMemberName("Alexander")).toEqual({
      firstName: "Alexander",
      lastName: "",
    });
  });
});

describe("parseClubInvitePreviewRow", () => {
  it("maps a valid preview row", () => {
    const parsed = parseClubInvitePreviewRow({
      ok: true,
      error_code: null,
      club_id: "club-1",
      club_name: "TSV Allach 09",
      club_slug: "tsv-allach-09",
      email: "alex@example.com",
      role: "member",
      member_name: "Alexander Neacsu",
      first_name: "Alexander",
      last_name: "Neacsu",
      team: "U17",
      age_group: null,
      position: null,
      expires_at: null,
      used_at: null,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.preview.clubSlug).toBe("tsv-allach-09");
      expect(parsed.preview.email).toBe("alex@example.com");
      expect(parsed.preview.firstName).toBe("Alexander");
      expect(parsed.preview.team).toBe("U17");
    }
  });

  it("returns error codes for invalid invites", () => {
    expect(parseClubInvitePreviewRow({ ok: false, error_code: "expired" })).toEqual({
      ok: false,
      errorCode: "expired",
    });
  });
});
