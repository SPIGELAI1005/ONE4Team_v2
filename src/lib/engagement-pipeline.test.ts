import { describe, expect, it } from "vitest";
import {
  deriveEngagementPipelineStage,
  filterTasksByPipelineStage,
  isMarketplaceSourcedEngagement,
} from "@/lib/engagement-pipeline";
import type { PartnerTaskRow } from "@/lib/partner-workflow-models";

function task(partial: Partial<PartnerTaskRow> & Pick<PartnerTaskRow, "id">): PartnerTaskRow {
  return {
    club_id: "c1",
    partner_id: "p1",
    contract_id: null,
    title: "Job",
    description: null,
    priority: "normal",
    task_status: "open",
    due_date: null,
    engagement_category: "service",
    related_event_id: null,
    location: null,
    ...partial,
  };
}

describe("deriveEngagementPipelineStage", () => {
  it("maps open task to quoted", () => {
    expect(deriveEngagementPipelineStage({ taskStatus: "open" })).toBe("quoted");
  });

  it("maps active contract to accepted", () => {
    expect(
      deriveEngagementPipelineStage({
        taskStatus: "open",
        hasContract: true,
        contractStatus: "active",
      }),
    ).toBe("accepted");
  });

  it("maps pending invoice to invoiced and paid to paid", () => {
    expect(
      deriveEngagementPipelineStage({
        taskStatus: "in_progress",
        hasInvoice: true,
        invoiceStatus: "pending",
      }),
    ).toBe("invoiced");
    expect(
      deriveEngagementPipelineStage({
        taskStatus: "done",
        invoiceStatus: "paid",
      }),
    ).toBe("paid");
  });
});

describe("filterTasksByPipelineStage", () => {
  it("filters by derived stage", () => {
    const tasks = [
      task({ id: "1", task_status: "open" }),
      task({ id: "2", task_status: "in_progress" }),
    ];
    expect(
      filterTasksByPipelineStage(tasks, "accepted", (t) => ({ taskStatus: t.task_status })).map(
        (t) => t.id,
      ),
    ).toEqual(["2"]);
  });
});

describe("isMarketplaceSourcedEngagement", () => {
  it("detects marketplace ids", () => {
    expect(isMarketplaceSourcedEngagement(task({ id: "1" }))).toBe(false);
    expect(
      isMarketplaceSourcedEngagement(task({ id: "2", marketplace_offer_id: "o1" })),
    ).toBe(true);
  });
});
