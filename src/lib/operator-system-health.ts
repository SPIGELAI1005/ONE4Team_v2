import { supabase } from "@/integrations/supabase/client";

export type ProbeStatus = "ok" | "fail" | "unknown" | "skipped";

export interface HealthProbeResult {
  key: string;
  label: string;
  status: ProbeStatus;
  detail: string;
  latencyMs?: number;
}

export interface OperatorSystemHealthReport {
  generatedAt: string;
  probes: HealthProbeResult[];
}

async function probeUrl(
  key: string,
  label: string,
  url: string,
  init?: RequestInit,
): Promise<HealthProbeResult> {
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, method: init?.method || "GET" });
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      return { key, label, status: "ok", detail: `HTTP ${res.status}`, latencyMs };
    }
    return { key, label, status: "fail", detail: `HTTP ${res.status}`, latencyMs };
  } catch (err) {
    return {
      key,
      label,
      status: "fail",
      detail: err instanceof Error ? err.message : "request_failed",
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

function supabaseFunctionsBase(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return null;
  return `${url.replace(/\/+$/, "")}/functions/v1`;
}

/** Client-side operator health probes (no fake connected:true without a real check). */
export async function collectOperatorSystemHealth(): Promise<OperatorSystemHealthReport> {
  const probes: HealthProbeResult[] = [];
  const fnBase = supabaseFunctionsBase();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  // Auth / site URL config
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  probes.push({
    key: "auth_site_url",
    label: "App origin / auth redirects",
    status: siteUrl.startsWith("http") ? "ok" : "fail",
    detail: siteUrl || "missing",
  });

  // Sentry DSN present
  const sentryDsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() || "";
  probes.push({
    key: "sentry",
    label: "Sentry DSN",
    status: sentryDsn ? "ok" : "unknown",
    detail: sentryDsn ? "VITE_SENTRY_DSN configured" : "VITE_SENTRY_DSN not set",
  });

  // Migrations: latest applied via RPC if available, else schema probe
  try {
    const started = performance.now();
    const { data, error } = await supabase.rpc("get_operator_performance_overview");
    const latencyMs = Math.round(performance.now() - started);
    if (error) {
      probes.push({
        key: "migrations_db",
        label: "Database / operator RPCs",
        status: "fail",
        detail: error.message,
        latencyMs,
      });
    } else {
      const overview = data as { metrics?: { database_response_ms?: { value?: number } } } | null;
      const dbMs = overview?.metrics?.database_response_ms?.value;
      probes.push({
        key: "migrations_db",
        label: "Database / operator RPCs",
        status: "ok",
        detail:
          typeof dbMs === "number"
            ? `RPC ok · DB ~${Math.round(dbMs)}ms`
            : "get_operator_performance_overview ok",
        latencyMs,
      });
    }
  } catch (err) {
    probes.push({
      key: "migrations_db",
      label: "Database / operator RPCs",
      status: "fail",
      detail: err instanceof Error ? err.message : "rpc_failed",
    });
  }

  if (fnBase && anon) {
    const headers = { apikey: anon, Authorization: `Bearer ${anon}` };
    probes.push(
      await probeUrl("edge_health", "Edge: health", `${fnBase}/health`, { headers }),
    );
    probes.push(
      await probeUrl("edge_chat_bridge", "Edge: chat-bridge", `${fnBase}/chat-bridge`, {
        headers,
      }),
    );
    // stripe-webhook typically rejects unsigned GET — treat 4xx as "reachable"
    const stripeProbe = await probeUrl(
      "edge_stripe_webhook",
      "Edge: stripe-webhook",
      `${fnBase}/stripe-webhook`,
      { headers, method: "GET" },
    );
    if (stripeProbe.status === "fail" && /HTTP 4\d\d/.test(stripeProbe.detail)) {
      probes.push({
        ...stripeProbe,
        status: "ok",
        detail: `${stripeProbe.detail} (reachable; auth expected)`,
      });
    } else {
      probes.push(stripeProbe);
    }
  } else {
    probes.push({
      key: "edge_health",
      label: "Edge Functions",
      status: "skipped",
      detail: "VITE_SUPABASE_URL / ANON_KEY missing",
    });
  }

  // Resend: infer from failed notification / invite delivery if RPC exposes it
  try {
    const { data, error } = await supabase.rpc("get_operator_issues_overview");
    if (!error && data && typeof data === "object") {
      const issues = data as {
        integrations?: { email_delivery?: { connected?: boolean; label?: string } };
        summary?: { failed_invite_delivery_7d?: number | null };
      };
      const email = issues.integrations?.email_delivery;
      const failedInvites = issues.summary?.failed_invite_delivery_7d;
      probes.push({
        key: "resend",
        label: "Email / Resend",
        status: email?.connected ? "ok" : "unknown",
        detail: email?.connected
          ? `connected${failedInvites != null ? ` · failed invites 7d: ${failedInvites}` : ""}`
          : email?.label || "email_delivery not connected in operator overview",
      });
    } else {
      probes.push({
        key: "resend",
        label: "Email / Resend",
        status: "unknown",
        detail: error?.message || "issues overview unavailable",
      });
    }
  } catch (err) {
    probes.push({
      key: "resend",
      label: "Email / Resend",
      status: "fail",
      detail: err instanceof Error ? err.message : "probe_failed",
    });
  }

  // Stripe past_due signal from performance overview
  try {
    const { data } = await supabase.rpc("get_operator_performance_overview");
    const pastDue =
      data && typeof data === "object"
        ? (data as { signals?: { past_due_billing_subscriptions?: number } }).signals
            ?.past_due_billing_subscriptions
        : null;
    probes.push({
      key: "stripe",
      label: "Stripe billing",
      status: typeof pastDue === "number" ? "ok" : "unknown",
      detail:
        typeof pastDue === "number"
          ? `past_due subscriptions: ${pastDue}`
          : "billing signal unavailable",
    });
  } catch {
    probes.push({
      key: "stripe",
      label: "Stripe billing",
      status: "unknown",
      detail: "could not read past_due signal",
    });
  }

  // Cron: process-weekly-digests presence is operator-documented; mark unknown without table
  probes.push({
    key: "cron_weekly_digest",
    label: "Cron: weekly digests",
    status: "unknown",
    detail: "Deploy process-weekly-digests + schedule in Supabase (see HOLD.md)",
  });

  return { generatedAt: new Date().toISOString(), probes };
}
