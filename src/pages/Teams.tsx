import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Plus, Users, Trophy, Dumbbell, Loader2,
  Calendar, MapPin, Clock, Trash2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
// logo is rendered by AppHeader

type Team = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
  created_at: string;
};

type TrainingSession = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  team_id: string | null;
  teams?: { name: string } | null;
};

const Teams = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();

  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState("Football");
  const [teamAge, setTeamAge] = useState("");
  const [teamCoach, setTeamCoach] = useState("");

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionTeamId, setSessionTeamId] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setTeams([]);
    setSessions([]);
    setLoading(true);
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const fetchData = async () => {
      setLoading(true);
      const [teamsRes, sessionsRes] = await Promise.all([
        supabase.from("teams").select("*").eq("club_id", clubId).order("name"),
        supabase.from("training_sessions").select("*, teams(name)").eq("club_id", clubId).order("starts_at", { ascending: true }).limit(20),
      ]);
      setTeams((teamsRes.data as Team[]) || []);
      setSessions((sessionsRes.data as unknown as TrainingSession[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [clubId]);

  const handleAddTeam = async () => {
    if (!perms.isTrainer || !clubId) {
      toast({ title: "Not authorized", description: "Only trainers/admins can manage teams.", variant: "destructive" });
      return;
    }
    if (!teamName.trim()) return;
    const { data, error } = await supabase
      .from("teams")
      .insert({ club_id: clubId, name: teamName.trim(), sport: teamSport, age_group: teamAge || null, coach_name: teamCoach || null })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTeams(prev => [...prev, data as Team]);
    setShowAddTeam(false);
    setTeamName(""); setTeamAge(""); setTeamCoach("");
    toast({ title: "Team created" });
  };

  const handleAddSession = async () => {
    if (!perms.isTrainer || !clubId) {
      toast({ title: "Not authorized", description: "Only trainers/admins can manage sessions.", variant: "destructive" });
      return;
    }
    if (!sessionTitle.trim() || !sessionStart || !sessionEnd) return;
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        club_id: clubId,
        team_id: sessionTeamId || null,
        title: sessionTitle.trim(),
        location: sessionLocation || null,
        starts_at: sessionStart,
        ends_at: sessionEnd,
        created_by: user?.id,
      })
      .select("*, teams(name)")
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSessions(prev => [...prev, data as unknown as TrainingSession]);
    setShowAddSession(false);
    setSessionTitle(""); setSessionLocation(""); setSessionTeamId(""); setSessionStart(""); setSessionEnd("");
    toast({ title: "Session scheduled" });
  };

  const handleDeleteTeam = async (id: string) => {
    if (!perms.isTrainer || !clubId) {
      toast({ title: "Not authorized", description: "Only trainers/admins can manage teams.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("club_id", clubId)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Teams & Training"
        subtitle="Trainer/Admin"
        rightSlot={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddSession(true)} disabled={!perms.isTrainer}>
              <Calendar className="w-4 h-4 mr-1" /> Add Session
            </Button>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => setShowAddTeam(true)} disabled={!perms.isTrainer}>
              <Plus className="w-4 h-4 mr-1" /> Add Team
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">No club found. Create one first.</div>
        ) : !perms.isTrainer ? (
          <div className="text-center py-20 text-muted-foreground">Only trainers/admins can manage teams and sessions.</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Teams */}
            <div>
              <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Teams ({teams.length})
              </h2>
              {teams.length === 0 ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No teams yet.</div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team, i) => (
                    <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{team.name}</div>
                        <div className="text-xs text-muted-foreground">{team.sport} {team.age_group ? `· ${team.age_group}` : ""} {team.coach_name ? `· Coach: ${team.coach_name}` : ""}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)} className="text-muted-foreground hover:text-accent">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Training Sessions */}
            <div>
              <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" /> Training Sessions ({sessions.length})
              </h2>
              {sessions.length === 0 ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No sessions scheduled.</div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{s.title}</span>
                        {s.teams?.name && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.teams.name}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddTeam(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Add Team</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddTeam(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Team name *" value={teamName} onChange={e => setTeamName(e.target.value)} className="bg-background" maxLength={100} />
              <Input placeholder="Sport" value={teamSport} onChange={e => setTeamSport(e.target.value)} className="bg-background" />
              <Input placeholder="Age group (e.g. U17)" value={teamAge} onChange={e => setTeamAge(e.target.value)} className="bg-background" />
              <Input placeholder="Coach name" value={teamCoach} onChange={e => setTeamCoach(e.target.value)} className="bg-background" />
              <Button onClick={handleAddTeam} disabled={!teamName.trim()} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Create Team
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSession && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddSession(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Schedule Training</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddSession(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Session title *" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} className="bg-background" maxLength={200} />
              <select value={sessionTeamId} onChange={e => setSessionTeamId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="">No team (club-wide)</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Input placeholder="Location" value={sessionLocation} onChange={e => setSessionLocation(e.target.value)} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Start *</label>
                  <Input type="datetime-local" value={sessionStart} onChange={e => setSessionStart(e.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">End *</label>
                  <Input type="datetime-local" value={sessionEnd} onChange={e => setSessionEnd(e.target.value)} className="bg-background" />
                </div>
              </div>
              <Button onClick={handleAddSession} disabled={!sessionTitle.trim() || !sessionStart || !sessionEnd}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Schedule Session
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Teams;
