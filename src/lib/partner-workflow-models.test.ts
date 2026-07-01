import { describe, expect, it } from "vitest";
import {
  isContractExpiringSoon,
  isPartnerTaskOpen,
  isPartnerTaskOverdue,
} from "@/lib/partner-workflow-models";

describe("partner-workflow-models", () => {
  it("detects open partner task statuses", () => {
    expect(isPartnerTaskOpen("open")).toBe(true);
    expect(isPartnerTaskOpen("in_progress")).toBe(true);
    expect(isPartnerTaskOpen("done")).toBe(false);
  });

  it("detects overdue open tasks", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString().slice(0, 10);
    expect(isPartnerTaskOverdue(iso, "open")).toBe(true);
    expect(isPartnerTaskOverdue(iso, "done")).toBe(false);
  });

  it("detects contracts expiring within 45 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    expect(isContractExpiringSoon(null, soon.toISOString().slice(0, 10))).toBe(true);
    expect(isContractExpiringSoon(null, null)).toBe(false);
  });
});
