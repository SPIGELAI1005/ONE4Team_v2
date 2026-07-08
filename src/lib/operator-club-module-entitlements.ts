import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { OperatorClubDetailModule } from "@/lib/operator-club-detail";

export type OperatorModuleEntitlementSource =
  | "MANUAL_OVERRIDE"
  | "TRIAL"
  | "PROMOTION"
  | "SUPPORT"
  | "SYSTEM";

export interface SetOperatorClubModuleEntitlementInput {
  clubId: string;
  moduleId: string;
  enabled: boolean;
  source: OperatorModuleEntitlementSource;
  reason: string;
  validUntil?: string | null;
}

export const OPERATOR_MODULE_ENTITLEMENT_SOURCES: readonly {
  value: OperatorModuleEntitlementSource;
  label: string;
}[] = [
  { value: "MANUAL_OVERRIDE", label: "Manual Override" },
  { value: "TRIAL", label: "Trial" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "SUPPORT", label: "Support" },
  { value: "SYSTEM", label: "System" },
] as const;

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

export function formatModuleSourceLabel(source: string): string {
  const match = OPERATOR_MODULE_ENTITLEMENT_SOURCES.find((item) => item.value === source);
  if (match) return match.label;
  if (source === "PLAN") return "Plan";
  return source.replaceAll("_", " ");
}

export async function setOperatorClubModuleEntitlement(
  input: SetOperatorClubModuleEntitlementInput,
): Promise<OperatorClubDetailModule> {
  const { data, error } = await supabaseDynamic.rpc("set_operator_club_module_entitlement", {
    _club_id: input.clubId,
    _module_id: input.moduleId,
    _enabled: input.enabled,
    _source: input.source,
    _reason: input.reason.trim(),
    _valid_until: input.validUntil ?? null,
  });
  assertNoRpcError(error, "Unable to update club module entitlement.");
  return data as OperatorClubDetailModule;
}
