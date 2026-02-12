import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import { Calendar, Loader2, Plus, Check, X, Clock } from "lucide-react";
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

type AttendanceRow = {
  id: string;
  club_id: string;
  activity_id: string;
  membership_id: string;
  status: "invited" | "confirmed" | "declined" | "attended";
};

export default function Activities() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { membershipId, loading: membershipLoading } = useMembershipId();
  const perms = usePermissions();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [myAttendance, setMyAttendance] = useState<Record<string, AttendanceRow>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("training");
  const [startsAt, setStartsAt] = useState("");

  const canCreate = perms.isTrainer;

  const fetchData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      const nowIso = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const { data: acts, error: actsErr } = await supabase
        .from("activities")
        .select("*")
        .eq("club_id", clubId)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(50);

      if (actsErr) throw actsErr;

      setActivities((acts as unknown as ActivityRow[]) || []);

      if (membershipId) {
        const actIds = (acts ?? []).map((a) => (a as { id?: string | null }).id).filter(Boolean);
        if (actIds.length) {
          const { data: att, error: attErr } = await supabase
            .from("activity_attendance")
            .select("id, club_id, activity_id, membership_id, status")
            .eq("club_id", clubId)
            .eq("membership_id", membershipId)
            .in("activity_id", actIds);
          if (attErr) throw attErr;

          const map: Record<string, AttendanceRow> = {};
          for (const row of (att as unknown as AttendanceRow[]) || []) {
            map[row.activity_id] = row;
          }
          setMyAttendance(map);
        } else {
          setMyAttendance({});
        }
      } else {
        setMyAttendance({});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load activities";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, membershipId, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const grouped = useMemo(() => {
    const byDay: Record<string, ActivityRow[]> = {};
    for (const a of activities) {
      const day = new Date(a.starts_at).toLocaleDateString();
      byDay[day] = byDay[day] || [];
      byDay[day].push(a);
    }
    return byDay;
  }, [activities]);

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
    await fetchData();
  };

  const rsvp = async (activityId: string, status: "confirmed" | "declined") => {
    if (!user || !clubId || !membershipId) return;

    const existing = myAttendance[activityId];
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

    setMyAttendance((prev) => ({
      ...prev,
      [activityId]: existing
        ? ({ ...existing, status } as AttendanceRow)
        : ({
            id: "(pending)",
            club_id: clubId,
            activity_id: activityId,
            membership_id: membershipId,
            status,
          } as AttendanceRow),
    }));

    toast({ title: status === "confirmed" ? "RSVP confirmed" : "RSVP declined" });
    await fetchData();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Schedule"
        subtitle="Activities + RSVP"
        rightSlot={
          canCreate ? (
            <Button
              size="sm"
              className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
              onClick={() => setShowCreate(true)}
              disabled={!clubId}
            >
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          ) : null
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
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No Club Selected</h2>
            <p className="text-muted-foreground">Select a club to view the schedule.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">No upcoming activities</h2>
                <p className="text-muted-foreground">Create trainings, events, and matches here.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">{day}</div>
                  <div className="grid gap-3">
                    {items.map((a) => {
                      const att = myAttendance[a.id];
                      const status = att?.status ?? null;
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">
                                  {a.type.toUpperCase()}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div className="mt-1 font-display font-bold text-foreground truncate">{a.title}</div>
                              {status && (
                                <div className="mt-2 text-[11px] text-muted-foreground">
                                  RSVP: <span className="text-foreground/80 font-medium">{status}</span>
                                </div>
                              )}
                            </div>

                            {membershipId && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-2xl"
                                  onClick={() => rsvp(a.id, "confirmed")}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-2xl"
                                  onClick={() => rsvp(a.id, "declined")}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">New activity</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Close</Button>
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
                <div className="text-xs text-muted-foreground mb-1">Starts at</div>
                <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="YYYY-MM-DD HH:MM" />
                <div className="mt-1 text-[10px] text-muted-foreground">Tip: use your locale input; we parse via Date().</div>
              </div>

              <Button className="bg-gradient-gold text-primary-foreground font-semibold" onClick={handleCreate}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
