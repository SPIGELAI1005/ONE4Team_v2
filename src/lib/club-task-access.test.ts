import { describe, expect, it } from "vitest";

import {
  buildTaskAccessFromGateRole,
  canBrowseAllClubTasks,
  filterClubTasksForUser,
  isClubTaskVisibleToUser,
} from "@/lib/club-task-access";

const rows = [
  { id: "1", assignee_user_id: "user-a", team_id: "team-1", created_by: "admin" },
  { id: "2", assignee_user_id: "user-b", team_id: "team-1", created_by: "admin" },
  { id: "3", assignee_user_id: null, team_id: "team-1", created_by: "admin" },
  { id: "4", assignee_user_id: null, team_id: "team-2", created_by: "admin" },
];

describe("club-task-access", () => {
  it("shows all tasks to club admin persona", () => {
    const access = buildTaskAccessFromGateRole("club_admin", "user-a", []);
    expect(canBrowseAllClubTasks(access)).toBe(true);
    expect(filterClubTasksForUser(rows, access)).toHaveLength(4);
  });

  it("limits player persona to assigned tasks only", () => {
    const access = buildTaskAccessFromGateRole("player", "user-a", ["team-1"]);
    expect(canBrowseAllClubTasks(access)).toBe(false);
    const visible = filterClubTasksForUser(rows, access);
    expect(visible.map((r) => r.id)).toEqual(["1"]);
  });

  it("limits dual-role admin viewing as player to own tasks", () => {
    const access = buildTaskAccessFromGateRole("player", "user-a", ["team-1"]);
    expect(isClubTaskVisibleToUser(rows[2], access)).toBe(false);
    expect(filterClubTasksForUser(rows, access).map((r) => r.id)).toEqual(["1"]);
  });

  it("shows team tasks to trainer persona for coached teams", () => {
    const access = buildTaskAccessFromGateRole("trainer", "coach-1", ["team-1"]);
    const visible = filterClubTasksForUser(rows, access);
    expect(visible.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("team_staff assigned scope only sees tasks assigned to them", () => {
    const access = buildTaskAccessFromGateRole("team_staff", "user-b", ["team-1"]);
    const visible = filterClubTasksForUser(rows, access);
    expect(visible.map((r) => r.id)).toEqual(["2"]);
  });
});
