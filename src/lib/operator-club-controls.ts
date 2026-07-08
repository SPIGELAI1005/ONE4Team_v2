import { supabaseDynamic } from "@/lib/supabase-dynamic";

export type OperatorClubLifecycleStatus = "ACTIVE" | "TRIAL" | "PAYING" | "SUSPENDED" | "ARCHIVED";

export const OPERATOR_CLUB_STATUSES: readonly { value: OperatorClubLifecycleStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "Trial" },
  { value: "PAYING", label: "Paying" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export interface OperatorPlanModulePreviewItem {
  key: string;
  name: string;
  source?: string;
}

export interface OperatorClubPlanChangePreview {
  plan_key: string;
  included_by_new_plan: OperatorPlanModulePreviewItem[];
  manually_enabled: OperatorPlanModulePreviewItem[];
  kept_active_not_in_plan: OperatorPlanModulePreviewItem[];
  disabled: OperatorPlanModulePreviewItem[];
}

export async function previewOperatorClubPlanChange(
  clubId: string,
  planKey: string,
): Promise<OperatorClubPlanChangePreview> {
  const { data, error } = await supabaseDynamic.rpc("preview_operator_club_plan_change", {
    _club_id: clubId,
    _plan_key: planKey,
  });
  if (error) throw error;
  return data as OperatorClubPlanChangePreview;
}

export async function setOperatorClubStatus(input: {
  clubId: string;
  status: OperatorClubLifecycleStatus;
  reason: string;
}): Promise<void> {
  const { error } = await supabaseDynamic.rpc("set_operator_club_status", {
    _club_id: input.clubId,
    _status: input.status,
    _reason: input.reason,
  });
  if (error) throw error;
}

export async function setOperatorClubPlan(input: {
  clubId: string;
  planKey: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabaseDynamic.rpc("set_operator_club_plan", {
    _club_id: input.clubId,
    _plan_key: input.planKey,
    _reason: input.reason,
  });
  if (error) throw error;
}

export function formatClubLifecycleStatus(status: string): string {
  const match = OPERATOR_CLUB_STATUSES.find((item) => item.value === status);
  return match?.label ?? status;
}
