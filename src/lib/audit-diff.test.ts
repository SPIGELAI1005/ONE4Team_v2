import { describe, expect, it } from "vitest";
import {
  buildAuditDiffRows,
  formatAuditDiffValue,
  hasAuditDiffChanges,
} from "@/lib/audit-diff";

describe("audit-diff", () => {
  it("flattens nested objects and marks changed keys", () => {
    const rows = buildAuditDiffRows(
      { status: "ACTIVE", plan: { key: "starter" } },
      { status: "SUSPENDED", plan: { key: "starter" } },
    );

    expect(rows.find((row) => row.key === "status")?.changed).toBe(true);
    expect(rows.find((row) => row.key === "plan.key")?.changed).toBe(false);
    expect(hasAuditDiffChanges(rows)).toBe(true);
  });

  it("formats primitive and missing values", () => {
    expect(formatAuditDiffValue(undefined)).toBe("—");
    expect(formatAuditDiffValue("ACTIVE")).toBe("ACTIVE");
    expect(formatAuditDiffValue({ enabled: true })).toContain("enabled");
  });
});
