export interface MessagePaginationCountInput {
  supabaseCount: number | null;
  rowCount: number;
  page: number;
  visibleCount: number;
  pageSize: number;
}

/** Resolve total message count when Supabase exact count may be null/0 despite returned rows. */
export function resolveMessagePaginationCount(input: MessagePaginationCountInput): number {
  const base = input.supabaseCount ?? 0;
  if (base > 0) return base;
  if (input.rowCount > 0) return Math.max(input.rowCount, input.page === 1 ? input.visibleCount : 0);
  if (input.page === 1 && input.visibleCount > 0) return input.visibleCount;
  return 0;
}

export interface MessagePaginationRange {
  from: number;
  to: number;
  total: number;
}

/** Compute 1-based inclusive range for pagination footer. */
export function messagePaginationRange(
  total: number,
  page: number,
  pageSize: number,
  visibleCount: number,
): MessagePaginationRange {
  const effectiveTotal = Math.max(total, page === 1 ? visibleCount : 0);
  if (effectiveTotal === 0) return { from: 0, to: 0, total: 0 };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, effectiveTotal);
  return { from, to, total: effectiveTotal };
}
