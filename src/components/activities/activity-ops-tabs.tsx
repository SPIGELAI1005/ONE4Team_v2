import { useState } from "react";
import { cn } from "@/lib/utils";

export type ActivityOpsTab = "attendance" | "transport" | "guests";

interface ActivityOpsTabsProps {
  showTransport: boolean;
  showGuests: boolean;
  labels: {
    attendance: string;
    transport: string;
    guests: string;
  };
  attendance: React.ReactNode;
  transport: React.ReactNode;
  guests: React.ReactNode;
}

/** Phase 24 — one job per section; mount only the active ops panel (also a Phase 23 perf win). */
export function ActivityOpsTabs({
  showTransport,
  showGuests,
  labels,
  attendance,
  transport,
  guests,
}: ActivityOpsTabsProps) {
  const [tab, setTab] = useState<ActivityOpsTab>("attendance");
  const effectiveTab =
    tab === "transport" && !showTransport
      ? "attendance"
      : tab === "guests" && !showGuests
        ? "attendance"
        : tab;

  const tabs: { id: ActivityOpsTab; label: string; show: boolean }[] = [
    { id: "attendance", label: labels.attendance, show: true },
    { id: "transport", label: labels.transport, show: showTransport },
    { id: "guests", label: labels.guests, show: showGuests },
  ].filter((t) => t.show);

  return (
    <div className="mt-3 space-y-2">
      {tabs.length > 1 ? (
        <div className="flex flex-wrap gap-1 rounded-xl border border-border/50 bg-background/40 p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                effectiveTab === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {effectiveTab === "attendance" ? attendance : null}
      {effectiveTab === "transport" ? transport : null}
      {effectiveTab === "guests" ? guests : null}
    </div>
  );
}
