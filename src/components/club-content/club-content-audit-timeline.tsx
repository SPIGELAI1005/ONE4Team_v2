import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import type { Json } from "@/integrations/supabase/types";

type AuditTimelineRpc = "get_club_public_page_audit_timeline" | "get_club_shop_audit_timeline";

type TimelineRow = {
  id: string;
  event_type: string;
  summary: string | null;
  detail: Json;
  actor_user_id: string | null;
  created_at: string;
};

interface ClubContentAuditTimelineProps {
  clubId: string | null | undefined;
  rpcName: AuditTimelineRpc;
  eventTypeLabels: Record<string, string>;
  title: string;
  intro: string;
  emptyMessage: string;
  migrationHint: string;
}

function formatJsonPreview(detail: Json): string {
  if (detail === null || detail === undefined) return "";
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

export function ClubContentAuditTimeline({
  clubId,
  rpcName,
  eventTypeLabels,
  title,
  intro,
  emptyMessage,
  migrationHint,
}: ClubContentAuditTimelineProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [missingFn, setMissingFn] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const eventMeta = useMemo(
    () =>
      ({
        draft_saved: "text-amber-400 bg-amber-500/10",
        page_published: "text-emerald-400 bg-emerald-500/10",
        page_unpublished: "text-rose-400 bg-rose-500/10",
        product_created: "text-violet-400 bg-violet-500/10",
        product_updated: "text-sky-400 bg-sky-500/10",
        product_deleted: "text-rose-400 bg-rose-500/10",
        category_created: "text-cyan-400 bg-cyan-500/10",
        category_updated: "text-sky-400 bg-sky-500/10",
        category_deleted: "text-muted-foreground bg-muted",
        order_status_updated: "text-orange-400 bg-orange-500/10",
      }) as Record<string, string>,
    [],
  );

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setMissingFn(false);

    const { data: timeline, error } = await supabase.rpc(rpcName, { _club_id: clubId });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("function") && msg.includes("does not exist")) {
        setMissingFn(true);
        setRows([]);
      } else {
        setRows([]);
      }
      setLoading(false);
      return;
    }

    const list = (timeline ?? []) as TimelineRow[];
    setRows(list);

    const actorIds = [...new Set(list.map((r) => r.actor_user_id).filter(Boolean) as string[])];
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", actorIds);
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
        if (p.user_id) map[p.user_id] = p.display_name?.trim() || p.user_id.slice(0, 8);
      }
      setActorNames(map);
    } else {
      setActorNames({});
    }

    setLoading(false);
  }, [clubId, rpcName]);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      setRows([]);
      return;
    }
    void load();
  }, [clubId, load]);

  const eventTypeLabel = useCallback(
    (type: string) => eventTypeLabels[type] ?? type.replace(/_/g, " "),
    [eventTypeLabels],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold tracking-tight text-foreground">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{intro}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : missingFn ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-muted-foreground">
          {migrationHint}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ol className="space-y-3">
          {rows.map((row) => {
            const tone = eventMeta[row.event_type] ?? "text-muted-foreground bg-muted";
            const actorLabel = row.actor_user_id
              ? actorNames[row.actor_user_id] ?? `${t.memberHistoryPage.by} ${row.actor_user_id.slice(0, 8)}`
              : t.memberHistoryPage.unknownActor;
            const expanded = expandedId === row.id;
            const detailText = formatJsonPreview(row.detail);

            return (
              <li
                key={row.id}
                className="rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
                        {eventTypeLabel(row.event_type)}
                      </span>
                      <time className="text-[11px] text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {row.summary?.trim() || eventTypeLabel(row.event_type)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.memberHistoryPage.by} {actorLabel}
                    </p>
                  </div>
                  {detailText ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      {expanded ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          {t.memberHistoryPage.hideDetails}
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3.5 w-3.5" />
                          {t.memberHistoryPage.showDetails}
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
                {expanded && detailText ? (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    {detailText}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
