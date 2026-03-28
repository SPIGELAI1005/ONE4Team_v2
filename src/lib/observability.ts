import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

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
