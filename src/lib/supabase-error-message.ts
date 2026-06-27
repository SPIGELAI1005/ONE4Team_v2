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

/** True when PostgREST/Supabase reports a missing table, RPC, or column (migration not applied). */
export function isSupabaseMissingResourceError(
  error: { code?: string; message?: string; status?: number } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.status === 404) return true;
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "PGRST204") return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("not found") ||
    msg.includes("schema cache")
  );
}
/** True when the message suggests a transient network or upstream failure (offer retry). */
export function isTransientSupabaseMessage(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  if (!m) return false;
  return transientSubstrings.some((s) => m.includes(s));
}
