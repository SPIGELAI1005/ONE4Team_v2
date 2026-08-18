import { describe, expect, it } from "vitest";
import {
  buildCalendarIcsFeedUrl,
  getSupabaseFunctionsBaseUrl,
  toWebcalUrl,
} from "./calendar-ics-url";

describe("calendar-ics-url", () => {
  it("builds functions base from project URL", () => {
    expect(getSupabaseFunctionsBaseUrl("https://abc.supabase.co/")).toBe(
      "https://abc.supabase.co/functions/v1",
    );
  });

  it("builds feed URL with encoded token", () => {
    const url = buildCalendarIcsFeedUrl({
      token: "deadbeef",
      supabaseUrl: "https://abc.supabase.co",
    });
    expect(url).toBe("https://abc.supabase.co/functions/v1/calendar-ics?token=deadbeef");
  });

  it("converts https to webcal", () => {
    expect(toWebcalUrl("https://abc.supabase.co/functions/v1/calendar-ics?token=x")).toBe(
      "webcal://abc.supabase.co/functions/v1/calendar-ics?token=x",
    );
  });

  it("returns null when supabase URL missing", () => {
    expect(buildCalendarIcsFeedUrl({ token: "x", supabaseUrl: "" })).toBeNull();
  });
});
