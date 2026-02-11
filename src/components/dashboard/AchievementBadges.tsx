import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import { useAuth } from "@/contexts/useAuth";

type Achievement = {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
};

// Badge definitions for auto-awarding
const BADGE_DEFS = [
  { type: "goals_5", name: "Sharp Shooter", icon: "⚽", threshold: 5, stat: "goals" },
  { type: "goals_10", name: "Goal Machine", icon: "🔥", threshold: 10, stat: "goals" },
  { type: "goals_25", name: "Legend Striker", icon: "👑", threshold: 25, stat: "goals" },
  { type: "assists_5", name: "Playmaker", icon: "🅰️", threshold: 5, stat: "assists" },
  { type: "assists_10", name: "Vision Master", icon: "👁️", threshold: 10, stat: "assists" },
  { type: "matches_10", name: "Squad Regular", icon: "🏟️", threshold: 10, stat: "matches" },
  { type: "matches_25", name: "Veteran", icon: "⭐", threshold: 25, stat: "matches" },
  { type: "matches_50", name: "Club Legend", icon: "🏆", threshold: 50, stat: "matches" },
] as const;

const AchievementBadges = ({ membershipId }: { membershipId?: string }) => {
  const { clubId } = useClubId();
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    const fetchAchievements = async () => {
      // Get current user's membership if not provided
      let mid = membershipId;
      if (!mid && user) {
        const { data } = await supabase
          .from("club_memberships")
          .select("id")
          .eq("club_id", clubId)
          .eq("user_id", user.id)
          .single();
        mid = data?.id;
      }
      if (!mid) { setLoading(false); return; }

      // Fetch existing achievements
      const { data: existing } = await supabase
        .from("achievements")
        .select("*")
        .eq("membership_id", mid);
      setAchievements((existing || []) as Achievement[]);

      // Auto-check and award new badges
      await checkAndAwardBadges(mid, clubId, (existing || []) as Achievement[]);
      setLoading(false);
    };
    fetchAchievements();
  }, [clubId, membershipId, user]);

  const checkAndAwardBadges = async (mid: string, cid: string, existing: Achievement[]) => {
    const existingTypes = new Set(existing.map((a) => a.badge_type));

    // Get player stats
    const { data: matches } = await supabase.from("matches").select("id").eq("club_id", cid);
    const matchIds = (matches || []).map(m => m.id);
    if (matchIds.length === 0) return;

    const [eventsRes, lineupsRes] = await Promise.all([
      supabase.from("match_events").select("event_type").eq("membership_id", mid).in("match_id", matchIds),
      supabase.from("match_lineups").select("id").eq("membership_id", mid).in("match_id", matchIds),
    ]);

    const events = eventsRes.data || [];
    const goals = events.filter(e => e.event_type === "goal").length;
    const assists = events.filter(e => e.event_type === "assist").length;
    const matchCount = lineupsRes.data?.length || 0;

    const statMap: Record<string, number> = { goals, assists, matches: matchCount };
    const newBadges: { badge_type: string; badge_name: string; badge_icon: string }[] = [];

    BADGE_DEFS.forEach(def => {
      if (!existingTypes.has(def.type) && statMap[def.stat] >= def.threshold) {
        newBadges.push({ badge_type: def.type, badge_name: def.name, badge_icon: def.icon });
      }
    });

    if (newBadges.length > 0) {
      const inserts = newBadges.map(b => ({
        club_id: cid,
        membership_id: mid,
        ...b,
      }));
      const { data: inserted } = await supabase.from("achievements").insert(inserts).select();
      if (inserted) {
        setAchievements(prev => [...prev, ...(inserted as Achievement[])]);
      }
    }
  };

  if (loading) return null;
  if (achievements.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" /> Achievements
      </h3>
      <div className="flex flex-wrap gap-3">
        {achievements.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-gold-subtle border border-primary/10 min-w-[80px]"
            title={`Earned ${new Date(a.earned_at).toLocaleDateString()}`}>
            <span className="text-2xl">{a.badge_icon}</span>
            <span className="text-[10px] font-medium text-foreground text-center leading-tight">{a.badge_name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementBadges;
