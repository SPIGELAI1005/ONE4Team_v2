import {
  Award,
  Crown,
  Eye,
  Flame,
  Handshake,
  Star,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ACHIEVEMENT_BADGE_ICONS: Record<string, LucideIcon> = {
  goals_5: Target,
  goals_10: Flame,
  goals_25: Crown,
  assists_5: Handshake,
  assists_10: Eye,
  matches_10: Users,
  matches_25: Star,
  matches_50: Trophy,
};

export function getAchievementBadgeIcon(badgeType: string): LucideIcon {
  return ACHIEVEMENT_BADGE_ICONS[badgeType] ?? Award;
}
