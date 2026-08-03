import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";

export type EditableMemberMasterRow = {
  membership_id: string;
  club_id: string;
  display_name: string | null;
  role: string;
  team_label: string | null;
  email: string | null;
  edit_actor: "self" | "guardian" | "trainer" | "manager";
  relationship: string | null;
};

export type MemberMasterBundle = {
  membership_id: string;
  club_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  team_label: string | null;
  edit_actor: EditableMemberMasterRow["edit_actor"];
  master: Partial<ClubMemberMasterRecord> | null;
};

export async function listEditableMemberMasterMemberships(
  clubId: string,
): Promise<{ data: EditableMemberMasterRow[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("list_editable_member_master_memberships", {
    _club_id: clubId,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data ?? []) as EditableMemberMasterRow[], error: null };
}

export async function getMemberMasterBundle(
  membershipId: string,
): Promise<{ data: MemberMasterBundle | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_member_master_record_for_actor", {
    _membership_id: membershipId,
  });
  if (error) return { data: null, error: new Error(error.message) };
  const row = (data ?? null) as Record<string, unknown> | null;
  if (!row) return { data: null, error: null };
  return {
    data: {
      membership_id: String(row.membership_id),
      club_id: String(row.club_id),
      role: String(row.role ?? "member"),
      display_name: (row.display_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      team_label: (row.team_label as string | null) ?? null,
      edit_actor: row.edit_actor as EditableMemberMasterRow["edit_actor"],
      master: (row.master as Partial<ClubMemberMasterRecord> | null) ?? null,
    },
    error: null,
  };
}

export async function saveMemberMasterRecord(
  membershipId: string,
  fields: Partial<ClubMemberMasterRecord>,
): Promise<{ data: Partial<ClubMemberMasterRecord> | null; error: Error | null; actor?: string }> {
  const { data, error } = await supabase.rpc("save_member_master_record", {
    _membership_id: membershipId,
    _fields: fields as Json,
  });
  if (error) return { data: null, error: new Error(error.message) };
  const payload = (data ?? {}) as { ok?: boolean; actor?: string; record?: Partial<ClubMemberMasterRecord> };
  return {
    data: payload.record ?? null,
    actor: payload.actor,
    error: null,
  };
}
