import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { ClubPollOptionRow, ClubPollRow, ClubPollVoteRow } from "@/lib/club-polls";

export async function listClubPolls(clubId: string): Promise<{
  data: ClubPollRow[];
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("club_polls")
    .select(
      "id, club_id, team_id, title, description, status, allow_multi, closes_at, created_by, created_at, closed_at",
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(50);

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubPollRow[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function listPollOptions(pollIds: string[]): Promise<{
  data: ClubPollOptionRow[];
  error: Error | null;
}> {
  if (!pollIds.length) return { data: [], error: null };
  const result = await supabaseDynamic
    .from("club_poll_options")
    .select("id, poll_id, club_id, label, sort_order")
    .in("poll_id", pollIds)
    .order("sort_order", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubPollOptionRow[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function listPollVotes(pollIds: string[]): Promise<{
  data: ClubPollVoteRow[];
  error: Error | null;
}> {
  if (!pollIds.length) return { data: [], error: null };
  const result = await supabaseDynamic
    .from("club_poll_votes")
    .select("id, poll_id, option_id, club_id, voter_membership_id, voter_user_id")
    .in("poll_id", pollIds);

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubPollVoteRow[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function createClubPoll(input: {
  clubId: string;
  title: string;
  description?: string | null;
  teamId?: string | null;
  allowMulti?: boolean;
  closesAt?: string | null;
  options: string[];
}): Promise<{ pollId: string | null; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("create_club_poll", {
    _club_id: input.clubId,
    _title: input.title,
    _description: input.description ?? null,
    _team_id: input.teamId ?? null,
    _allow_multi: input.allowMulti ?? false,
    _closes_at: input.closesAt ?? null,
    _options: input.options,
  });

  if (error) return { pollId: null, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; poll_id?: string } | null;
  if (!payload?.ok) return { pollId: null, error: payload?.error || "unknown_error" };
  return { pollId: payload.poll_id ?? null, error: null };
}

export async function voteClubPoll(input: {
  pollId: string;
  optionIds: string[];
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("vote_club_poll", {
    _poll_id: input.pollId,
    _option_ids: input.optionIds,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export async function closeClubPoll(pollId: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("close_club_poll", { _poll_id: pollId });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}
