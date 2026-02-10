import { useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

const SPORT_STATS: Record<string, { label: string; icon: string }[]> = {
  Football: [
    { label: "Goals", icon: "⚽" }, { label: "Assists", icon: "🅰️" },
    { label: "Shots on Target", icon: "🎯" }, { label: "Passes", icon: "📊" },
    { label: "Tackles", icon: "🦶" }, { label: "Saves", icon: "🧤" },
  ],
  Basketball: [
    { label: "Points", icon: "🏀" }, { label: "Rebounds", icon: "📊" },
    { label: "Assists", icon: "🅰️" }, { label: "Steals", icon: "✋" },
    { label: "Blocks", icon: "🚫" }, { label: "3-Pointers", icon: "🎯" },
  ],
  Tennis: [
    { label: "Aces", icon: "🎾" }, { label: "Double Faults", icon: "❌" },
    { label: "Winners", icon: "⭐" }, { label: "Unforced Errors", icon: "📉" },
    { label: "Break Points Won", icon: "💪" }, { label: "First Serve %", icon: "📊" },
  ],
  Volleyball: [
    { label: "Kills", icon: "⚡" }, { label: "Blocks", icon: "🚫" },
    { label: "Aces", icon: "🎯" }, { label: "Digs", icon: "🏐" },
    { label: "Assists", icon: "🅰️" }, { label: "Service Errors", icon: "❌" },
  ],
  Handball: [
    { label: "Goals", icon: "🤾" }, { label: "Assists", icon: "🅰️" },
    { label: "Saves", icon: "🧤" }, { label: "Turnovers", icon: "📉" },
    { label: "Steals", icon: "✋" }, { label: "Penalties", icon: "🎯" },
  ],
};

interface SportSpecificStatsProps {
  sport?: string;
}

const SportSpecificStats = ({ sport = "Football" }: SportSpecificStatsProps) => {
  const stats = SPORT_STATS[sport] || SPORT_STATS.Football;
  const [selectedSport, setSelectedSport] = useState(sport);
  const currentStats = SPORT_STATS[selectedSport] || SPORT_STATS.Football;

  return (
    <div className="rounded-xl bg-background border border-border p-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary" /> SPORT-SPECIFIC STATS
      </h4>

      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {Object.keys(SPORT_STATS).map(s => (
          <button key={s} onClick={() => setSelectedSport(s)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
              selectedSport === s
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {currentStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex flex-col items-center p-2 rounded-lg bg-muted/20 text-center">
            <span className="text-lg mb-0.5">{stat.icon}</span>
            <span className="text-[9px] text-muted-foreground leading-tight">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SportSpecificStats;
