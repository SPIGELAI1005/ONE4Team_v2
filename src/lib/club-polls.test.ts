import { describe, expect, it } from "vitest";
import { isPollOpen, myPollOptionIds, tallyPollVotes } from "@/lib/club-polls";

describe("club-polls", () => {
  it("respects status and closes_at", () => {
    expect(isPollOpen({ status: "open", closes_at: null })).toBe(true);
    expect(isPollOpen({ status: "closed", closes_at: null })).toBe(false);
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isPollOpen({ status: "open", closes_at: past })).toBe(false);
  });

  it("tallies votes and finds my options", () => {
    const options = [
      { id: "a", poll_id: "p", club_id: "c", label: "Yes", sort_order: 0 },
      { id: "b", poll_id: "p", club_id: "c", label: "No", sort_order: 1 },
    ];
    const votes = [
      { id: "1", poll_id: "p", option_id: "a", club_id: "c", voter_membership_id: "m1", voter_user_id: "u1" },
      { id: "2", poll_id: "p", option_id: "a", club_id: "c", voter_membership_id: "m2", voter_user_id: "u2" },
      { id: "3", poll_id: "p", option_id: "b", club_id: "c", voter_membership_id: "m3", voter_user_id: "u3" },
    ];
    expect(tallyPollVotes({ options, votes })).toEqual([
      { optionId: "a", label: "Yes", count: 2 },
      { optionId: "b", label: "No", count: 1 },
    ]);
    expect(myPollOptionIds({ votes, membershipId: "m1" })).toEqual(["a"]);
  });
});
