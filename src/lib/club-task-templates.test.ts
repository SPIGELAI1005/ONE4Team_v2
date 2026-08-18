import { describe, expect, it } from "vitest";
import { parseChecklistTitles, starterSlotsForKey, STARTER_TASK_TEMPLATES } from "./club-task-templates";

describe("club-task-templates", () => {
  it("exposes starter presets with checklists", () => {
    expect(STARTER_TASK_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    expect(STARTER_TASK_TEMPLATES.every((t) => t.key && t.title_template)).toBe(true);
  });

  it("parses checklist titles from json array or string", () => {
    expect(parseChecklistTitles(["A", " B "])).toEqual(["A", "B"]);
    expect(parseChecklistTitles('["X","Y"]')).toEqual(["X", "Y"]);
    expect(parseChecklistTitles("one, two; three")).toEqual(["one", "two", "three"]);
  });

  it("returns default slots for known starter keys", () => {
    expect(starterSlotsForKey("matchday_setup")).toBe(2);
    expect(starterSlotsForKey("unknown")).toBeNull();
  });
});
