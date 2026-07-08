import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import {
  formatBytes,
  formatHealthStatus,
  getOperatorIssuesOverview,
  getOperatorPerformanceOverview,
  localizePerformanceStatusDescription,
  localizeIssuesEmailDeliveryHint,
  localizeIssuesIntegrationLabel,
  localizeIssueSource,
} from "@/lib/operator-monitoring";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801160000_operator_performance_issues.sql",
);

describe("operator performance/issues migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines protected overview RPCs for performance and issues pages", () => {
    expect(migration).toContain("create or replace function public.get_operator_performance_overview()");
    expect(migration).toContain("create or replace function public.get_operator_issues_overview()");
    expect(migration).toContain("require_platform_permission('operator.logs.read')");
  });

  it("uses existing platform signals where available", () => {
    expect(migration).toContain("public.abuse_alerts");
    expect(migration).toContain("public.abuse_notification_events");
    expect(migration).toContain("pg_database_size");
  });

  it("keeps external monitoring integrations pluggable", () => {
    expect(migration).toContain("'connected', false");
    expect(migration).toContain("'sentry'");
    expect(migration).toContain("'vercel'");
  });
});

describe("operator monitoring helpers", () => {
  it("formats health and storage values", () => {
    expect(formatHealthStatus("operational", en)).toBe("Operational");
    expect(formatHealthStatus("operational", de)).toBe("Betriebsbereit");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("localizes performance status descriptions from RPC English copy", () => {
    expect(
      localizePerformanceStatusDescription("Core platform signals look healthy.", de),
    ).toBe("Die Kernsignale der Plattform wirken gesund.");
  });

  it("localizes issues integration labels and email hints from RPC English copy", () => {
    expect(localizeIssuesIntegrationLabel("vercel_logs", de)).toBe("Vercel-Logs");
    expect(
      localizeIssuesEmailDeliveryHint(
        "Invite and transactional email delivery monitoring is not connected yet.",
        de,
      ),
    ).toBe("Monitoring für Einladungs- und Transaktions-E-Mail-Zustellung ist noch nicht verbunden.");
    expect(localizeIssueSource("abuse_alerts", de)).toBe("Missbrauchsmeldungen");
  });

  it("exports monitoring data access helpers", () => {
    expect(typeof getOperatorPerformanceOverview).toBe("function");
    expect(typeof getOperatorIssuesOverview).toBe("function");
  });
});
