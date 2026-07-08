import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";

export interface PlatformSettingsBundle {
  control_center_defaults?: {
    default_plan_key?: string | null;
    trial_module_keys?: string[];
    support_contact_email?: string | null;
    billing_contact_email?: string | null;
  };
  data_security?: {
    audit_retention_days?: number;
    support_impersonation_enabled?: boolean;
    support_impersonation_requires_reason?: boolean;
  };
  monitoring_connectors?: Record<string, { connected: boolean; label: string }>;
  alert_policies?: {
    notify_on_owner_role_change?: boolean;
    notify_on_club_suspended?: boolean;
    notify_on_failed_invite_spike?: boolean;
    delivery_channel?: string;
  };
}

export async function getPlatformSettings(): Promise<PlatformSettingsBundle> {
  const { data, error } = await supabaseDynamic.rpc("get_platform_settings");
  if (error) throw error;
  return (data ?? {}) as PlatformSettingsBundle;
}

export async function setPlatformSetting(input: {
  key: keyof PlatformSettingsBundle;
  value: Record<string, unknown>;
  reason: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseDynamic.rpc("set_platform_setting", {
    _key: input.key,
    _value: input.value,
    _reason: input.reason,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export interface SupportClubDiagnostics {
  club: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  plan_name: string | null;
  enabled_modules: number;
  member_count: number;
  failed_invites_7d: number;
  open_issues: number;
  public_club_url: string;
}

export interface SupportUserDiagnostics {
  found: boolean;
  email: string;
  user_id?: string;
  display_name?: string;
  profile_updated_at?: string;
  platform_role?: string | null;
  platform_status?: string | null;
  clubs?: Array<{
    club_id: string;
    club_name: string;
    club_slug: string;
    role: string;
    status: string;
    joined_at: string;
  }>;
  recent_invites?: Array<{
    id: string;
    club_id: string;
    club_name: string;
    role: string;
    created_at: string;
    expires_at: string | null;
    used_at: string | null;
    status: string;
  }>;
}

export interface InviteDeliveryCheck {
  email: string;
  club_id: string | null;
  invites: Array<{
    id: string;
    club_id: string;
    club_name: string;
    role: string;
    created_at: string;
    expires_at: string | null;
    used_at: string | null;
    delivery_status: string;
    note: string;
  }>;
  failed_notifications_7d: Array<{
    id: string;
    club_id: string;
    club_name: string;
    status: string;
    last_error: string;
    created_at: string;
  }>;
}

export async function getSupportClubDiagnostics(clubId: string): Promise<SupportClubDiagnostics> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_support_club_diagnostics", {
    _club_id: clubId,
  });
  if (error) throw error;
  return data as SupportClubDiagnostics;
}

export async function getSupportUserDiagnostics(email: string): Promise<SupportUserDiagnostics> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_support_user_diagnostics", {
    _email: email.trim(),
  });
  if (error) throw error;
  return data as SupportUserDiagnostics;
}

export async function checkInviteDelivery(input: {
  email: string;
  clubId?: string | null;
}): Promise<InviteDeliveryCheck> {
  const { data, error } = await supabaseDynamic.rpc("check_operator_invite_delivery", {
    _email: input.email.trim(),
    _club_id: input.clubId ?? null,
  });
  if (error) throw error;
  return data as InviteDeliveryCheck;
}

export async function getMonitoringConnectors(): Promise<Record<string, { connected: boolean; label: string }>> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_monitoring_connectors");
  if (error) throw error;
  return (data ?? {}) as Record<string, { connected: boolean; label: string }>;
}

const INVITE_DELIVERY_NOTE_KEYS = {
  "Email delivery telemetry is not connected yet. Status reflects invite record only.": "telemetryNotConnected",
} as const;

export function formatSupportDeliveryStatus(status: string, t: Translations): string {
  const statuses = t.operator.support.deliveryStatuses;
  const normalized = status.toLowerCase() as keyof typeof statuses;
  if (normalized in statuses) return statuses[normalized];
  return status;
}

export function localizeInviteDeliveryNote(note: string, t: Translations): string {
  const key = INVITE_DELIVERY_NOTE_KEYS[note as keyof typeof INVITE_DELIVERY_NOTE_KEYS];
  if (key) return t.operator.support.inviteNotes[key];
  return note;
}

export function formatSupportPlatformRole(role: string | null | undefined, t: Translations): string {
  if (!role) return t.operator.support.user.none;
  const roles = t.operator.support.platformRoles;
  if (role in roles) return roles[role as keyof typeof roles];
  return role;
}

export function formatSupportPlatformStatus(status: string | null | undefined, t: Translations): string {
  if (!status) return "—";
  const statuses = t.operator.support.platformStatuses;
  if (status in statuses) return statuses[status as keyof typeof statuses];
  return formatSupportGenericStatus(status, t);
}

export function formatSupportGenericStatus(status: string, t: Translations): string {
  const statuses = t.operator.support.statuses;
  if (status in statuses) return statuses[status as keyof typeof statuses];
  const upper = status.toUpperCase();
  if (upper in statuses) return statuses[upper as keyof typeof statuses];
  const lower = status.toLowerCase();
  if (lower in statuses) return statuses[lower as keyof typeof statuses];
  return status;
}

const SUPPORT_ERROR_KEYS = {
  "Club not found": "clubNotFound",
  "Email is required.": "emailRequired",
} as const;

export function localizeSupportError(message: string, t: Translations): string {
  const key = SUPPORT_ERROR_KEYS[message as keyof typeof SUPPORT_ERROR_KEYS];
  if (key) return t.operator.support.errors[key];
  return message;
}

export function formatSupportClubRole(role: string, t: Translations): string {
  const roles = t.operator.support.clubRoles;
  const normalized = role.toLowerCase() as keyof typeof roles;
  if (normalized in roles) return roles[normalized];
  return role;
}

export function localizeMonitoringConnectorLabel(key: string, t: Translations): string {
  const labels = t.operator.settingsPage.dataSecurity.connectorLabels;
  if (key in labels) return labels[key as keyof typeof labels];
  return key;
}
