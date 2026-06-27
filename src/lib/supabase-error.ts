export function formatSupabaseError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = String((err as { message?: unknown }).message ?? "").trim();
    if (msg) return msg;
  }
  return "";
}

export function isRlsOrPermissionError(err: unknown): boolean {
  const msg = formatSupabaseError(err).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security") ||
    msg.includes("not authorized")
  );
}
