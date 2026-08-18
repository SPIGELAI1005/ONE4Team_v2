/**
 * Team cashbox ledger — independent of club payments / dues / club_expenses.
 * Balance is always derived from entries.
 */

export type TeamLedgerDirection = "in" | "out";

export type TeamLedgerCategory =
  | "contribution"
  | "kit"
  | "travel"
  | "equipment"
  | "event"
  | "refund"
  | "other";

export type TeamLedgerAccount = {
  id: string;
  club_id: string;
  team_id: string;
  name: string;
  currency: string;
};

export type TeamLedgerEntryStatus = "pending" | "approved" | "rejected";

export type TeamLedgerEntry = {
  id: string;
  club_id: string;
  team_id: string;
  account_id: string;
  entry_date: string;
  direction: TeamLedgerDirection;
  amount: number;
  category: TeamLedgerCategory;
  description: string | null;
  membership_id: string | null;
  created_at: string;
  status?: TeamLedgerEntryStatus;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
};

export const TEAM_LEDGER_CATEGORIES: TeamLedgerCategory[] = [
  "contribution",
  "kit",
  "travel",
  "equipment",
  "event",
  "refund",
  "other",
];

export function deriveTeamLedgerBalance(
  entries: Pick<TeamLedgerEntry, "direction" | "amount" | "status">[],
): { totalIn: number; totalOut: number; balance: number } {
  let totalIn = 0;
  let totalOut = 0;
  for (const entry of entries) {
    if (entry.status && entry.status !== "approved") continue;
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (entry.direction === "in") totalIn += amount;
    else totalOut += amount;
  }
  return {
    totalIn: roundMoney(totalIn),
    totalOut: roundMoney(totalOut),
    balance: roundMoney(totalIn - totalOut),
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatLedgerAmount(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Client UX gate — RLS/RPC remain the authority. Never use for club Payments. */
export function canAccessTeamLedgerUi(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return (
    r === "admin" ||
    r === "club_admin" ||
    r === "trainer" ||
    r === "team_management" ||
    r === "team_staff"
  );
}
