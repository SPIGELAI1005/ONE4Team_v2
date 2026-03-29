import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

const CORRELATION_STORAGE_KEY = "one4team_correlation_id";

export function initClientObservability(): void {
  if (typeof dsn !== "string" || !dsn.trim()) return;

  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.08 : 1,
  });
}

export function captureExceptionToSentry(error: unknown, context?: Record<string, unknown>): void {
  if (typeof dsn !== "string" || !dsn.trim()) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** New id per session tab; stable for correlating client errors with Edge logs when propagated. */
export function getOrCreateSessionCorrelationId(): string {
  if (typeof sessionStorage === "undefined") {
    return crypto.randomUUID();
  }
  const existing = sessionStorage.getItem(CORRELATION_STORAGE_KEY);
  if (existing && existing.length >= 8) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(CORRELATION_STORAGE_KEY, id);
  return id;
}

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

/** Attach to manual fetch / Edge invokes (paired with `x-correlation-id` on functions). */
export function correlationHeaders(): Record<string, string> {
  return { "x-correlation-id": getOrCreateSessionCorrelationId() };
}

export function setSentryCorrelationScope(tags: Record<string, string>): void {
  if (typeof dsn !== "string" || !dsn.trim()) return;
  Sentry.setTags(tags);
}
