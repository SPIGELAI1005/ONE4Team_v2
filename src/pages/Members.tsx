import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Search, Plus, ArrowLeft,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Mail, Phone, Calendar, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import logo from "@/assets/logo.png";

type MemberRow = {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  position: string | null;
  age_group: string | null;
  team: string | null;
  status: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    user_id: string;
  };
};

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  trainer: Dumbbell,
  player: Shield,
  staff: UserCheck,
  member: Users,
  parent: Heart,
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  trainer: "bg-accent/10 text-accent",
  player: "bg-blue-500/10 text-blue-400",
  staff: "bg-emerald-500/10 text-emerald-400",
  member: "bg-muted text-muted-foreground",
  parent: "bg-pink-500/10 text-pink-400",
  sponsor: "bg-primary/10 text-primary",
  supplier: "bg-orange-500/10 text-orange-400",
  service_provider: "bg-violet-500/10 text-violet-400",
  consultant: "bg-cyan-500/10 text-cyan-400",
};

const Members = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  // Fetch members
  useEffect(() => {
    if (!clubId) return;
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_memberships")
        .select("*, profiles!club_memberships_user_id_fkey(display_name, avatar_url, phone, user_id)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error loading members", description: error.message, variant: "destructive" });
      } else {
        setMembers((data as unknown as MemberRow[]) || []);
      }
      setLoading(false);
    };
    fetchMembers();
  }, [clubId, toast]);

  const filtered = members.filter((m) => {
    const name = (m.profiles?.display_name || "").toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const allRoles = ["all", "admin", "trainer", "player", "staff", "member", "parent", "sponsor"];

  const handleDeleteMember = async (membershipId: string) => {
    const { error } = await supabase.from("club_memberships").delete().eq("id", membershipId);
    if (error) {
      toast({ title: "Error removing member", description: error.message, variant: "destructive" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      setSelectedMember(null);
      toast({ title: "Member removed" });
    }
  };

  // Show message if no club or not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to manage members.</p>
          <Button onClick={() => navigate("/auth")} className="bg-gradient-gold text-primary-foreground">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="w-7 h-7" />
              <h1 className="font-display font-bold text-lg text-foreground">Members</h1>
            </div>
          </div>
          <Button size="sm" className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" /> Add Member
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No Club Found</h2>
            <p className="text-muted-foreground mb-4">Join a club to manage members.</p>
            <Button onClick={() => navigate("/onboarding")} variant="outline">Go to Onboarding</Button>
          </div>
        ) : !perms.isAdmin ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Not authorized</h2>
            <p className="text-muted-foreground mb-4">Only club admins can manage members.</p>
            <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
          </div>
        ) : (
          <>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      roleFilter === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1).replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total", value: members.length, color: "text-foreground" },
                { label: "Active", value: members.filter(m => m.status === "active").length, color: "text-primary" },
                { label: "Players", value: members.filter(m => m.role === "player").length, color: "text-blue-400" },
                { label: "Trainers", value: members.filter(m => m.role === "trainer").length, color: "text-accent" },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-6">
              {/* Members List */}
              <div className={`flex-1 ${selectedMember ? "hidden lg:block" : ""}`}>
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      {members.length === 0 ? "No members yet. Add your first member!" : "No members found."}
                    </div>
                  ) : (
                    filtered.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedMember(member)}
                        className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedMember?.id === member.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {(member.profiles?.display_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{member.profiles?.display_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{member.team || "No team"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                              {member.role.replace("_", " ")}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              member.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                            }`}>
                              {member.status}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Detail Panel */}
              {selectedMember && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-80 shrink-0">
                  <div className="rounded-xl bg-card border border-border p-5 sticky top-24">
                    <div className="flex items-center justify-between mb-4 lg:hidden">
                      <span className="text-sm text-muted-foreground">Details</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                    </div>
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-3">
                        {(selectedMember.profiles?.display_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <h3 className="font-display font-bold text-foreground">{selectedMember.profiles?.display_name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-2 ${roleColors[selectedMember.role]}`}>
                        {selectedMember.role.replace("_", " ")}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {selectedMember.profiles?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" /> {selectedMember.profiles.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" /> {selectedMember.team || "No team"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" /> Joined {new Date(selectedMember.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {(selectedMember.position || selectedMember.age_group) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Player Attributes</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedMember.position && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-[10px] text-muted-foreground">Position</div>
                              <div className="text-sm font-medium text-foreground">{selectedMember.position}</div>
                            </div>
                          )}
                          {selectedMember.age_group && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-[10px] text-muted-foreground">Age Group</div>
                              <div className="text-sm font-medium text-foreground">{selectedMember.age_group}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-accent border-accent/30 hover:bg-accent/10"
                        onClick={() => handleDeleteMember(selectedMember.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
