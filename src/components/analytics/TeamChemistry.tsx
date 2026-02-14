import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import type { MembershipWithProfile } from "@/types/supabase";

type Combo = { players: string[]; wins: number; total: number; rate: number };

const TeamChemistry = () => {
  const { clubId } = useClubId();
  const [combos, setCombos] = useState<Combo[]>([]);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, home_score, away_score, is_home, status")
        .eq("club_id", clubId)
        .eq("status", "completed");

      if (!matches || matches.length < 3) return;

      const matchIds = matches.map(m => m.id);
      const { data: lineups } = await supabase
        .from("match_lineups")
        .select("match_id, membership_id")
        .in("match_id", matchIds)
        .eq("is_starter", true);

      if (!lineups) return;

      // Get member names
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

      // Match results
      const matchResult: Record<string, boolean> = {};
      matches.forEach(m => {
        const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
        const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
        matchResult[m.id] = gf > ga;
      });

      // Group lineups by match
      const matchPlayers: Record<string, string[]> = {};
      lineups.forEach(l => {
        if (!matchPlayers[l.match_id]) matchPlayers[l.match_id] = [];
        matchPlayers[l.match_id].push(l.membership_id);
      });

      // Find pairs that played together
      const pairStats: Record<string, { wins: number; total: number }> = {};
      Object.entries(matchPlayers).forEach(([matchId, players]) => {
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const key = [players[i], players[j]].sort().join("|");
            if (!pairStats[key]) pairStats[key] = { wins: 0, total: 0 };
            pairStats[key].total++;
            if (matchResult[matchId]) pairStats[key].wins++;
          }
        }
      });

      const topCombos = Object.entries(pairStats)
        .filter(([_, s]) => s.total >= 2)
        .map(([key, s]) => ({
          players: key.split("|").map(id => nameMap[id] || "Player"),
          wins: s.wins,
          total: s.total,
          rate: Math.round((s.wins / s.total) * 100),
        }))
        .sort((a, b) => b.rate - a.rate || b.total - a.total)
        .slice(0, 5);

      setCombos(topCombos);
    };
    fetch();
  }, [clubId]);

  if (combos.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" /> Team Chemistry
      </h3>
      <div className="space-y-2">
        {combos.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20">
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground">{c.players[0]} + {c.players[1]}</div>
              <div className="text-[10px] text-muted-foreground">{c.wins}W / {c.total} together</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.rate}%` }} />
              </div>
              <span className="text-xs font-bold text-primary">{c.rate}%</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TeamChemistry;
