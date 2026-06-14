import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { ClubExpenseCategory } from "@/lib/club-expense-categories";

export interface ClubExpenseRow {
  id: string;
  expense_date: string;
  category: ClubExpenseCategory;
  amount_cents: number;
  currency: string;
  description: string | null;
  created_at: string;
}

export interface FinancialMonthlyPoint {
  month: string;
  label: string;
  collectedCents: number;
  outstandingCents: number;
  expensesCents: number;
  netCents: number;
}

export interface FeeTypeBreakdownRow {
  name: string;
  collectedCents: number;
}

export interface ExpenseCategoryBreakdownRow {
  category: ClubExpenseCategory;
  amountCents: number;
}

export interface ClubFinancialSnapshot {
  currency: string;
  collectedPaymentsCents: number;
  collectedDuesCents: number;
  collectedShopCents: number;
  collectedTotalCents: number;
  outstandingPaymentsCents: number;
  outstandingDuesCents: number;
  outstandingTotalCents: number;
  overduePaymentCount: number;
  overdueDuesCount: number;
  expensesTotalCents: number;
  netCents: number;
  monthlySeries: FinancialMonthlyPoint[];
  feeTypeBreakdown: FeeTypeBreakdownRow[];
  expenseCategoryBreakdown: ExpenseCategoryBreakdownRow[];
  recentExpenses: ClubExpenseRow[];
  hasShopData: boolean;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || /\brelation\b.*\bdoes not exist\b/i.test(message);
}

export function formatMoneyFromCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

function eurToCents(amount: number): number {
  return Math.round(amount * 100);
}

function monthKeysLast12(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => format(startOfMonth(subMonths(now, 11 - i)), "yyyy-MM"));
}

function monthLabel(key: string): string {
  return format(new Date(`${key}-01T00:00:00`), "MMM yy");
}

function paymentMonthKey(paidAt: string | null, dueDate: string, status: string): string | null {
  if (status === "paid" && paidAt) return format(startOfMonth(new Date(paidAt)), "yyyy-MM");
  if (status === "pending" || status === "overdue") return format(startOfMonth(new Date(`${dueDate}T00:00:00`)), "yyyy-MM");
  return null;
}

export async function fetchClubFinancialSnapshot(clubId: string): Promise<ClubFinancialSnapshot> {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthKeys = monthKeysLast12();
  const seriesMap = Object.fromEntries(
    monthKeys.map((k) => [k, { collectedCents: 0, outstandingCents: 0, expensesCents: 0 }]),
  ) as Record<string, { collectedCents: number; outstandingCents: number; expensesCents: number }>;

  const [paymentsRes, duesRes, expensesRes, feeTypesRes, shopRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, status, due_date, paid_at, fee_type_id, membership_fee_types(name)")
      .eq("club_id", clubId)
      .neq("status", "cancelled"),
    supabase
      .from("membership_dues")
      .select("amount_cents, status, due_date, paid_at")
      .eq("club_id", clubId),
    supabase
      .from("club_expenses")
      .select("id, expense_date, category, amount_cents, currency, description, created_at")
      .eq("club_id", clubId)
      .order("expense_date", { ascending: false })
      .limit(200),
    supabase.from("membership_fee_types").select("id, name").eq("club_id", clubId),
    supabaseDynamic
      .from("shop_orders")
      .select("total_eur, status, ordered_at")
      .eq("club_id", clubId)
      .in("status", ["confirmed", "shipped", "delivered"]) as unknown as Promise<{
      data: { total_eur: number; status: string; ordered_at: string }[] | null;
      error: unknown;
    }>,
  ]);

  let collectedPaymentsCents = 0;
  let outstandingPaymentsCents = 0;
  let overduePaymentCount = 0;
  const feeCollected = new Map<string, number>();
  const feeNameById = new Map<string, string>();
  for (const ft of feeTypesRes.data ?? []) {
    feeNameById.set(String((ft as { id: string }).id), String((ft as { name: string }).name));
  }

  for (const row of paymentsRes.data ?? []) {
    const amountCents = eurToCents(Number((row as { amount: number }).amount) || 0);
    const status = String((row as { status: string }).status);
    const dueDate = String((row as { due_date: string }).due_date);
    const paidAt = (row as { paid_at: string | null }).paid_at;
    const feeTypeId = (row as { fee_type_id: string | null }).fee_type_id;
    const feeJoin = (row as { membership_fee_types: { name: string } | null }).membership_fee_types;
    const feeName = feeJoin?.name || (feeTypeId ? feeNameById.get(feeTypeId) : null) || "Other";

    if (status === "paid") {
      collectedPaymentsCents += amountCents;
      feeCollected.set(feeName, (feeCollected.get(feeName) ?? 0) + amountCents);
      const mk = paidAt ? format(startOfMonth(new Date(paidAt)), "yyyy-MM") : null;
      if (mk && seriesMap[mk]) seriesMap[mk].collectedCents += amountCents;
    } else if (status === "pending" || status === "overdue") {
      outstandingPaymentsCents += amountCents;
      if (status === "overdue" || dueDate < today) overduePaymentCount += 1;
      const mk = paymentMonthKey(paidAt, dueDate, status);
      if (mk && seriesMap[mk]) seriesMap[mk].outstandingCents += amountCents;
    }
  }

  let collectedDuesCents = 0;
  let outstandingDuesCents = 0;
  let overdueDuesCount = 0;
  for (const row of duesRes.data ?? []) {
    const amountCents = Number((row as { amount_cents: number | null }).amount_cents) || 0;
    const status = String((row as { status: string }).status);
    const dueDate = String((row as { due_date: string }).due_date);
    const paidAt = (row as { paid_at: string | null }).paid_at;

    if (status === "paid") {
      collectedDuesCents += amountCents;
      feeCollected.set("Membership dues", (feeCollected.get("Membership dues") ?? 0) + amountCents);
      const mk = paidAt ? format(startOfMonth(new Date(paidAt)), "yyyy-MM") : null;
      if (mk && seriesMap[mk]) seriesMap[mk].collectedCents += amountCents;
    } else if (status === "due") {
      outstandingDuesCents += amountCents;
      if (dueDate < today) overdueDuesCount += 1;
      const mk = format(startOfMonth(new Date(`${dueDate}T00:00:00`)), "yyyy-MM");
      if (seriesMap[mk]) seriesMap[mk].outstandingCents += amountCents;
    }
  }

  let collectedShopCents = 0;
  let hasShopData = false;
  if (!shopRes.error && shopRes.data) {
    hasShopData = shopRes.data.length > 0;
    for (const order of shopRes.data) {
      const cents = eurToCents(Number(order.total_eur) || 0);
      collectedShopCents += cents;
      feeCollected.set("Shop orders", (feeCollected.get("Shop orders") ?? 0) + cents);
      const mk = format(startOfMonth(new Date(order.ordered_at)), "yyyy-MM");
      if (seriesMap[mk]) seriesMap[mk].collectedCents += cents;
    }
  }

  let expensesTotalCents = 0;
  const expenseByCategory = new Map<ClubExpenseCategory, number>();
  const recentExpenses: ClubExpenseRow[] = [];

  if (!expensesRes.error || !isMissingRelationError(expensesRes.error)) {
    for (const row of expensesRes.data ?? []) {
      const expense = row as ClubExpenseRow;
      expensesTotalCents += expense.amount_cents;
      expenseByCategory.set(
        expense.category,
        (expenseByCategory.get(expense.category) ?? 0) + expense.amount_cents,
      );
      const mk = format(startOfMonth(new Date(`${expense.expense_date}T00:00:00`)), "yyyy-MM");
      if (seriesMap[mk]) seriesMap[mk].expensesCents += expense.amount_cents;
      if (recentExpenses.length < 12) recentExpenses.push(expense);
    }
  }

  const collectedTotalCents = collectedPaymentsCents + collectedDuesCents + collectedShopCents;
  const outstandingTotalCents = outstandingPaymentsCents + outstandingDuesCents;
  const netCents = collectedTotalCents - expensesTotalCents;

  const monthlySeries: FinancialMonthlyPoint[] = monthKeys.map((month) => {
    const bucket = seriesMap[month];
    return {
      month,
      label: monthLabel(month),
      collectedCents: bucket.collectedCents,
      outstandingCents: bucket.outstandingCents,
      expensesCents: bucket.expensesCents,
      netCents: bucket.collectedCents - bucket.expensesCents,
    };
  });

  const feeTypeBreakdown = [...feeCollected.entries()]
    .map(([name, collectedCents]) => ({ name, collectedCents }))
    .sort((a, b) => b.collectedCents - a.collectedCents);

  const expenseCategoryBreakdown = [...expenseByCategory.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    currency: "EUR",
    collectedPaymentsCents,
    collectedDuesCents,
    collectedShopCents,
    collectedTotalCents,
    outstandingPaymentsCents,
    outstandingDuesCents,
    outstandingTotalCents,
    overduePaymentCount,
    overdueDuesCount,
    expensesTotalCents,
    netCents,
    monthlySeries,
    feeTypeBreakdown,
    expenseCategoryBreakdown,
    recentExpenses,
    hasShopData,
  };
}

export interface CreateClubExpenseInput {
  clubId: string;
  expenseDate: string;
  category: ClubExpenseCategory;
  amountEur: string;
  description?: string;
}

export async function createClubExpense(input: CreateClubExpenseInput): Promise<{ error: string | null }> {
  const amount = parseFloat(input.amountEur.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Invalid amount" };

  const { error } = await supabase.from("club_expenses").insert({
    club_id: input.clubId,
    expense_date: input.expenseDate,
    category: input.category,
    amount_cents: Math.round(amount * 100),
    currency: "EUR",
    description: input.description?.trim() || null,
  });

  return { error: error?.message ?? null };
}

export async function deleteClubExpense(clubId: string, expenseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("club_expenses")
    .delete()
    .eq("club_id", clubId)
    .eq("id", expenseId);

  return { error: error?.message ?? null };
}

export function exportFinancialCsv(snapshot: ClubFinancialSnapshot): string {
  const lines = [
    "Month,Collected EUR,Outstanding EUR,Expenses EUR,Net EUR",
    ...snapshot.monthlySeries.map(
      (row) =>
        `${row.label},${(row.collectedCents / 100).toFixed(2)},${(row.outstandingCents / 100).toFixed(2)},${(row.expensesCents / 100).toFixed(2)},${(row.netCents / 100).toFixed(2)}`,
    ),
  ];
  return lines.join("\n");
}
