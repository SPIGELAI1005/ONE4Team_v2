/** Consistent copy for Supabase / PostgREST failures (degraded-mode UX baseline). */
export function supabaseErrorMessage(error: { message?: string } | null | undefined, fallback = "Request failed. Try again."): string {
  const m = error?.message?.trim();
  return m || fallback;
}

const transientSubstrings = [
  "network",
  "fetch",
  "timeout",
  "timed out",
  "failed to fetch",
  "load failed",
  "503",
  "502",
  "504",
];

/** True when the message suggests a transient network or upstream failure (offer retry). */
export function isTransientSupabaseMessage(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  if (!m) return false;
  return transientSubstrings.some((s) => m.includes(s));
}
