import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import { useAuth } from "@/contexts/AuthContext";
import type { AttendanceParticipationRow, LineupAppearanceRow } from "@/types/analytics";

const AttendanceHeatmap = ({ membershipId }: { membershipId?: string }) => {
  const { clubId } = useClubId();
  const { user } = useAuth();
  const [heatData, setHeatData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      let mid = membershipId;
      if (!mid && user) {
        const { data } = await supabase
          .from("club_memberships").select("id").eq("club_id", clubId).eq("user_id", user.id).maybeSingle();
        mid = data?.id;
      }
      if (!mid) return;

      // Get training attendance from event_participants
      const { data: participationsRaw } = await supabase
        .from("event_participants")
        .select("status, events!event_participants_event_id_fkey(starts_at)")
        .eq("membership_id", mid);

      // Get match appearances
      const { data: lineupsRaw } = await supabase
        .from("match_lineups")
        .select("match_id, matches!match_lineups_match_id_fkey(match_date)")
        .eq("membership_id", mid);

      const participations = (participationsRaw ?? []) as unknown as AttendanceParticipationRow[];
      const lineups = (lineupsRaw ?? []) as unknown as LineupAppearanceRow[];

      const dateMap: Record<string, number> = {};

      participations.forEach((p) => {
        if (p.status === "confirmed" || p.status === "attended") {
          const d = p.events?.starts_at
            ? new Date(p.events.starts_at).toISOString().slice(0, 10)
            : null;
          if (d) dateMap[d] = (dateMap[d] || 0) + 1;
        }
      });

      lineups.forEach((l) => {
        const d = l.matches?.match_date
          ? new Date(l.matches.match_date).toISOString().slice(0, 10)
          : null;
        if (d) dateMap[d] = (dateMap[d] || 0) + 1;
      });

      setHeatData(dateMap);
    };
    fetch();
  }, [clubId, membershipId, user]);

  // Generate last 20 weeks grid
  const weeks = 20;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7));
  // Align to Monday
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  const grid: string[][] = [];
  const current = new Date(startDate);
  for (let w = 0; w < weeks; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    grid.push(week);
  }

  const totalDays = Object.keys(heatData).length;
  if (totalDays === 0) return null;

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    if (count === 1) return "bg-primary/20";
    if (count === 2) return "bg-primary/40";
    return "bg-primary/70";
  };

  const dayLabels = ["M", "", "W", "", "F", "", ""];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Attendance Activity
      </h3>
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {dayLabels.map((l, i) => (
            <div key={i} className="w-3 h-3 text-[7px] text-muted-foreground flex items-center justify-center">{l}</div>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div key={di}
                className={`w-3 h-3 rounded-[2px] ${getColor(heatData[day] || 0)}`}
                title={`${day}: ${heatData[day] || 0} activities`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[9px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map(n => (
          <div key={n} className={`w-3 h-3 rounded-[2px] ${getColor(n)}`} />
        ))}
        <span>More</span>
      </div>
    </motion.div>
  );
};

export default AttendanceHeatmap;
