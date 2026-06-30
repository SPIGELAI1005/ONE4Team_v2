export type PaymentRecordStatus = "pending" | "paid" | "overdue" | "cancelled";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Derive display status: pending past due date counts as overdue. */
export function effectivePaymentStatus(
  status: string,
  dueDate: string,
  today = todayIsoDate(),
): PaymentRecordStatus {
  if (status === "paid" || status === "cancelled") return status;
  if (status === "overdue") return "overdue";
  if (dueDate < today) return "overdue";
  return "pending";
}

export function paymentRowKey(membershipId: string, feeTypeId: string | null, dueDate: string): string {
  return `${membershipId}:${feeTypeId ?? "none"}:${dueDate}`;
}

export interface MembershipFeeTypeRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
}

export function buildPaymentInsertRows(input: {
  clubId: string;
  membershipId: string;
  feeTypeIds: string[];
  feeTypesById: Map<string, MembershipFeeTypeRow>;
  dueDate: string;
  paymentMethod?: string | null;
  notes?: string | null;
  amountOverrideEur?: string;
}): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const override =
    input.amountOverrideEur?.trim() && Number.isFinite(Number(input.amountOverrideEur.replace(",", ".")))
      ? Number(input.amountOverrideEur.replace(",", "."))
      : null;

  for (const feeTypeId of input.feeTypeIds) {
    const fee = input.feeTypesById.get(feeTypeId);
    if (!fee) continue;
    rows.push({
      club_id: input.clubId,
      membership_id: input.membershipId,
      fee_type_id: feeTypeId,
      amount: override ?? Number(fee.amount),
      currency: fee.currency || "EUR",
      status: "pending",
      due_date: input.dueDate,
      payment_method: input.paymentMethod?.trim() || null,
      notes: input.notes?.trim() || null,
    });
  }
  return rows;
}
