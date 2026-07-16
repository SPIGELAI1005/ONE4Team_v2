import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Megaphone, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import { supabase } from "@/integrations/supabase/client";
import {
  comingCount,
  summarizeTrainingAttendance,
  type TrainingAttendanceRow,
} from "@/lib/training-attendance";
import { DASHBOARD_CARD, DASHBOARD_TYPE_SECTION_TITLE } from "@/lib/dashboard-page-shell";

interface TodaySession {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  confirmed: number;
  declined: number;
  pending: number;
}

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function TrainerTodaySessionCard() {
  const { t } = useLanguage();
  const d = t.dashboard.trainerToday;
  const { user } = useAuth();
  const { activeClubId } = useActiveClub();
  const [session, setSession] = useState<TodaySession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeClubId || !user) {
      setSession(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const from = startOfLocalDay().toISOString();
      const to = endOfLocalDay().toISOString();

      const { data: activities } = await supabase
        .from("activities")
        .select("id, title, starts_at, location")
        .eq("club_id", activeClubId)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true })
        .limit(10);

      const first = ((activities ?? []) as Array<{
        id: string;
        title: string | null;
        starts_at: string;
        location: string | null;
      }>)[0];
      if (!first || cancelled) {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const { data: attendance } = await supabase
        .from("activity_attendance")
        .select("id, activity_id, membership_id, status, notes")
        .eq("club_id", activeClubId)
        .eq("activity_id", first.id);

      const summary = summarizeTrainingAttendance((attendance ?? []) as TrainingAttendanceRow[]);
      if (cancelled) return;
      setSession({
        id: first.id as string,
        title: (first.title as string) || d.untitled,
        startsAt: first.starts_at as string,
        location: (first.location as string | null) ?? null,
        confirmed: comingCount(summary),
        declined: summary.declined,
        pending: summary.invited,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeClubId, d.untitled, user]);

  const announceHref = session
    ? `/communication?compose=1&announceActivity=${encodeURIComponent(session.id)}&title=${encodeURIComponent(
        d.announceTitle.replace("{title}", session.title),
      )}`
    : "/communication";

  const timeLabel = session
    ? new Date(session.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`${DASHBOARD_CARD} border-primary/20 bg-primary/5`}>
      <h2 className={`${DASHBOARD_TYPE_SECTION_TITLE} mb-1 flex items-center gap-2`}>
        <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
        {d.title}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-3">{d.subtitle}</p>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4">{d.loading}</div>
      ) : !session ? (
        <div className="text-sm text-muted-foreground py-4">
          {d.empty}{" "}
          <Link to="/activities" className="text-primary hover:underline">
            {d.openSchedule}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-base font-display font-semibold text-foreground">{session.title}</div>
            <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>{timeLabel}</span>
              {session.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {session.location}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="ios-pill bg-primary/10 text-primary border-primary/20 px-2 py-0.5 inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {d.rsvpSummary
                .replace("{yes}", String(session.confirmed))
                .replace("{no}", String(session.declined))
                .replace("{pending}", String(session.pending))}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/activities?highlight=${session.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              {d.openSession}
            </Link>
            <Link
              to={announceHref}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40"
            >
              <Megaphone className="w-3.5 h-3.5" />
              {d.announce}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
