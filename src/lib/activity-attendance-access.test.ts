import { describe, expect, it } from "vitest";
import {
  canAccessClubFinance,
  canManageAttendance,
  canRespondAttendanceGuardian,
  canRespondAttendanceSelf,
  canViewAttendanceAnalytics,
  hasAttendanceCapability,
} from "@/lib/activity-attendance-access";

describe("activity-attendance-access", () => {
  it("denies club finance for team_management and trainer", () => {
    expect(canAccessClubFinance("team_management")).toBe(false);
    expect(canAccessClubFinance("trainer")).toBe(false);
    expect(canAccessClubFinance("player")).toBe(false);
    expect(canAccessClubFinance("club_admin")).toBe(true);
    expect(canAccessClubFinance("admin")).toBe(true);
  });

  it("allows self RSVP for sports personas but not fans", () => {
    expect(canRespondAttendanceSelf("player")).toBe(true);
    expect(canRespondAttendanceSelf("parent_supporter")).toBe(true);
    expect(canRespondAttendanceSelf("member")).toBe(true);
    expect(canRespondAttendanceSelf("fan")).toBe(false);
    expect(canRespondAttendanceSelf("sponsor")).toBe(false);
  });

  it("allows guardian RSVP UX for parents and household-capable roles", () => {
    expect(canRespondAttendanceGuardian("parent_supporter")).toBe(true);
    expect(canRespondAttendanceGuardian("member")).toBe(true);
    expect(canRespondAttendanceGuardian("player")).toBe(false);
    expect(canRespondAttendanceGuardian("trainer")).toBe(false);
  });

  it("allows trainers and team management to manage attendance", () => {
    expect(canManageAttendance("trainer")).toBe(true);
    expect(canManageAttendance("team_management")).toBe(true);
    expect(canManageAttendance("club_admin")).toBe(true);
    expect(canManageAttendance("player")).toBe(false);
    expect(canManageAttendance("member")).toBe(false);
    expect(canManageAttendance("parent_supporter")).toBe(false);
  });

  it("maps capability helper", () => {
    expect(hasAttendanceCapability("trainer", "manage")).toBe(true);
    expect(hasAttendanceCapability("player", "respond_self")).toBe(true);
    expect(hasAttendanceCapability("team_management", "analytics")).toBe(true);
    expect(canViewAttendanceAnalytics("player")).toBe(false);
  });
});
