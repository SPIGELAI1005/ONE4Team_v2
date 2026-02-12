type LogLevel = "debug" | "info" | "warn" | "error";

const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function getLevel(): LogLevel {
  const env = import.meta.env as unknown as { VITE_LOG_LEVEL?: string; DEV?: boolean };
  const raw = env.VITE_LOG_LEVEL;
  const v = (raw || (env.DEV ? "debug" : "info")).toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return "info";
}

const level = getLevel();

export const logger = {
  debug: (...args: unknown[]) => {
    if (order[level] <= order.debug) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (order[level] <= order.info) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (order[level] <= order.warn) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (order[level] <= order.error) console.error(...args);
  },
};
