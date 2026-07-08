import { describe, expect, it } from "vitest";
import {
  formatUsageEventLabel,
  formatUsageEventName,
  operatorSeverityBadgeVariant,
  operatorStatusBadgeVariant,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/operator-formatters";

describe("operator formatters", () => {
  it("formats usage event names consistently", () => {
    expect(formatUsageEventName("module_opened")).toBe("Module Opened");
    expect(formatUsageEventLabel("module_opened")).toBe("Module Opened");
  });

  it("builds inclusive date range ISO values", () => {
    expect(toStartOfDayIso("2026-07-08")).toMatch(/2026-07-0[78]/);
    expect(toEndOfDayIso("2026-07-08")).toMatch(/2026-07-0[89]/);
  });

  it("maps status and severity labels to badge variants", () => {
    expect(operatorStatusBadgeVariant("ACTIVE")).toBe("default");
    expect(operatorStatusBadgeVariant("SUSPENDED")).toBe("destructive");
    expect(operatorSeverityBadgeVariant("high")).toBe("destructive");
    expect(operatorSeverityBadgeVariant("low")).toBe("outline");
  });
});
