import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import type { MembershipWithProfile } from "@/types/supabase";

type AwardDef = { type: string; name: string; icon: string; description: string };
type AwardResult = { type: string; name: string; icon: string; winner: string; membershipId: string; value: string };

const AWARD_DEFS: AwardDef[] = [
  { type: "golden_boot", name: "Golden Boot", icon: "⚽", description: "Most goals scored" },
  { type: "playmaker", name: "Master Playmaker", icon: "🅰️", description: "Most assists" },
  { type: "mr_reliable", name: "Mr. Reliable", icon: "💪", description: "Most appearances" },
  { type: "most_improved", name: "Most Improved", icon: "📈", description: "Biggest stat improvement" },
  { type: "iron_man", name: "Iron Man", icon: "🦾", description: "Best attendance rate" },
];

const SeasonAwards = () => {
  const { clubId } = useClubId();
  const { toast } = useToast();
  const [awards, setAwards] = useState<AwardResult[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateAwards = async () => {
    if (!clubId) return;

    const { data: matches } = await supabase
      .from("matches").select("id").eq("club_id", clubId).eq("status", "completed");
    const matchIds = (matches || []).map(m => m.id);
    if (matchIds.length === 0) { toast({ title: "No completed matches to generate awards from" }); return; }

    const { data: events } = await supabase
      .from("match_events").select("membership_id, event_type").in("match_id", matchIds);
    const { data: lineups } = await supabase
      .from("match_lineups").select("membership_id").in("match_id", matchIds);
    const { data: membersRaw } = await supabase
      .from("club_memberships")
      .select(
        "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)",
      )
      .eq("club_id", clubId);

    const members = (membersRaw ?? []) as unknown as MembershipWithProfile[];

    const nameMap: Record<string, string> = {};
    members.forEach((m) => {
      nameMap[m.id] = m.profiles?.display_name || "Player";
    });

    // Aggregate stats per player
    const stats: Record<string, { goals: number; assists: number; appearances: number }> = {};
    (events || []).forEach(e => {
      if (!e.membership_id) return;
      if (!stats[e.membership_id]) stats[e.membership_id] = { goals: 0, assists: 0, appearances: 0 };
      if (e.event_type === "goal") stats[e.membership_id].goals++;
      if (e.event_type === "assist") stats[e.membership_id].assists++;
    });
    (lineups || []).forEach(l => {
      if (!stats[l.membership_id]) stats[l.membership_id] = { goals: 0, assists: 0, appearances: 0 };
      stats[l.membership_id].appearances++;
    });

    const entries = Object.entries(stats);
    const results: AwardResult[] = [];

    // Golden Boot
    const topScorer = entries.sort((a, b) => b[1].goals - a[1].goals)[0];
    if (topScorer && topScorer[1].goals > 0) {
      results.push({ type: "golden_boot", name: "Golden Boot", icon: "⚽", winner: nameMap[topScorer[0]] || "Player", membershipId: topScorer[0], value: `${topScorer[1].goals} goals` });
    }

    // Playmaker
    const topAssist = entries.sort((a, b) => b[1].assists - a[1].assists)[0];
    if (topAssist && topAssist[1].assists > 0) {
      results.push({ type: "playmaker", name: "Master Playmaker", icon: "🅰️", winner: nameMap[topAssist[0]] || "Player", membershipId: topAssist[0], value: `${topAssist[1].assists} assists` });
    }

    // Mr. Reliable
    const topApps = entries.sort((a, b) => b[1].appearances - a[1].appearances)[0];
    if (topApps) {
      results.push({ type: "mr_reliable", name: "Mr. Reliable", icon: "💪", winner: nameMap[topApps[0]] || "Player", membershipId: topApps[0], value: `${topApps[1].appearances} appearances` });
    }

    setAwards(results);
    setGenerated(true);
  };

  if (!generated) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-primary/20 p-5 text-center">
        <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-2 text-sm">Season Awards Ceremony</h3>
        <p className="text-xs text-muted-foreground mb-4">Generate end-of-season awards based on performance data</p>
        <Button onClick={generateAwards} className="bg-gradient-gold-static text-primary-foreground hover:brightness-110" size="sm">
          <Award className="w-4 h-4 mr-1" /> Generate Awards
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-primary/20 p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> Season Awards 🏆
      </h3>
      <div className="space-y-3">
        {awards.map((a, i) => (
          <motion.div key={a.type} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-gold-subtle border border-primary/10">
            <span className="text-2xl">{a.icon}</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-primary">{a.name}</div>
              <div className="text-sm font-semibold text-foreground">{a.winner}</div>
            </div>
            <span className="text-xs text-muted-foreground">{a.value}</span>
          </motion.div>
        ))}
        {awards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Not enough data to generate awards.</p>
        )}
      </div>
    </motion.div>
  );
};

export default SeasonAwards;
