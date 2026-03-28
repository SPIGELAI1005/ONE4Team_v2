import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type MemberAuditDetail = Record<string, unknown>;

/** Best-effort audit log; failures are non-blocking for the main UX. */
export async function appendMemberAuditEvent(params: {
  clubId: string;
  membershipId?: string | null;
  correlationEmail?: string | null;
  draftId?: string | null;
  eventType: string;
  summary?: string | null;
  detail?: MemberAuditDetail;
}): Promise<void> {
  const { error } = await supabase.rpc("append_club_member_audit_event", {
    _club_id: params.clubId,
    _membership_id: params.membershipId ?? null,
    _correlation_email: params.correlationEmail?.trim() || null,
    _draft_id: params.draftId ?? null,
    _event_type: params.eventType,
    _summary: params.summary ?? null,
    _detail: (params.detail ?? {}) as Json,
  });
  if (error) {
    console.warn("[member-audit]", error.message);
  }
}
