import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Copy, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCalendarSubscription,
  listCalendarSubscriptions,
  revokeCalendarSubscription,
  type CalendarSubscriptionRow,
} from "@/lib/activity-guests-calendar-api";
import { buildCalendarIcsFeedUrl, toWebcalUrl } from "@/lib/calendar-ics-url";

interface CalendarSubscriptionCardProps {
  clubId: string;
  labels: {
    title: string;
    subtitle: string;
    create: string;
    copy: string;
    copyWebcal: string;
    created: string;
    failed: string;
    tokenHint: string;
    feedUrlLabel: string;
    activeFeeds: string;
    revoke: string;
    revoked: string;
    emptyFeeds: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

export function CalendarSubscriptionCard({ clubId, labels, onToast }: CalendarSubscriptionCardProps) {
  const [busy, setBusy] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<CalendarSubscriptionRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await listCalendarSubscriptions(clubId);
    if (error) {
      setRows([]);
    } else {
      setRows(data);
    }
    setLoadingList(false);
  }, [clubId]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  async function handleCreate() {
    setBusy(true);
    const result = await createCalendarSubscription({ clubId, scope: "self" });
    setBusy(false);
    if (result.error || !result.token) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    const url = buildCalendarIcsFeedUrl({ token: result.token });
    if (!url) {
      onToast({
        title: labels.failed,
        description: "Missing VITE_SUPABASE_URL",
        variant: "destructive",
      });
      return;
    }
    setFeedUrl(url);
    onToast({ title: labels.created, description: labels.tokenHint });
    await reloadList();
  }

  async function handleCopy(url: string, webcal = false) {
    const text = webcal ? toWebcalUrl(url) : url;
    await navigator.clipboard.writeText(text);
    onToast({ title: webcal ? labels.copyWebcal : labels.copy });
  }

  async function handleRevoke(id: string) {
    setBusy(true);
    const result = await revokeCalendarSubscription(id);
    setBusy(false);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    if (feedUrl) setFeedUrl(null);
    onToast({ title: labels.revoked });
    await reloadList();
  }

  return (
    <div className="mt-4 rounded-3xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <CalendarRange className="mt-0.5 h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{labels.title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{labels.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-xl" disabled={busy} onClick={() => void handleCreate()}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {labels.create}
            </Button>
            {feedUrl ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void handleCopy(feedUrl, false)}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  {labels.copy}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void handleCopy(feedUrl, true)}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  {labels.copyWebcal}
                </Button>
              </>
            ) : null}
          </div>
          {feedUrl ? (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {labels.feedUrlLabel}
              </p>
              <p className="break-all rounded-xl bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                {feedUrl}
              </p>
            </div>
          ) : null}

          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="text-[11px] font-medium text-foreground">{labels.activeFeeds}</p>
            {loadingList ? (
              <p className="mt-2 text-xs text-muted-foreground">…</p>
            ) : rows.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{labels.emptyFeeds}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-2.5 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {row.label || row.scope}
                      {row.last_accessed_at
                        ? ` · ${new Date(row.last_accessed_at).toLocaleDateString()}`
                        : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 rounded-lg px-2 text-destructive"
                      disabled={busy}
                      onClick={() => void handleRevoke(row.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {labels.revoke}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
