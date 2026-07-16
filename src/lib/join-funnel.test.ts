import { describe, expect, it } from "vitest";
import { aggregateJoinFunnelEvents } from "@/lib/join-funnel";

describe("aggregateJoinFunnelEvents", () => {
  it("computes conversion from join views", () => {
    expect(
      aggregateJoinFunnelEvents([
        { event_name: "page_view" },
        { event_name: "join_view" },
        { event_name: "join_view" },
        { event_name: "request_submitted" },
        { event_name: "request_approved" },
      ]),
    ).toEqual({
      pageViews: 1,
      joinViews: 2,
      submitted: 1,
      approved: 1,
      rejected: 0,
      conversionRate: 50,
    });
  });
});
