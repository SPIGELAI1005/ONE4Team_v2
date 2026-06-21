export type AgentIntent =
  | "create_training"
  | "cancel_training"
  | "add_member_draft"
  | "send_club_announcement"
  | "plan_training_week"
  | "notify_trainers";

export type AgentRunStatus =
  | "proposed"
  | "confirmed"
  | "executed"
  | "failed"
  | "cancelled"
  | "expired";

export interface AgentPageContext {
  source?: string;
  entityType?: string;
  entityId?: string;
  teamId?: string;
  teamName?: string;
  extra?: Record<string, unknown>;
}

export interface AgentProposalStep {
  tool: string;
  label: string;
  params: Record<string, unknown>;
}

export interface AgentProposalPayload {
  title: string;
  summary: string;
  steps: AgentProposalStep[];
  warnings?: string[];
}

export interface AgentProposeResponse {
  run_id: string;
  status: AgentRunStatus;
  summary: string;
  proposal: AgentProposalPayload;
  expires_at?: string;
}

export interface AgentInterpretResponse {
  kind: "workflow";
  intent: AgentIntent;
  params: Record<string, unknown>;
  confidence?: number;
}

export interface AgentExecuteResponse {
  run_id: string;
  status: AgentRunStatus;
  result?: {
    steps?: Record<string, unknown>[];
    links?: { label: string; href: string }[];
  };
  idempotent?: boolean;
  error?: string;
}

export interface AgentRunRow {
  id: string;
  club_id: string;
  user_id: string;
  status: AgentRunStatus;
  intent: string;
  proposal: AgentProposalPayload;
  execution_result?: AgentExecuteResponse["result"] | null;
  error_message?: string | null;
  conversation_id?: string | null;
  created_at: string;
  executed_at?: string | null;
}

export interface PlanWeekSessionInput {
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
}
