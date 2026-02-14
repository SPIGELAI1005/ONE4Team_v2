import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ClipboardList, Shield, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// v1: deterministic, local stub generator that still logs to ai_requests.
// Later: swap generator to an Edge Function / server-side model call.

type ActivityRow = {
  id: string;
  club_id: string;
  type: string;
  title: string;
  starts_at: string;
};

type AiRequestKind = "training_plan" | "admin_digest";

type AiRequestRow = {
  id: string;
  club_id: string;
  user_id: string;
  kind: AiRequestKind;
  input: unknown;
  output: unknown;
  model: string | null;
  created_at: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function AI() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [duesUnpaid, setDuesUnpaid] = useState<number | null>(null);
  const [aiLog, setAiLog] = useState<AiRequestRow[]>([]);

  const [busy, setBusy] = useState<AiRequestKind | null>(null);
  const [outputText, setOutputText] = useState<string>("");

  const canSeeLog = perms.isTrainer;

  const fetchData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      const from = startOfDay(new Date());
      const to = addDays(from, 7);

      const { data: acts, error: actsErr } = await supabase
        .from("activities")
        .select("id, club_id, type, title, starts_at")
        .eq("club_id", clubId)
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at", { ascending: true })
        .limit(100);

      if (actsErr) throw actsErr;
      setActivities((acts as unknown as ActivityRow[]) ?? []);

      // Dues unpaid count (best-effort; for non-admin members it will be null due to RLS)
      const { data: dues, error: duesErr } = await supabase
        .from("membership_dues")
        .select("id, status")
        .eq("club_id", clubId)
        .eq("status", "due")
        .limit(1000);

      if (duesErr) {
        setDuesUnpaid(null);
      } else {
        setDuesUnpaid((dues ?? []).length);
      }

      if (canSeeLog) {
        const { data: log, error: logErr } = await supabase
          .from("ai_requests")
          .select("id, club_id, user_id, kind, input, output, model, created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (logErr) throw logErr;
        setAiLog((log as unknown as AiRequestRow[]) ?? []);
      } else {
        setAiLog([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.ai.failedToLoadInputs;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, canSeeLog, toast, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const upcomingByDay = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const a of activities) {
      const day = fmtDate(new Date(a.starts_at));
      map[day] = map[day] || [];
      map[day].push(a);
    }
    return map;
  }, [activities]);

  const generate = async (kind: AiRequestKind) => {
    if (!user || !clubId) return;

    setBusy(kind);
    try {
      const input = {
        kind,
        range: { from: fmtDate(startOfDay(new Date())), to: fmtDate(addDays(startOfDay(new Date()), 7)) },
        activities: activities.map((a) => ({ id: a.id, type: a.type, title: a.title, starts_at: a.starts_at })),
        dues_unpaid_count: duesUnpaid,
      };

      let text = "";
      if (kind === "training_plan") {
        const days = Object.keys(upcomingByDay).sort();
        const lines: string[] = [];
        lines.push("CO‑TRAINER v1: Weekly plan (stub)\n");
        lines.push("Inputs used:");
        lines.push(`- upcoming activities next 7 days: ${activities.length}`);
        lines.push(duesUnpaid !== null ? `- unpaid dues count (admin view): ${duesUnpaid}` : `- unpaid dues count: (not available)`);
        lines.push("\nPlan:");
        if (days.length === 0) {
          lines.push("- No trainings scheduled. Suggest: add 2 sessions (Tue/Thu) + optional weekend friendly.");
        } else {
          for (const d of days) {
            const items = upcomingByDay[d] || [];
            lines.push(`- ${d}:`);
            for (const it of items) {
              lines.push(`  - ${it.type}: ${it.title} @ ${new Date(it.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
            }
            lines.push("  - Focus: warm-up 10m, technical 20m, tactical 20m, small-sided 20m, cooldown 10m");
          }
        }
        text = lines.join("\n");
      } else {
        const lines: string[] = [];
        lines.push("CO‑AImin v1: Admin digest (stub)\n");
        lines.push("This is a deterministic digest generated locally; it is still logged to ai_requests.");
        lines.push("\nHighlights:");
        lines.push(`- Upcoming activities (7d): ${activities.length}`);
        lines.push(`- Days covered: ${Object.keys(upcomingByDay).length}`);
        if (duesUnpaid !== null) lines.push(`- Unpaid dues: ${duesUnpaid}`);
        lines.push("\nNext actions:");
        lines.push("- Check attendance on upcoming trainings");
        lines.push("- Nudge unpaid members (if admin)\n");
        lines.push("Inputs used (JSON):\n" + safeStringify(input));
        text = lines.join("\n");
      }

      setOutputText(text);

      const output = { text };

      const { error } = await supabase.from("ai_requests").insert({
        club_id: clubId,
        user_id: user.id,
        kind,
        input,
        output,
        model: "stub:v1",
      });

      if (error) throw error;

      toast({ title: t.ai.generated, description: t.ai.savedToRequests });
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.ai.failedToGenerate;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={t.ai.title} subtitle={t.ai.subtitle} />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">{t.ai.selectClub}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center gap-2 font-display font-bold">
                <ClipboardList className="w-5 h-5" /> {t.ai.coTrainer}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.ai.coTrainerDesc}</p>
              <div className="mt-3">
                <Button
                  className="bg-gradient-gold-static text-primary-foreground font-semibold"
                  onClick={() => generate("training_plan")}
                  disabled={busy !== null}
                >
                  {busy === "training_plan" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {t.ai.generatePlan}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center gap-2 font-display font-bold">
                <ScrollText className="w-5 h-5" /> {t.ai.coAImin}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.ai.coAIminDesc}</p>
              <div className="mt-3">
                <Button
                  className="bg-gradient-gold-static text-primary-foreground font-semibold"
                  onClick={() => generate("admin_digest")}
                  disabled={busy !== null}
                >
                  {busy === "admin_digest" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {t.ai.generateDigest}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center gap-2 font-display font-bold">
                <Shield className="w-5 h-5" /> {t.ai.output}
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">
{outputText || t.ai.outputPlaceholder}
              </pre>
            </div>

            {canSeeLog && (
              <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="font-display font-bold">{t.ai.recentRequests}</div>
                <div className="mt-2 grid gap-2">
                  {aiLog.length === 0 ? (
                    <div className="text-xs text-muted-foreground">{t.ai.noRequests}</div>
                  ) : (
                    aiLog.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()} • {r.kind} • {r.model ?? "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-foreground/80">user: {r.user_id.slice(0, 8)}…</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
