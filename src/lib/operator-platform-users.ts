import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";
import type { OperatorRole } from "@/lib/operator-permissions";
import { formatOverviewTimestamp } from "@/lib/operator-formatters";

export type PlatformUserStatus = "ACTIVE" | "DISABLED";

export interface PlatformUserRow {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  role: OperatorRole;
  status: PlatformUserStatus;
  created_at: string;
  last_active_at: string;
}

export const PLATFORM_USER_ROLES: readonly OperatorRole[] = ["OWNER", "OPERATOR", "SUPPORT", "VIEWER"] as const;

export async function getPlatformUsers(): Promise<PlatformUserRow[]> {
  const { data, error } = await supabaseDynamic.rpc("get_platform_users");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as PlatformUserRow[];
}

export async function createPlatformUser(input: {
  email: string;
  role: OperatorRole;
  reason: string;
}): Promise<PlatformUserRow> {
  const { data, error } = await supabaseDynamic.rpc("create_platform_user", {
    _email: input.email,
    _role: input.role,
    _reason: input.reason,
  });
  if (error) throw error;
  return data as PlatformUserRow;
}

export async function updatePlatformUserRole(input: {
  platformUserId: string;
  role: OperatorRole;
  reason: string;
}): Promise<void> {
  const { error } = await supabaseDynamic.rpc("update_platform_user_role", {
    _platform_user_id: input.platformUserId,
    _role: input.role,
    _reason: input.reason,
  });
  if (error) throw error;
}

export async function setPlatformUserStatus(input: {
  platformUserId: string;
  status: PlatformUserStatus;
  reason: string;
}): Promise<void> {
  const { error } = await supabaseDynamic.rpc("set_platform_user_status", {
    _platform_user_id: input.platformUserId,
    _status: input.status,
    _reason: input.reason,
  });
  if (error) throw error;
}

export async function invitePlatformUser(input: {
  email: string;
  role: OperatorRole;
  reason: string;
}): Promise<{ ok: boolean; message?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const headers = await getEdgeFunctionAuthHeaders();
  const response = await fetch(`${supabaseUrl}/functions/v1/invite-platform-user`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: input.email,
      role: input.role,
      reason: input.reason,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Platform invite failed.");
  }

  return { ok: Boolean(payload.ok ?? true), message: payload.message };
}

export function formatPlatformUserStatus(status: PlatformUserStatus, t: Translations): string {
  return t.operator.settingsPage.platformUsers.statuses[status];
}

const SETTINGS_ERROR_KEYS = {
  "Reason is required.": "reasonRequired",
  "Platform invite failed.": "inviteFailed",
} as const;

export function localizeSettingsError(message: string, t: Translations): string {
  const key = SETTINGS_ERROR_KEYS[message as keyof typeof SETTINGS_ERROR_KEYS];
  if (key) return t.operator.settingsPage.platformUsers.errors[key];
  return message;
}

export { formatOverviewTimestamp };
