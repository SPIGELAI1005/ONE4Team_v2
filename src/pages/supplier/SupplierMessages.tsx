import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare, Send, Store } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import { usePartnerThread } from "@/hooks/use-partner-thread";
import { useSupplierCollaborations } from "@/hooks/use-supplier-collaborations";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { cn } from "@/lib/utils";

export default function SupplierMessagesPage() {
  const { t } = useLanguage();
  const sp = t.supplierPortal;
  const { user } = useAuth();
  const { collaborations, loading } = useSupplierCollaborations();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const selected = useMemo(
    () => collaborations.find((row) => `${row.clubId}:${row.partnerId}` === selectedKey) ?? null,
    [collaborations, selectedKey],
  );

  const { messages, loading: threadLoading, sending, send } = usePartnerThread(
    selected?.clubId ?? null,
    selected?.partnerId ?? null,
  );

  const handleSend = async () => {
    const result = await send(draft);
    if (!result.error) setDraft("");
  };

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={sp.messagesTitle} greeting={sp.messagesSubtitle} showBack={false} />

      <div className={`${DASHBOARD_PAGE_INNER} grid gap-4 lg:grid-cols-[280px_1fr] min-h-[60vh]`}>
        <aside className="rounded-2xl border border-border/60 bg-card/40 p-3 space-y-2">
          <p className="text-xs text-muted-foreground px-2 pb-1">{sp.messagesThreadsHint}</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : collaborations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground text-center">
              <p>{sp.noCollaborations}</p>
              <Link to="/partner-marketplace" className="text-primary hover:underline mt-2 inline-flex items-center gap-1">
                <Store className="h-3.5 w-3.5" />
                {sp.openMarketplace}
              </Link>
            </div>
          ) : (
            collaborations.map((row) => {
              const key = `${row.clubId}:${row.partnerId}`;
              const active = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    "w-full text-left rounded-xl px-3 py-2.5 border transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/50 hover:bg-muted/30",
                  )}
                >
                  <div className="text-sm font-medium text-foreground truncate">{row.clubName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{row.partnerName}</div>
                </button>
              );
            })
          )}
        </aside>

        <section className="rounded-2xl border border-border/60 bg-card/40 flex flex-col min-h-[420px]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center">
              <MessageSquare className="h-8 w-8 opacity-60" />
              <p className="text-sm">{sp.messagesSelectThread}</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border/60 px-4 py-3">
                <div className="text-sm font-semibold text-foreground">{selected.clubName}</div>
                <div className="text-xs text-muted-foreground">{sp.messagesWithClub}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{sp.messagesEmpty}</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_user_id === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                            mine ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground",
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-border/60 p-3 flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={sp.messagesPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <Button type="button" onClick={() => void handleSend()} disabled={sending || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
