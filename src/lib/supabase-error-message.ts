/** Consistent copy for Supabase / PostgREST failures (degraded-mode UX baseline). */
export function supabaseErrorMessage(error: { message?: string } | null | undefined, fallback = "Request failed. Try again."): string {
  const m = error?.message?.trim();
  return m || fallback;
}
