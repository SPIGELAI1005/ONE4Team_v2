import { describe, expect, it } from "vitest";
import {
  buildWeeklyDigestPlainText,
  formatDigestMoney,
  type MemberWeeklyDigestData,
} from "@/lib/weekly-digest";

const sampleDigest: MemberWeeklyDigestData = {
  clubName: "TSV Allach 09",
  recipientName: "Alex",
  language: "en",
  scheduleItems: [
    { title: "U12 Training", startsAt: "2026-07-20T18:00:00.000Z", type: "training" },
  ],
  openDues: [
    { id: "d1", dueDate: "2026-08-01", amountCents: 12000, currency: "EUR", status: "due" },
  ],
};

describe("weekly-digest helpers", () => {
  it("formats money for EN and DE", () => {
    expect(formatDigestMoney(12000, "EUR", "en")).toContain("120");
    expect(formatDigestMoney(null, "EUR", "de")).toBe("Betrag offen");
  });

  it("builds plain-text digest with schedule and dues", () => {
    const text = buildWeeklyDigestPlainText(sampleDigest);
    expect(text).toContain("TSV Allach 09");
    expect(text).toContain("U12 Training");
    expect(text).toContain("Open dues");
  });

  it("builds German digest copy", () => {
    const text = buildWeeklyDigestPlainText({ ...sampleDigest, language: "de" });
    expect(text).toContain("Wochenübersicht");
    expect(text).toContain("Offene Beiträge");
  });
});
