import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Loader2, Trophy, Target, AlertTriangle, Award,
  Calendar, MapPin, CheckCircle2, XCircle, Clock, User
} from "lucide-react";
// Button not needed on this page
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import PlayerRadarChart from "@/components/analytics/PlayerRadarChart";
import AttendanceHeatmap from "@/components/analytics/AttendanceHeatmap";
import AchievementBadges from "@/components/dashboard/AchievementBadges";
import FormStreak from "@/components/matches/FormStreak";
// logo is rendered by AppHeader
import type {
  ClubMembershipProfileRow,
  MatchEventRowLite,
  MatchLineupRowLite,
  MatchRowLite,
  EventParticipationWithEvent,
} from "@/types/player";

type MatchHistory = {
  match_id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  events: { event_type: string; minute: number | null }[];
};

type EventAttendance = {
  event_id: string;
  title: string;
  starts_at: string;
  status: string;
};

const PlayerProfile = () => {
  // navigation is handled by AppHeader
  const { membershipId } = useParams();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();

  const [displayName, setDisplayName] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "matches" | "attendance" | "analytics">("overview");

  // Stats
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [yellowCards, setYellowCards] = useState(0);
  const [redCards, setRedCards] = useState(0);
  const [matchesPlayed, setMatchesPlayed] = useState(0);

  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);

  useEffect(() => {
    if (!clubId || !membershipId) return;
    const fetchAll = async () => {
      setLoading(true);

      const { data: memberRaw } = await supabase
        .from("club_memberships")
        .select(
          "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_user_id_fkey(display_name)",
        )
        .eq("id", membershipId)
        .maybeSingle();

      const member = memberRaw as unknown as ClubMembershipProfileRow | null;
      if (member) {
        setDisplayName(member.profiles?.display_name || "Unknown");
        setPosition(member.position);
        setTeam(member.team);
      }

      const { data: matchesRaw } = await supabase
        .from("matches")
        .select("id, opponent, is_home, match_date, home_score, away_score, status")
        .eq("club_id", clubId)
        .order("match_date", { ascending: false });

      const matches = (matchesRaw ?? []) as unknown as MatchRowLite[];
      const matchIds = matches.map((m) => m.id);

      const { data: eventsRaw } = matchIds.length > 0
        ? await supabase
            .from("match_events")
            .select("match_id, event_type, minute")
            .eq("membership_id", membershipId)
            .in("match_id", matchIds)
        : { data: [] as MatchEventRowLite[] };

      const { data: lineupsRaw } = matchIds.length > 0
        ? await supabase
            .from("match_lineups")
            .select("match_id")
            .eq("membership_id", membershipId)
            .in("match_id", matchIds)
        : { data: [] as MatchLineupRowLite[] };

      const events = (eventsRaw ?? []) as unknown as MatchEventRowLite[];
      const lineups = (lineupsRaw ?? []) as unknown as MatchLineupRowLite[];

      const playedMatchIds = new Set(lineups.map((l) => l.match_id));
      events.forEach((e) => playedMatchIds.add(e.match_id));
      setMatchesPlayed(playedMatchIds.size);

      let g = 0;
      let a = 0;
      let yc = 0;
      let rc = 0;
      events.forEach((ev) => {
        if (ev.event_type === "goal") g++;
        else if (ev.event_type === "assist") a++;
        else if (ev.event_type === "yellow_card") yc++;
        else if (ev.event_type === "red_card") rc++;
      });
      setGoals(g);
      setAssists(a);
      setYellowCards(yc);
      setRedCards(rc);

      const evByMatch: Record<string, { event_type: string; minute: number | null }[]> = {};
      events.forEach((ev) => {
        if (!evByMatch[ev.match_id]) evByMatch[ev.match_id] = [];
        evByMatch[ev.match_id].push({ event_type: ev.event_type, minute: ev.minute });
      });

      const history: MatchHistory[] = matches
        .filter((m) => playedMatchIds.has(m.id))
        .map((m) => ({
          match_id: m.id,
          opponent: m.opponent,
          is_home: m.is_home,
          match_date: m.match_date,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          events: evByMatch[m.id] || [],
        }));
      setMatchHistory(history);

      const { data: participationsRaw } = await supabase
        .from("event_participants")
        .select("event_id, status, events!event_participants_event_id_fkey(title, starts_at)")
        .eq("membership_id", membershipId);

      const participations = (participationsRaw ?? []) as unknown as EventParticipationWithEvent[];
      const att: EventAttendance[] = participations.map((p) => ({
        event_id: p.event_id,
        title: p.events?.title || "Event",
        starts_at: p.events?.starts_at || "",
        status: p.status,
      }));
      att.sort((a1, b1) => new Date(b1.starts_at).getTime() - new Date(a1.starts_at).getTime());
      setAttendance(att);
      setLoading(false);
    };
    fetchAll();
  }, [clubId, membershipId]);

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  const eventTypeIcon: Record<string, string> = {
    goal: "⚽", assist: "🅰️", yellow_card: "🟨", red_card: "🟥",
    substitution_in: "🔄", substitution_out: "🔄",
  };

  const attendanceIcon: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle2 className="w-3.5 h-3.5 text-primary" />,
    attended: <CheckCircle2 className="w-3.5 h-3.5 text-primary" />,
    declined: <XCircle className="w-3.5 h-3.5 text-destructive" />,
    invited: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader title="Player Profile" subtitle="Overview, history, attendance" back />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Player header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-foreground">{displayName}</h2>
                  <div className="flex gap-2 mt-1">
                    {position && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{position}</span>}
                    {team && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{team}</span>}
                  </div>
                </div>
              </div>

              {/* Form streak */}
              <div className="mb-4">
                <FormStreak matches={matchHistory} count={10} />
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "Matches", value: matchesPlayed, icon: Trophy },
                  { label: "Goals", value: goals, icon: Target },
                  { label: "Assists", value: assists, icon: Award },
                  { label: "Yellow", value: yellowCards, icon: AlertTriangle },
                  { label: "Red", value: redCards, icon: AlertTriangle },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-background border border-border p-3 text-center">
                    <div className="text-lg font-bold font-display text-foreground">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="border-b border-border flex gap-1 overflow-x-auto">
              {([
                { id: "overview" as const, label: "Overview" },
                { id: "matches" as const, label: "Match History" },
                { id: "attendance" as const, label: "Attendance" },
                { id: "analytics" as const, label: "Analytics" },
              ]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-4">
                <AchievementBadges membershipId={membershipId} />
                <h3 className="text-sm font-semibold text-foreground">Recent Matches</h3>
                {matchHistory.slice(0, 5).map((m, i) => (
                  <motion.div key={m.match_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-lg bg-card border border-border p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {m.is_home ? `Club vs ${m.opponent}` : `${m.opponent} vs Club`}
                      </span>
                      {m.status === "completed" && (
                        <span className="text-sm font-bold text-foreground">{m.home_score} - {m.away_score}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {new Date(m.match_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {m.events.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.events.map((ev, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {eventTypeIcon[ev.event_type] || ev.event_type} {ev.minute != null ? `${ev.minute}'` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {matchHistory.length === 0 && <p className="text-sm text-muted-foreground">No match history yet.</p>}
              </div>
            )}

            {tab === "matches" && (
              <div className="space-y-3">
                {matchHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No matches found.</p>
                ) : matchHistory.map((m, i) => (
                  <motion.div key={m.match_id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="rounded-lg bg-card border border-border p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {m.is_home ? `Club vs ${m.opponent}` : `${m.opponent} vs Club`}
                      </span>
                      {m.status === "completed" && (
                        <span className="text-sm font-bold text-foreground">{m.home_score} - {m.away_score}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(m.match_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        m.status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{m.status}</span>
                    </div>
                    {m.events.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.events.map((ev, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {eventTypeIcon[ev.event_type] || ev.event_type} {ev.minute != null ? `${ev.minute}'` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "attendance" && (
              <div className="space-y-3">
                <AttendanceHeatmap membershipId={membershipId} />
                {attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No event attendance records.</p>
                ) : attendance.map((a, i) => (
                  <motion.div key={a.event_id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between rounded-lg bg-card border border-border p-4">
                    <div>
                      <span className="text-sm font-medium text-foreground">{a.title}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(a.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {attendanceIcon[a.status]}
                      <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "analytics" && membershipId && (
              <div className="space-y-6">
                <PlayerRadarChart membershipId={membershipId} playerName={displayName} />
                <AttendanceHeatmap membershipId={membershipId} />
              </div>
            )}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default PlayerProfile;
