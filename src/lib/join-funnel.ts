export type JoinFunnelEventName =
  | "page_view"
  | "join_view"
  | "request_submitted"
  | "request_approved"
  | "request_rejected";

export interface JoinFunnelCounts {
  pageViews: number;
  joinViews: number;
  submitted: number;
  approved: number;
  rejected: number;
  conversionRate: number;
}

export const EMPTY_JOIN_FUNNEL_COUNTS: JoinFunnelCounts = {
  pageViews: 0,
  joinViews: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  conversionRate: 0,
};

export function aggregateJoinFunnelEvents(
  events: { event_name: string }[],
): JoinFunnelCounts {
  const counts = { ...EMPTY_JOIN_FUNNEL_COUNTS };
  for (const event of events) {
    if (event.event_name === "page_view") counts.pageViews += 1;
    else if (event.event_name === "join_view") counts.joinViews += 1;
    else if (event.event_name === "request_submitted") counts.submitted += 1;
    else if (event.event_name === "request_approved") counts.approved += 1;
    else if (event.event_name === "request_rejected") counts.rejected += 1;
  }
  const base = counts.joinViews || counts.pageViews;
  counts.conversionRate = base > 0 ? Math.round((counts.submitted / base) * 1000) / 10 : 0;
  return counts;
}
