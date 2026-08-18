import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { TeamLedgerAccount, TeamLedgerCategory, TeamLedgerDirection, TeamLedgerEntry } from "@/lib/team-ledger";

export async function listTeamLedgerAccounts(clubId: string): Promise<{
  data: TeamLedgerAccount[];
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("team_ledger_accounts")
    .select("id, club_id, team_id, name, currency")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: TeamLedgerAccount[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function listTeamLedgerEntries(input: {
  clubId: string;
  teamId: string;
}): Promise<{ data: TeamLedgerEntry[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("team_ledger_entries")
    .select(
      "id, club_id, team_id, account_id, entry_date, direction, amount, category, description, membership_id, created_at, status, submitted_by, reviewed_by, rejection_reason",
    )
    .eq("club_id", input.clubId)
    .eq("team_id", input.teamId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: TeamLedgerEntry[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  const rows = (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
  return { data: rows, error: null };
}

export async function postTeamLedgerEntry(input: {
  teamId: string;
  direction: TeamLedgerDirection;
  amount: number;
  category: TeamLedgerCategory;
  description?: string | null;
  entryDate?: string | null;
  membershipId?: string | null;
}): Promise<{ entryId: string | null; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("post_team_ledger_entry", {
    _team_id: input.teamId,
    _direction: input.direction,
    _amount: input.amount,
    _category: input.category,
    _description: input.description ?? null,
    _entry_date: input.entryDate ?? null,
    _membership_id: input.membershipId ?? null,
  });

  if (error) return { entryId: null, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; entry_id?: string } | null;
  if (!payload?.ok) return { entryId: null, error: payload?.error || "unknown_error" };
  return { entryId: payload.entry_id ?? null, error: null };
}

export async function approveTeamLedgerEntry(entryId: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("approve_team_ledger_entry", { _entry_id: entryId });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export async function rejectTeamLedgerEntry(
  entryId: string,
  reason?: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("reject_team_ledger_entry", {
    _entry_id: entryId,
    _reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export async function resubmitTeamLedgerEntry(input: {
  entryId: string;
  direction?: TeamLedgerDirection;
  amount?: number;
  category?: TeamLedgerCategory;
  description?: string | null;
  entryDate?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabaseDynamic.rpc("resubmit_team_ledger_entry", {
    _entry_id: input.entryId,
    _direction: input.direction ?? null,
    _amount: input.amount ?? null,
    _category: input.category ?? null,
    _description: input.description ?? null,
    _entry_date: input.entryDate ?? null,
  });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null };
}

export async function fetchTeamLedgerBalance(teamId: string): Promise<{
  balance: number;
  totalIn: number;
  totalOut: number;
  currency: string;
  error: string | null;
}> {
  const { data, error } = await supabaseDynamic.rpc("team_ledger_balance", { _team_id: teamId });
  if (error) {
    return { balance: 0, totalIn: 0, totalOut: 0, currency: "EUR", error: error.message || "rpc_failed" };
  }
  const payload = data as {
    ok?: boolean;
    error?: string;
    balance?: number;
    total_in?: number;
    total_out?: number;
    currency?: string;
  } | null;
  if (!payload?.ok) {
    return {
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      currency: "EUR",
      error: payload?.error || "unknown_error",
    };
  }
  return {
    balance: Number(payload.balance ?? 0),
    totalIn: Number(payload.total_in ?? 0),
    totalOut: Number(payload.total_out ?? 0),
    currency: payload.currency ?? "EUR",
    error: null,
  };
}
