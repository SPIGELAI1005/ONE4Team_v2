import type {
  ContractStatus,
  InvoiceStatus,
  PartnerTaskRow,
  PartnerTaskStatus,
} from "@/lib/partner-workflow-models";

export const ENGAGEMENT_PIPELINE_STAGES = [
  "quoted",
  "accepted",
  "invoiced",
  "paid",
] as const;

export type EngagementPipelineStage = (typeof ENGAGEMENT_PIPELINE_STAGES)[number];

export interface EngagementTimelineInput {
  taskStatus: PartnerTaskStatus;
  hasContract?: boolean;
  contractStatus?: ContractStatus | null;
  hasInvoice?: boolean;
  invoiceStatus?: InvoiceStatus | null;
  marketplaceOfferId?: string | null;
}

export function deriveEngagementPipelineStage(input: EngagementTimelineInput): EngagementPipelineStage {
  if (input.invoiceStatus === "paid") return "paid";
  if (input.hasInvoice || input.invoiceStatus === "pending" || input.invoiceStatus === "overdue") {
    return "invoiced";
  }
  if (
    input.taskStatus === "in_progress" ||
    input.taskStatus === "done" ||
    input.contractStatus === "active" ||
    input.hasContract
  ) {
    return "accepted";
  }
  return "quoted";
}

export function engagementStageIndex(stage: EngagementPipelineStage): number {
  return ENGAGEMENT_PIPELINE_STAGES.indexOf(stage);
}

export function isMarketplaceSourcedEngagement(
  task: Pick<PartnerTaskRow, "marketplace_offer_id" | "marketplace_request_id">,
): boolean {
  return Boolean(task.marketplace_offer_id || task.marketplace_request_id);
}

export function filterTasksByPipelineStage(
  tasks: PartnerTaskRow[],
  stage: EngagementPipelineStage | "all",
  resolve: (task: PartnerTaskRow) => EngagementTimelineInput,
): PartnerTaskRow[] {
  if (stage === "all") return tasks;
  return tasks.filter((task) => deriveEngagementPipelineStage(resolve(task)) === stage);
}
