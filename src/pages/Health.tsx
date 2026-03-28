import { useEffect, useState } from "react";

interface HealthPayload {
  status: "live" | "ready" | "degraded";
  timestamp: string;
  checks: {
    spa: "ok";
    supabaseAuth?: "ok" | "fail" | "skipped";
  };
}

export default function Health() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base: HealthPayload = {
      status: "live",
      timestamp: new Date().toISOString(),
      checks: { spa: "ok", supabaseAuth: "skipped" },
    };

    const url = import.meta.env.VITE_SUPABASE_URL;
    if (typeof url !== "string" || !url.trim()) {
      setPayload({ ...base, status: "degraded", checks: { spa: "ok", supabaseAuth: "skipped" } });
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 8_000);

    void (async () => {
      try {
        const healthUrl = `${url.replace(/\/+$/, "")}/auth/v1/health`;
        const res = await fetch(healthUrl, { method: "GET", signal: controller.signal });
        window.clearTimeout(t);
        const authOk = res.ok;
        setPayload({
          status: authOk ? "ready" : "degraded",
          timestamp: new Date().toISOString(),
          checks: { spa: "ok", supabaseAuth: authOk ? "ok" : "fail" },
        });
      } catch {
        window.clearTimeout(t);
        setError("Readiness probe failed (timeout or network).");
        setPayload({
          status: "degraded",
          timestamp: new Date().toISOString(),
          checks: { spa: "ok", supabaseAuth: "fail" },
        });
      }
    })();

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
        <div className="font-display font-bold text-foreground">Health</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Liveness is always served by this SPA route. Readiness probes Supabase Auth (public{" "}
          <code className="text-[10px]">/auth/v1/health</code>) when <code className="text-[10px]">VITE_SUPABASE_URL</code>{" "}
          is set — no secrets returned.
        </div>
        {error ? (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">{error}</p>
        ) : null}
        <pre className="mt-4 text-[11px] text-muted-foreground whitespace-pre-wrap">
          {payload ? JSON.stringify(payload, null, 2) : "Loading…"}
        </pre>
      </div>
    </div>
  );
}
