import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  duplicateReviewEntryKey,
  type MemberDuplicateReviewSource,
} from "@/lib/member-duplicate-review";

export async function listDuplicateReviewClearances(clubId: string): Promise<{
  keys: Set<string>;
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("member_duplicate_review_clearances")
    .select("source, entity_id")
    .eq("club_id", clubId);

  const error = (result as { error?: { message?: string } | null }).error;
  const rows = (result as { data?: Array<{ source: string; entity_id: string }> }).data ?? [];
  if (error) return { keys: new Set(), error: new Error(error.message || "load_failed") };

  const keys = new Set<string>();
  for (const row of rows) {
    if (row.source === "roster" || row.source === "draft") {
      keys.add(duplicateReviewEntryKey(row.source, row.entity_id));
    }
  }
  return { keys, error: null };
}

export async function clearDuplicateReviewEntry(input: {
  clubId: string;
  source: MemberDuplicateReviewSource;
  entityId: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const result = await supabaseDynamic.from("member_duplicate_review_clearances").upsert(
    {
      club_id: input.clubId,
      source: input.source,
      entity_id: input.entityId,
      cleared_at: new Date().toISOString(),
    },
    { onConflict: "club_id,source,entity_id" },
  );

  const error = (result as { error?: { message?: string } | null }).error;
  if (error) return { ok: false, error: error.message || "save_failed" };
  return { ok: true, error: null };
}
