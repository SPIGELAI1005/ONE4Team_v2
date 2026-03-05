interface TelemetryProperties {
  [key: string]: string | number | boolean | null | undefined;
}

interface TelemetryEventPayload {
  event: string;
  timestamp: string;
  appEnv: string;
  properties?: TelemetryProperties;
}

function getAppEnv() {
  return (import.meta.env.VITE_APP_ENV as string | undefined) ?? "unknown";
}

export function trackEvent(event: string, properties?: TelemetryProperties) {
  const payload: TelemetryEventPayload = {
    event,
    timestamp: new Date().toISOString(),
    appEnv: getAppEnv(),
    properties,
  };

  if (typeof window === "undefined") return payload;

  const scopedWindow = window as Window & {
    dataLayer?: TelemetryEventPayload[];
    one4teamTelemetryQueue?: TelemetryEventPayload[];
  };

  scopedWindow.one4teamTelemetryQueue = scopedWindow.one4teamTelemetryQueue ?? [];
  scopedWindow.one4teamTelemetryQueue.push(payload);

  if (Array.isArray(scopedWindow.dataLayer)) scopedWindow.dataLayer.push(payload);

  if (import.meta.env.DEV) console.info("[telemetry]", payload);

  return payload;
}
