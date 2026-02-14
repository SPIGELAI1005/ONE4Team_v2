import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Calendar,
  Loader2,
  Plus,
  Check,
  X,
  Clock,
  Filter,
  Users,
  PanelRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useMembershipId } from "@/hooks/use-membership-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ActivityType = "training" | "match" | "event";

type ActivityRow = {
  id: string;
  club_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  team_id: string | null;
  created_by: string;
  created_at: string;
};

type TeamRow = { id: string; name: string };

type AttendanceRow = {
  id: string;
  club_id: string;
  activity_id: string;
  membership_id: string;
  status: "invited" | "confirmed" | "declined" | "attended";
};

type AttendanceSummary = {
  invited: number;
  confirmed: number;
  declined: number;
  attended: number;
};

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  profiles?: { display_name: string | null } | null;
};

function emptySummary(): AttendanceSummary {
  return { invited: 0, confirmed: 0, declined: 0, attended: 0 };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function nextDowAt(hour: number, minute: number, dow0Sun: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  const day = d.getDay();
  let delta = (dow0Sun - day + 7) % 7;
  // If it's today but time already passed, push to next week.
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

export default function Activities() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { membershipId, loading: membershipLoading } = useMembershipId();
  const perms = usePermissions();
  const { toast } = useToast();

  const canCreate = perms.isTrainer;

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("training");
  const [startsAt, setStartsAt] = useState("");
  const [teamId, setTeamId] = useState<string>("");

  // Filters
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterShowPast, setFilterShowPast] = useState(false);

  // Attendance drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerActivityId, setDrawerActivityId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      const now = new Date();
      const fromIso = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();

      const [{ data: teamData, error: teamErr }, { data: acts, error: actsErr }] = await Promise.all([
        supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
        supabase
          .from("activities")
          .select("*")
          .eq("club_id", clubId)
          .gte("starts_at", fromIso)
          .order("starts_at", { ascending: true })
          .limit(200),
      ]);

      if (teamErr) throw teamErr;
      if (actsErr) throw actsErr;

      setTeams((teamData as unknown as TeamRow[]) ?? []);
      const actRows = (acts as unknown as ActivityRow[]) ?? [];
      setActivities(actRows);

      const actIds = actRows.map((a) => a.id);

      // trainer: overview needs membership roster (for drawer)
      if (perms.isTrainer) {
        const [{ data: att, error: attErr }, { data: ms, error: msErr }] = await Promise.all([
          actIds.length
            ? supabase
                .from("activity_attendance")
                .select("id, club_id, activity_id, membership_id, status")
                .eq("club_id", clubId)
                .in("activity_id", actIds)
            : Promise.resolve({ data: [] as AttendanceRow[], error: null } as { data: AttendanceRow[]; error: null }),
          supabase
            .from("club_memberships")
            .select("id, role, status, profiles!club_memberships_user_id_fkey(display_name)")
            .eq("club_id", clubId)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(800),
        ]);

        if (attErr) throw attErr;
        if (msErr) throw msErr;

        setAttendance((att as unknown as AttendanceRow[]) ?? []);
        setMemberships((ms as unknown as MembershipRow[]) ?? []);
      } else if (membershipId) {
        const { data: att, error: attErr } = actIds.length
          ? await supabase
              .from("activity_attendance")
              .select("id, club_id, activity_id, membership_id, status")
              .eq("club_id", clubId)
              .eq("membership_id", membershipId)
              .in("activity_id", actIds)
          : { data: [], error: null };

        if (attErr) throw attErr;
        setAttendance((att as unknown as AttendanceRow[]) ?? []);
        setMemberships([]);
      } else {
        setAttendance([]);
        setMemberships([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load schedule";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, membershipId, perms.isTrainer, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const myAttendanceByActivity = useMemo(() => {
    const map: Record<string, AttendanceRow> = {};
    if (!membershipId) return map;
    for (const row of attendance) {
      if (row.membership_id === membershipId) map[row.activity_id] = row;
    }
    return map;
  }, [attendance, membershipId]);

  const attendanceByActivity = useMemo(() => {
    const map: Record<string, AttendanceSummary> = {};
    if (!perms.isTrainer) return map;
    for (const row of attendance) {
      const s = (map[row.activity_id] ??= emptySummary());
      if (row.status === "invited") s.invited++;
      else if (row.status === "confirmed") s.confirmed++;
      else if (row.status === "declined") s.declined++;
      else if (row.status === "attended") s.attended++;
    }
    return map;
  }, [attendance, perms.isTrainer]);

  const visibleActivities = useMemo(() => {
    const now = Date.now();

    return activities
      .filter((a) => (filterShowPast ? true : new Date(a.starts_at).getTime() >= now - 1000 * 60 * 60 * 24))
      .filter((a) => (filterType === "all" ? true : a.type === filterType))
      .filter((a) => (filterTeamId ? a.team_id === filterTeamId : true))
      .filter((a) => {
        if (!filterMine) return true;
        const att = myAttendanceByActivity[a.id];
        return att?.status === "confirmed" || att?.status === "attended";
      });
  }, [activities, filterShowPast, filterType, filterTeamId, filterMine, myAttendanceByActivity]);

  const grouped = useMemo(() => {
    const byDay: Record<string, ActivityRow[]> = {};
    for (const a of visibleActivities) {
      const day = new Date(a.starts_at).toLocaleDateString();
      (byDay[day] ??= []).push(a);
    }
    return byDay;
  }, [visibleActivities]);

  const drawerActivity = useMemo(() => {
    if (!drawerActivityId) return null;
    return activities.find((a) => a.id === drawerActivityId) ?? null;
  }, [activities, drawerActivityId]);

  const drawerLists = useMemo(() => {
    if (!drawerActivityId || !perms.isTrainer) return null;

    const byMember: Record<string, AttendanceRow> = {};
    for (const row of attendance) {
      if (row.activity_id === drawerActivityId) byMember[row.membership_id] = row;
    }

    const rows = memberships
      .filter((m) => m.status === "active")
      .map((m) => {
        const status = byMember[m.id]?.status ?? "invited";
        const name = m.profiles?.display_name || m.id.slice(0, 8);
        return { membershipId: m.id, name, role: m.role, status };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const confirmed = rows.filter((r) => r.status === "confirmed" || r.status === "attended");
    const declined = rows.filter((r) => r.status === "declined");
    const invited = rows.filter((r) => r.status === "invited");

    return { confirmed, declined, invited };
  }, [attendance, memberships, drawerActivityId, perms.isTrainer]);

  const openDrawer = (activityId: string) => {
    setDrawerActivityId(activityId);
    setDrawerOpen(true);
  };

  const nudgeUnconfirmed = async () => {
    if (!drawerLists || !drawerActivity) return;

    // HOLD: real sending. For now, copy a message template.
    const names = drawerLists.invited.map((x) => x.name).slice(0, 12);
    const rest = Math.max(0, drawerLists.invited.length - names.length);

    const msg =
      `Reminder: please confirm your RSVP for "${drawerActivity.title}" (${new Date(drawerActivity.starts_at).toLocaleString()}).\n\n` +
      `Unconfirmed: ${names.join(", ")}${rest ? ` (+${rest} more)` : ""}\n\n` +
      `Reply with ✅ if you can make it, ❌ if not.`;

    try {
      await navigator.clipboard.writeText(msg);
      toast({ title: "Copied", description: "Nudge message copied to clipboard (sending is HOLD)." });
    } catch {
      toast({ title: "Nudge", description: msg });
    }
  };

  const handleCreate = async () => {
    if (!user || !clubId) return;
    if (!canCreate) {
      toast({ title: "Not authorized", description: "Only trainers/admins can create activities.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !startsAt) return;

    const iso = new Date(startsAt).toISOString();

    const { error } = await supabase.from("activities").insert({
      club_id: clubId,
      type,
      title: title.trim(),
      starts_at: iso,
      team_id: teamId || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Activity created" });
    setShowCreate(false);
    setTitle("");
    setStartsAt("");
    setTeamId("");
    await fetchData();
  };

  const createWeekTemplate = async () => {
    if (!user || !clubId) return;
    if (!canCreate) return;

    const team = filterTeamId || null;

    // Next week template: Mon 18:00 training, Wed 18:00 training, Sat 15:00 match
    const mon = nextDowAt(18, 0, 1);
    const wed = nextDowAt(18, 0, 3);
    const sat = nextDowAt(15, 0, 6);

    const rows = [
      { club_id: clubId, type: "training" as const, title: "Training", starts_at: mon.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "training" as const, title: "Training", starts_at: wed.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "match" as const, title: "Match", starts_at: sat.toISOString(), team_id: team, created_by: user.id },
    ];

    const { error } = await supabase.from("activities").insert(rows);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Week created",
      description: team ? "Added 2 trainings + 1 match for selected team." : "Added 2 trainings + 1 match.",
    });

    await fetchData();
  };

  const rsvp = async (activityId: string, status: "confirmed" | "declined") => {
    if (!user || !clubId || !membershipId) return;

    const existing = myAttendanceByActivity[activityId];
    if (existing) {
      const { error } = await supabase
        .from("activity_attendance")
        .update({ status })
        .eq("club_id", clubId)
        .eq("id", existing.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("activity_attendance")
        .insert({ club_id: clubId, activity_id: activityId, membership_id: membershipId, status });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: status === "confirmed" ? "RSVP confirmed" : "RSVP declined" });
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Schedule"
        subtitle={perms.isTrainer ? "Plan week + track attendance" : "Your week"}
        rightSlot={
          <div className="flex gap-2">
            {perms.isTrainer && (
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={createWeekTemplate} disabled={!clubId}>
                <Sparkles className="w-4 h-4 mr-1" /> Week template
              </Button>
            )}
            {canCreate ? (
              <Button
                size="sm"
                className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
                onClick={() => setShowCreate(true)}
                disabled={!clubId}
              >
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || membershipLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No club selected</h2>
            <p className="text-muted-foreground">Select a club to view the weekly schedule.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Filters */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="w-4 h-4" /> Filters
                </div>
                {perms.isTrainer && (
                  <div className="text-[11px] text-muted-foreground">
                    Tip: set a Team filter, then use <span className="text-foreground/80 font-medium">Week template</span>.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {([
                  { id: "all", label: "All" },
                  { id: "training", label: "Training" },
                  { id: "match", label: "Match" },
                  { id: "event", label: "Event" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id as ActivityType | "all")}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      filterType === t.id
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}

                <select
                  className="h-9 rounded-2xl border border-border/60 bg-background/40 px-3 text-xs"
                  value={filterTeamId}
                  onChange={(e) => setFilterTeamId(e.target.value)}
                >
                  <option value="">All teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setFilterMine((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterMine ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  My sessions
                </button>

                <button
                  onClick={() => setFilterShowPast((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterShowPast ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  Show past
                </button>
              </div>
            </div>

            {/* List */}
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Nothing scheduled</h2>
                <p className="text-muted-foreground">Create your next training session to kick off the week.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">{day}</div>
                  <div className="grid gap-3">
                    {items.map((a) => {
                      const my = myAttendanceByActivity[a.id];
                      const status = my?.status ?? null;
                      const sum = attendanceByActivity[a.id] ?? null;
                      const teamName = a.team_id ? teams.find((t) => t.id === a.team_id)?.name ?? null : null;

                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">
                                  {a.type.toUpperCase()}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {fmtTime(a.starts_at)}
                                </span>
                                {teamName && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {teamName}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 font-display font-bold text-foreground truncate">{a.title}</div>

                              {status && (
                                <div className="mt-2 text-[11px] text-muted-foreground">
                                  Your RSVP: <span className="text-foreground/80 font-medium">{status}</span>
                                </div>
                              )}

                              {perms.isTrainer && sum && (
                                <div className="mt-2 text-[11px] text-muted-foreground">
                                  Attendance: <span className="text-foreground/80">{sum.confirmed}</span> confirmed •{" "}
                                  <span className="text-foreground/80">{sum.declined}</span> declined •{" "}
                                  <span className="text-foreground/80">{sum.invited}</span> invited
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              {perms.isTrainer && (
                                <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => openDrawer(a.id)}>
                                  <PanelRight className="w-4 h-4" />
                                </Button>
                              )}

                              {membershipId && (
                                <>
                                  <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => rsvp(a.id, "confirmed")}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => rsvp(a.id, "declined")}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">New activity</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Title</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Training" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["training", "event", "match"] as ActivityType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      type === t
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Team (optional)</div>
                <select
                  className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Starts at</div>
                <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="YYYY-MM-DD HH:MM" />
                <div className="mt-1 text-[10px] text-muted-foreground">We parse via Date().</div>
              </div>

              <Button className="bg-gradient-gold text-primary-foreground font-semibold" onClick={handleCreate}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance drawer */}
      {drawerOpen && drawerActivity && drawerLists && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-border/60 bg-card/70 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Attendance</div>
                <div className="font-display font-bold text-foreground truncate">{drawerActivity.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(drawerActivity.starts_at).toLocaleString()} • {drawerActivity.type.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-2xl" onClick={nudgeUnconfirmed}>
                  <Sparkles className="w-4 h-4 mr-1" /> Nudge unconfirmed
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <div className="text-[11px] text-muted-foreground">Confirmed</div>
                <div className="text-xl font-display font-bold text-foreground">{drawerLists.confirmed.length}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <div className="text-[11px] text-muted-foreground">Declined</div>
                <div className="text-xl font-display font-bold text-foreground">{drawerLists.declined.length}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <div className="text-[11px] text-muted-foreground">Unconfirmed</div>
                <div className="text-xl font-display font-bold text-foreground">{drawerLists.invited.length}</div>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3 max-h-[45vh] overflow-auto pr-1">
              {([
                { label: "Confirmed", rows: drawerLists.confirmed },
                { label: "Declined", rows: drawerLists.declined },
                { label: "Unconfirmed", rows: drawerLists.invited },
              ] as const).map((sec) => (
                <div key={sec.label} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">{sec.label}</div>
                  {sec.rows.length === 0 ? (
                    <div className="text-xs text-muted-foreground">—</div>
                  ) : (
                    <div className="grid gap-1">
                      {sec.rows.map((r) => (
                        <div key={r.membershipId} className="text-xs text-foreground/80 truncate">
                          {r.name}
                          <span className="text-[10px] text-muted-foreground"> • {r.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 text-[10px] text-muted-foreground">
              “Nudge unconfirmed” copies a message template (sending is HOLD until messaging is wired).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
