import { describe, expect, it } from "vitest";
import { canAccessTeamLedgerUi, deriveTeamLedgerBalance, roundMoney } from "@/lib/team-ledger";

describe("team-ledger", () => {
  it("derives balance from entries", () => {
    expect(
      deriveTeamLedgerBalance([
        { direction: "in", amount: 50 },
        { direction: "in", amount: 20.5 },
        { direction: "out", amount: 15 },
      ]),
    ).toEqual({ totalIn: 70.5, totalOut: 15, balance: 55.5 });
  });

  it("ignores pending and rejected entries in balance", () => {
    expect(
      deriveTeamLedgerBalance([
        { direction: "in", amount: 100, status: "approved" },
        { direction: "in", amount: 40, status: "pending" },
        { direction: "out", amount: 10, status: "rejected" },
      ]),
    ).toEqual({ totalIn: 100, totalOut: 0, balance: 100 });
  });

  it("rounds money safely", () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });

  it("gates team ledger UX away from parents/players", () => {
    expect(canAccessTeamLedgerUi("trainer")).toBe(true);
    expect(canAccessTeamLedgerUi("team_management")).toBe(true);
    expect(canAccessTeamLedgerUi("player")).toBe(false);
    expect(canAccessTeamLedgerUi("parent_supporter")).toBe(false);
  });
});
