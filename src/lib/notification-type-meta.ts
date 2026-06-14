import { Calendar, Info, Megaphone, Trophy, type LucideIcon } from "lucide-react";

export interface NotificationTypeMeta {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const NOTIFICATION_TYPES: NotificationTypeMeta[] = [
  { value: "match", label: "Match", icon: Trophy, color: "text-accent" },
  { value: "event", label: "Event", icon: Calendar, color: "text-primary" },
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "text-primary" },
  { value: "general", label: "General", icon: Info, color: "text-muted-foreground" },
];

const byValue = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.value, t])
) as Record<string, NotificationTypeMeta>;

export function getNotificationTypeMeta(type: string): NotificationTypeMeta {
  return byValue[type] ?? NOTIFICATION_TYPES[3];
}
