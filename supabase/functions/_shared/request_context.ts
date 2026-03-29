/**
 * Correlation IDs for Edge logs (Stripe webhooks, guarded invokes).
 * Prefer client-provided header when safe; otherwise generate a UUID.
 */

const CORR_RE = /^[a-zA-Z0-9\-_.]{8,128}$/;

export function resolveCorrelationId(req: Request): string {
  const raw = req.headers.get("x-correlation-id")?.trim();
  if (raw && CORR_RE.test(raw)) return raw;
  return crypto.randomUUID();
}

export function logStructured(
  level: "info" | "warn" | "error",
  message: string,
  fields: Record<string, unknown>,
): void {
  const payload = JSON.stringify({
    level,
    message,
    ts: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}
