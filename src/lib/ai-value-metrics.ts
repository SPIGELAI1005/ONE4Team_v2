import { supabase } from "@/integrations/supabase/client";

export interface AiValueMetrics {
  proposed: number;
  executed: number;
  failed: number;
  declined: number;
  expired: number;
  total: number;
  topIntents: Array<{ intent: string; count: number }>;
  tokensMetered: false;
}

const DECLINED = new Set(["declined", "rejected", "cancelled", "canceled"]);
const EXECUTED = new Set(["executed", "completed", "confirmed", "success"]);
const FAILED = new Set(["failed", "error"]);
const EXPIRED = new Set(["expired"]);
const PROPOSED = new Set(["proposed", "pending", "awaiting_confirmation", "draft"]);

export async function fetchClubAiValueMetrics(
  clubId: string,
  fromIso: string,
  toIso: string,
): Promise<AiValueMetrics> {
  const { data, error } = await supabase
    .from("ai_agent_runs")
    .select("status, intent")
    .eq("club_id", clubId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .limit(2000);

  if (error) throw error;

  let proposed = 0;
  let executed = 0;
  let failed = 0;
  let declined = 0;
  let expired = 0;
  const intentCounts = new Map<string, number>();

  for (const row of data || []) {
    const status = String(row.status || "").toLowerCase();
    const intent = String(row.intent || "unknown");
    intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);

    if (EXECUTED.has(status)) executed += 1;
    else if (FAILED.has(status)) failed += 1;
    else if (DECLINED.has(status)) declined += 1;
    else if (EXPIRED.has(status)) expired += 1;
    else if (PROPOSED.has(status) || status) proposed += 1;
  }

  const topIntents = [...intentCounts.entries()]
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    proposed,
    executed,
    failed,
    declined,
    expired,
    total: (data || []).length,
    topIntents,
    tokensMetered: false,
  };
}
