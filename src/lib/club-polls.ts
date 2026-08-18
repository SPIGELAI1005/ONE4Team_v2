/**
 * Club polls (Communication) — independent of match_votes / PoTM.
 */

export type ClubPollStatus = "open" | "closed";

export type ClubPollRow = {
  id: string;
  club_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  status: ClubPollStatus;
  allow_multi: boolean;
  closes_at: string | null;
  created_by: string;
  created_at: string;
  closed_at: string | null;
};

export type ClubPollOptionRow = {
  id: string;
  poll_id: string;
  club_id: string;
  label: string;
  sort_order: number;
};

export type ClubPollVoteRow = {
  id: string;
  poll_id: string;
  option_id: string;
  club_id: string;
  voter_membership_id: string;
  voter_user_id: string;
};

export function isPollOpen(
  poll: Pick<ClubPollRow, "status" | "closes_at">,
  nowMs = Date.now(),
): boolean {
  if (poll.status !== "open") return false;
  if (!poll.closes_at) return true;
  const closes = new Date(poll.closes_at).getTime();
  return Number.isFinite(closes) && closes > nowMs;
}

export function tallyPollVotes(input: {
  options: ClubPollOptionRow[];
  votes: Pick<ClubPollVoteRow, "option_id">[];
}): Array<{ optionId: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const vote of input.votes) {
    counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
  }
  return [...input.options]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => ({
      optionId: option.id,
      label: option.label,
      count: counts.get(option.id) ?? 0,
    }));
}

export function myPollOptionIds(input: {
  votes: ClubPollVoteRow[];
  membershipId: string | null;
}): string[] {
  if (!input.membershipId) return [];
  return input.votes
    .filter((vote) => vote.voter_membership_id === input.membershipId)
    .map((vote) => vote.option_id);
}
