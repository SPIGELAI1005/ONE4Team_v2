import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { formatOverviewTimestamp } from "@/lib/platform-overview";

export const SUPPORT_NOTE_CATEGORIES = [
  { key: "general", label: "General" },
  { key: "billing", label: "Billing" },
  { key: "technical", label: "Technical" },
  { key: "onboarding", label: "Onboarding" },
  { key: "bug", label: "Bug" },
  { key: "feature_request", label: "Feature Request" },
  { key: "contract", label: "Contract" },
  { key: "pilot", label: "Pilot" },
] as const;

export type SupportNoteCategory = (typeof SUPPORT_NOTE_CATEGORIES)[number]["key"];

export interface OperatorSupportNote {
  id: string;
  club_id: string;
  author_user_id: string;
  author_email: string;
  note: string;
  category: SupportNoteCategory;
  visibility: "internal";
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  can_archive: boolean;
}

export interface OperatorSupportNotesResult {
  notes: OperatorSupportNote[];
  can_create: boolean;
  can_view_archived: boolean;
}

export function formatSupportNoteCategory(category: string): string {
  return SUPPORT_NOTE_CATEGORIES.find((item) => item.key === category)?.label ?? category;
}

export function categoryBadgeVariant(category: string): "default" | "secondary" | "destructive" | "outline" {
  if (category === "bug") return "destructive";
  if (category === "billing" || category === "contract") return "secondary";
  return "outline";
}

export async function getOperatorClubSupportNotes(input: {
  clubId: string;
  category?: string | null;
  includeArchived?: boolean;
}): Promise<OperatorSupportNotesResult> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_club_support_notes", {
    _club_id: input.clubId,
    _category: input.category ?? null,
    _include_archived: input.includeArchived ?? false,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Support notes response was empty.");
  }

  return data as OperatorSupportNotesResult;
}

export async function createOperatorSupportNote(input: {
  clubId: string;
  note: string;
  category: SupportNoteCategory;
}): Promise<OperatorSupportNote> {
  const { data, error } = await supabaseDynamic.rpc("create_operator_support_note", {
    _club_id: input.clubId,
    _note: input.note,
    _category: input.category,
    _visibility: "internal",
  });

  if (error) throw error;
  return data as OperatorSupportNote;
}

export async function updateOperatorSupportNote(input: {
  noteId: string;
  note: string;
  category: SupportNoteCategory;
}): Promise<OperatorSupportNote> {
  const { data, error } = await supabaseDynamic.rpc("update_operator_support_note", {
    _note_id: input.noteId,
    _note: input.note,
    _category: input.category,
  });

  if (error) throw error;
  return data as OperatorSupportNote;
}

export async function archiveOperatorSupportNote(noteId: string): Promise<{ id: string; is_archived: boolean }> {
  const { data, error } = await supabaseDynamic.rpc("archive_operator_support_note", {
    _note_id: noteId,
  });

  if (error) throw error;
  return data as { id: string; is_archived: boolean };
}

export { formatOverviewTimestamp };
