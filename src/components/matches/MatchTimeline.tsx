import { motion } from "framer-motion";

type TimelineEvent = {
  id: string;
  event_type: string;
  minute: number | null;
  membership_id: string | null;
  notes: string | null;
};

const eventConfig: Record<string, { icon: string; color: string; label: string }> = {
  goal: { icon: "⚽", color: "bg-primary/20 border-primary/30", label: "Goal" },
  assist: { icon: "🅰️", color: "bg-primary/10 border-primary/20", label: "Assist" },
  yellow_card: { icon: "🟨", color: "bg-yellow-500/10 border-yellow-500/20", label: "Yellow Card" },
  red_card: { icon: "🟥", color: "bg-destructive/10 border-destructive/20", label: "Red Card" },
  substitution_in: { icon: "🔄", color: "bg-muted border-border", label: "Sub In" },
  substitution_out: { icon: "🔄", color: "bg-muted border-border", label: "Sub Out" },
};

interface MatchTimelineProps {
  events: TimelineEvent[];
  getMemberName: (id: string) => string;
}

const MatchTimeline = ({ events, getMemberName }: MatchTimelineProps) => {
  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  if (sorted.length === 0) return null;

  // Build 90-minute timeline
  const maxMinute = Math.max(...sorted.map(e => e.minute || 0), 90);

  return (
    <div className="rounded-xl bg-background border border-border p-4 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3">MATCH TIMELINE</h4>

      {/* Timeline bar */}
      <div className="relative mb-4">
        <div className="h-1.5 bg-muted rounded-full relative">
          {/* Half-time marker */}
          <div className="absolute top-0 left-1/2 -translate-x-px w-0.5 h-3 bg-muted-foreground/30 -mt-[3px]" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground">HT</div>

          {/* Event markers */}
          {sorted.filter(e => e.minute != null).map((e, i) => {
            const pos = ((e.minute || 0) / maxMinute) * 100;
            const cfg = eventConfig[e.event_type] || { icon: "•", color: "bg-muted border-border", label: e.event_type };
            return (
              <motion.div key={e.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                className="absolute -top-1.5 -translate-x-1/2 cursor-pointer group"
                style={{ left: `${pos}%` }}
                title={`${cfg.label} - ${getMemberName(e.membership_id || "")} (${e.minute}')`}>
                <div className={`w-4 h-4 rounded-full border text-[8px] flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-between mt-5 text-[8px] text-muted-foreground">
          <span>0'</span>
          <span>45'</span>
          <span>90'</span>
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-1">
        {sorted.map((e, i) => {
          const cfg = eventConfig[e.event_type] || { icon: "•", color: "bg-muted border-border", label: e.event_type };
          return (
            <motion.div key={e.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 text-xs">
              <span className="w-8 text-right text-muted-foreground font-mono">
                {e.minute != null ? `${e.minute}'` : "—"}
              </span>
              <span className="text-sm">{cfg.icon}</span>
              <span className="text-foreground font-medium">{cfg.label}</span>
              {e.membership_id && (
                <span className="text-muted-foreground">— {getMemberName(e.membership_id)}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchTimeline;
