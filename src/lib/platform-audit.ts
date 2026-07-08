import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";

export interface PlatformAuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  clubId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PlatformAuditLog {
  id: string;
  actor_user_id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  club_id: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OperatorAuditTrailEntry extends PlatformAuditLog {
  entity_name: string | null;
  club_name: string | null;
  can_view_technical_metadata: boolean;
}

export interface OperatorAuditTrailFilters {
  limit?: number;
  offset?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  actorEmail?: string | null;
  action?: string | null;
  clubId?: string | null;
  entityType?: string | null;
}

export interface OperatorAuditTrailResult {
  entries: OperatorAuditTrailEntry[];
  total: number;
  limit: number;
  offset: number;
  can_view_technical_metadata: boolean;
  facets: {
    actions: string[];
    entity_types: string[];
    actors: string[];
  };
}

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

function getBrowserAuditContext(): Pick<PlatformAuditLogInput, "ipAddress" | "userAgent"> {
  if (typeof navigator === "undefined") {
    return { ipAddress: null, userAgent: null };
  }

  return {
    ipAddress: null,
    userAgent: navigator.userAgent ?? null,
  };
}

async function appendAuditLog(input: PlatformAuditLogInput): Promise<string | null> {
  const { data, error } = await supabaseDynamic.rpc("append_audit_log", {
    _action: input.action,
    _entity_type: input.entityType,
    _entity_id: input.entityId ?? null,
    _club_id: input.clubId ?? null,
    _before_json: input.before ?? null,
    _after_json: input.after ?? null,
    _reason: input.reason ?? null,
    _ip_address: input.ipAddress ?? null,
    _user_agent: input.userAgent ?? null,
  });
  assertNoRpcError(error, "Unable to append platform audit log.");
  return typeof data === "string" ? data : null;
}

export async function createAuditLog(input: PlatformAuditLogInput): Promise<string | null> {
  const context = getBrowserAuditContext();
  return appendAuditLog({
    ...context,
    ...input,
    ipAddress: input.ipAddress ?? context.ipAddress,
    userAgent: input.userAgent ?? context.userAgent,
  });
}

export async function createClubAuditLog(input: {
  action: string;
  clubId: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}): Promise<string | null> {
  return createAuditLog({
    action: input.action,
    entityType: "club",
    entityId: input.entityId ?? input.clubId,
    clubId: input.clubId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
  });
}

export async function createModuleAuditLog(input: {
  action: string;
  moduleId: string;
  clubId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}): Promise<string | null> {
  return createAuditLog({
    action: input.action,
    entityType: input.clubId ? "club_module_entitlement" : "module",
    entityId: input.moduleId,
    clubId: input.clubId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
  });
}

export async function createPlanAuditLog(input: {
  action: string;
  planId: string;
  entityType?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}): Promise<string | null> {
  return createAuditLog({
    action: input.action,
    entityType: input.entityType ?? "plan",
    entityId: input.planId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
  });
}

export async function getOperatorAuditTrail(
  filters: OperatorAuditTrailFilters = {},
): Promise<OperatorAuditTrailResult> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_audit_trail", {
    _limit: filters.limit ?? 100,
    _offset: filters.offset ?? 0,
    _date_from: filters.dateFrom ?? null,
    _date_to: filters.dateTo ?? null,
    _actor_email: filters.actorEmail ?? null,
    _action: filters.action ?? null,
    _club_id: filters.clubId ?? null,
    _entity_type: filters.entityType ?? null,
  });
  assertNoRpcError(error, "Unable to load operator audit trail.");
  return data as OperatorAuditTrailResult;
}

export async function getPlatformAuditLogs(limit = 100): Promise<PlatformAuditLog[]> {
  const result = await getOperatorAuditTrail({ limit });
  return result.entries;
}

export function formatAuditTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAuditJson(value: Record<string, unknown> | null | undefined): string {
  if (!value) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
}

export function formatAuditAction(action: string, t: Translations): string {
  const actions = t.operator.audit.actions;
  if (action in actions) return actions[action as keyof typeof actions];
  return action;
}

export function formatAuditEntityType(entityType: string, t: Translations): string {
  const types = t.operator.audit.entityTypes;
  if (entityType in types) return types[entityType as keyof typeof types];
  return entityType;
}
