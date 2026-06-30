import { describe, expect, it } from "vitest";
import {
  buildPaymentInsertRows,
  effectivePaymentStatus,
  paymentRowKey,
} from "@/lib/member-payments";

describe("member-payments", () => {
  it("marks pending past due as overdue", () => {
    expect(effectivePaymentStatus("pending", "2020-01-01", "2026-06-28")).toBe("overdue");
    expect(effectivePaymentStatus("pending", "2026-12-01", "2026-06-28")).toBe("pending");
  });

  it("builds one row per selected fee type", () => {
    const feeTypesById = new Map([
      [
        "fee-a",
        { id: "fee-a", name: "Youth", amount: 120, currency: "EUR", interval: "yearly", is_active: true },
      ],
      [
        "fee-b",
        { id: "fee-b", name: "Camp", amount: 45, currency: "EUR", interval: "one_time", is_active: true },
      ],
    ]);
    const rows = buildPaymentInsertRows({
      clubId: "club-1",
      membershipId: "mem-1",
      feeTypeIds: ["fee-a", "fee-b"],
      feeTypesById,
      dueDate: "2026-07-01",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].fee_type_id).toBe("fee-a");
    expect(rows[1].amount).toBe(45);
  });

  it("paymentRowKey is stable", () => {
    expect(paymentRowKey("m1", "f1", "2026-01-01")).toBe("m1:f1:2026-01-01");
  });
});
