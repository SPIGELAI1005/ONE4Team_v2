import type { Translations } from "@/i18n";

export { formatOverviewNumber, formatOverviewTimestamp } from "@/lib/platform-overview";

/** Human-readable label from snake_case usage event names. */
export function formatUsageEventName(eventName: string): string {
  return eventName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** @deprecated Use formatUsageEventName */
export const formatUsageEventLabel = formatUsageEventName;

export function toStartOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

export function toEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export function operatorStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE" || normalized === "active") return "default";
  if (normalized === "SUSPENDED" || normalized === "past_due") return "destructive";
  if (normalized === "DISABLED" || normalized === "cancelled" || normalized === "inactive") return "secondary";
  return "outline";
}

export function operatorSeverityBadgeVariant(
  severity: string,
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = severity.toLowerCase();
  if (normalized.includes("high") || normalized.includes("critical")) return "destructive";
  if (normalized.includes("medium") || normalized.includes("warn")) return "secondary";
  return "outline";
}

export function formatOperatorSeverity(severity: string, t: Translations): string {
  const levels = t.operator.issues.severity;
  const normalized = severity.toLowerCase() as keyof typeof levels;
  if (normalized in levels) return levels[normalized];
  return severity;
}
