import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { JoinFunnelEventName } from "@/lib/join-funnel";
import { trackEvent } from "@/lib/telemetry";

/** Persist funnel event for club admin analytics (best-effort). */
export async function trackJoinFunnelEvent(input: {
  clubId: string;
  eventName: JoinFunnelEventName;
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  trackEvent(`club_join_funnel_${input.eventName}`, {
    clubId: input.clubId,
    path: input.path ?? null,
  });
  try {
    await supabaseDynamic.from("club_join_funnel_events").insert({
      club_id: input.clubId,
      event_name: input.eventName,
      path: input.path ?? null,
      metadata_json: input.metadata ?? {},
    });
  } catch {
    // ignore if table missing / RLS blocks anon until migration applied
  }
}
