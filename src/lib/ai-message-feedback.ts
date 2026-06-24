import { supabase } from "@/integrations/supabase/client";

export type AiMessageFeedbackRating = -1 | 1;

export interface SubmitAiMessageFeedbackInput {
  clubId: string;
  conversationId: string | null;
  messageIndex: number;
  rating: AiMessageFeedbackRating;
  assistantExcerpt?: string;
  note?: string;
}

export async function submitAiMessageFeedback(input: SubmitAiMessageFeedbackInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_signed_in");

  const row = {
    club_id: input.clubId,
    user_id: user.id,
    conversation_id: input.conversationId,
    message_index: input.messageIndex,
    rating: input.rating,
    assistant_excerpt: input.assistantExcerpt?.slice(0, 500) ?? null,
    note: input.note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("ai_message_feedback").upsert(row, {
    onConflict: "user_id,conversation_id,message_index",
  });

  if (error) throw error;
}

export async function fetchAiMessageFeedbackMap(
  conversationId: string | null,
): Promise<Record<number, AiMessageFeedbackRating>> {
  if (!conversationId) return {};

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("ai_message_feedback")
    .select("message_index, rating")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error || !data) return {};

  const map: Record<number, AiMessageFeedbackRating> = {};
  for (const row of data) {
    const rating = row.rating as number;
    if (rating === -1 || rating === 1) {
      map[row.message_index] = rating;
    }
  }
  return map;
}
