import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { getAchievementBadgeIcon } from "@/lib/achievement-badge-icons";
import {
  fetchMemberProgressSnapshot,
  type ClubProgressBadge,
} from "@/lib/club-member-progress";

const AchievementBadges = ({ membershipId }: { membershipId?: string }) => {
  const { clubId } = useClubId();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [achievements, setAchievements] = useState<ClubProgressBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    const run = async () => {
      let mid = membershipId;
      if (!mid && user) {
        const { data } = await supabase
          .from("club_memberships")
          .select("id")
          .eq("club_id", clubId)
          .eq("user_id", user.id)
          .maybeSingle();
        mid = data?.id;
      }
      if (!mid) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await fetchMemberProgressSnapshot(clubId, mid);
      if (cancelled) return;
      setAchievements(data?.badges ?? []);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, user]);

  if (loading) return null;
  if (achievements.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <Award className="h-4 w-4 text-primary" /> {t.clubProgress.badgesTitle}
      </h3>
      <div className="flex flex-wrap gap-3">
        {achievements.map((a, i) => {
          const BadgeIcon = getAchievementBadgeIcon(a.badge_type);
          const label = t.clubProgress.badgeNames[a.badge_type] ?? a.badge_name;
          return (
            <motion.div
              key={a.id ?? `${a.badge_type}-${a.earned_at ?? i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex min-w-[80px] flex-col items-center gap-1.5 rounded-xl border border-primary/10 bg-gradient-gold-subtle p-3"
              title={
                a.earned_at
                  ? `${label} · ${new Date(a.earned_at).toLocaleDateString()}`
                  : label
              }
            >
              <BadgeIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <span className="text-center text-[10px] font-medium leading-tight text-foreground">{label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementBadges;
