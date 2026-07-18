import { useEffect, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { getAchievementBadgeIcon } from "@/lib/achievement-badge-icons";
import {
  fetchPublicOptInBadges,
  type PublicOptInBadgeMember,
} from "@/lib/club-member-progress";

/** Adult opt-in badge showcase — hidden under youth protection or when public player stats are off. */
export function PublicClubOptInBadgesStrip() {
  const { t } = useLanguage();
  const { club } = usePublicClub();
  const [rows, setRows] = useState<PublicOptInBadgeMember[]>([]);
  const [loading, setLoading] = useState(false);

  const privacy = club?.micrositePrivacy;
  const allowed =
    Boolean(club?.id) &&
    privacy?.youthProtectionMode !== true &&
    privacy?.showPlayerStatsPublic === true;

  useEffect(() => {
    if (!allowed || !club?.id) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPublicOptInBadges(club.id).then(({ data }) => {
      if (!cancelled) {
        setRows(data.filter((r) => r.badges.length > 0));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, club?.id]);

  if (!allowed) return null;
  if (loading) {
    return (
      <PublicClubCard className="flex items-center gap-2 p-4 text-sm text-[color:var(--club-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.common.loading}
      </PublicClubCard>
    );
  }
  if (rows.length === 0) return null;

  return (
    <PublicClubCard className="space-y-3 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
        <Award className="h-4 w-4 text-[color:var(--club-primary)]" />
        {t.clubProgress.publicStripTitle}
      </div>
      <p className="text-xs text-[color:var(--club-muted)]">{t.clubProgress.publicStripDesc}</p>
      <ul className="space-y-3">
        {rows.slice(0, 8).map((row) => (
          <li key={row.membership_id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-[6rem] text-sm font-medium text-[color:var(--club-foreground)]">
              {row.display_name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {row.badges.slice(0, 4).map((badge) => {
                const Icon = getAchievementBadgeIcon(badge.badge_type);
                const label = t.clubProgress.badgeNames[badge.badge_type] ?? badge.badge_name;
                return (
                  <span
                    key={`${row.membership_id}-${badge.badge_type}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[color:var(--club-border)]/40 bg-white/5 px-2 py-0.5 text-[10px] text-[color:var(--club-foreground)]"
                    title={label}
                  >
                    <Icon className="h-3 w-3 text-[color:var(--club-primary)]" />
                    {label}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </PublicClubCard>
  );
}
