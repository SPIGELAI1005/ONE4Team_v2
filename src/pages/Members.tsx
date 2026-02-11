import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Users, Search, Plus, ArrowLeft,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Mail, Phone, Calendar, Loader2,
  Link2, Copy, Check, Inbox, UserPlus, Clock, X
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

type InviteRequestRow = {
  id: string;
  club_id: string;
  name: string;
  email: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ClubInviteRow = {
  id: string;
  club_id: string;
  email: string | null;
  role: string;
  token_hash: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
};

const canRevokeInvite = (inv: ClubInviteRow) => !inv.used_at;

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
  const [tab, setTab] = useState<"members" | "invites">("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  const [inviteRequests, setInviteRequests] = useState<InviteRequestRow[]>([]);
  const [invites, setInvites] = useState<ClubInviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [clubSlug, setClubSlug] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteDays, setInviteDays] = useState("7");
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");

  const hashToken = async (token: string) => {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return toHex(digest);
  };

  const generateToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    // base64url-ish
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const fetchInvitesData = useCallback(async () => {
    if (!clubId) return;
    setInvitesLoading(true);

    const clubRes = await supabase.from("clubs").select("slug, name").eq("id", clubId).maybeSingle();
    if (clubRes.error) {
      toast({ title: "Error", description: clubRes.error.message, variant: "destructive" });
    } else {
      setClubSlug(clubRes.data?.slug ?? null);
      setClubName(clubRes.data?.name ?? null);
    }
    const [reqRes, invRes] = await Promise.all([
      supabase.from("club_invite_requests").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
      supabase.from("club_invites").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
    ]);

    if (reqRes.error) toast({ title: "Error", description: reqRes.error.message, variant: "destructive" });
    if (invRes.error) toast({ title: "Error", description: invRes.error.message, variant: "destructive" });

    setInviteRequests((reqRes.data as unknown as InviteRequestRow[]) || []);
    setInvites((invRes.data as unknown as ClubInviteRow[]) || []);
    setInvitesLoading(false);
  }, [clubId, toast]);

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

  useEffect(() => {
    if (tab !== "invites") return;
    if (!clubId) return;
    if (!perms.isAdmin) return;
    void fetchInvitesData();
  }, [tab, clubId, perms.isAdmin, fetchInvitesData]);

  const filtered = members.filter((m) => {
    const name = (m.profiles?.display_name || "").toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const allRoles = ["all", "admin", "trainer", "player", "staff", "member", "parent", "sponsor"];

  const handleDeleteMember = async (membershipId: string) => {
    if (!perms.isAdmin || !clubId) {
      toast({ title: "Not authorized", description: "Only admins can manage members.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("club_memberships")
      .delete()
      .eq("club_id", clubId)
      .eq("id", membershipId);
    if (error) {
      toast({ title: "Error removing member", description: error.message, variant: "destructive" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      setSelectedMember(null);
      toast({ title: "Member removed" });
    }
  };

  const handleUpdateInviteRequestStatus = async (requestId: string, status: InviteRequestRow["status"]) => {
    if (!clubId) return;
    const { error } = await supabase
      .from("club_invite_requests")
      .update({ status })
      .eq("club_id", clubId)
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setInviteRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    toast({ title: status === "approved" ? "Approved" : "Updated" });
  };

  const handleCreateInvite = async (prefillEmail?: string) => {
    if (!clubId) return;

    const token = generateToken();
    const tokenHash = await hashToken(token);

    const days = Number(inviteDays);
    const expiresAt = Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from("club_invites")
      .insert({
        club_id: clubId,
        email: (prefillEmail ?? inviteEmail).trim() ? (prefillEmail ?? inviteEmail).trim().toLowerCase() : null,
        role: inviteRole,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setCreatedInviteToken(token);
    toast({ title: "Invite created", description: "Copy the token/link now — it won’t be shown again." });
    await fetchInvitesData();
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
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
      <AppHeader
        title="Members"
        subtitle={tab === "members" ? "Roster" : (clubName ? `${clubName} · Invites` : "Invites")}
        rightSlot={
          tab === "members" ? (
            <Button size="sm" className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Add Member
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
              onClick={() => {
                setCreatedInviteToken(null);
                setInviteEmail("");
                setInviteRole("member");
                setInviteDays("7");
                setShowCreateInvite(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-1" /> Create Invite
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          <button
            onClick={() => setTab("members")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "members" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Members
          </button>
          <button
            onClick={() => setTab("invites")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "invites" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="w-4 h-4" /> Invites
          </button>
        </div>
      </div>

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
            {tab === "members" ? (
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
            ) : (
              <>
                {(invitesLoading) ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Invite requests */}
                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-primary" /> Invite Requests
                          </div>
                          <div className="text-xs text-muted-foreground">Approve → then create an invite token for them.</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchInvitesData()}>Refresh</Button>
                      </div>

                      {inviteRequests.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">No invite requests yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {inviteRequests.map((r) => (
                            <div key={r.id} className="p-4 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  r.status === "pending" ? "bg-primary/10 text-primary" : r.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                                }`}>{r.status}</span>
                              </div>
                              {r.message && <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.message}</div>}
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleString()}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={r.status !== "pending"}
                                    onClick={() => handleUpdateInviteRequestStatus(r.id, "rejected")}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-gradient-gold text-primary-foreground hover:opacity-90"
                                    disabled={r.status !== "pending"}
                                    onClick={async () => {
                                      await handleUpdateInviteRequestStatus(r.id, "approved");
                                      setInviteEmail(r.email);
                                      setInviteRole("member");
                                      setInviteDays("7");
                                      setCreatedInviteToken(null);
                                      setShowCreateInvite(true);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Invites */}
                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-primary" /> Active Invites
                          </div>
                          <div className="text-xs text-muted-foreground">Tokens are hashed in DB. Raw tokens are shown only at creation time.</div>
                        </div>
                      </div>

                      {invites.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">No invites created yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {invites.map((inv) => (
                            <div key={inv.id} className="p-4 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{inv.email || "(no email)"}</div>
                                  <div className="text-xs text-muted-foreground">role: {inv.role}</div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  inv.used_at ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                                }`}>{inv.used_at ? "used" : "unused"}</span>
                              </div>
                              <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                                <span>created {new Date(inv.created_at).toLocaleDateString()}</span>
                                <span>{inv.expires_at ? `expires ${new Date(inv.expires_at).toLocaleDateString()}` : "no expiry"}</span>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canRevokeInvite(inv)}
                                  onClick={async () => {
                                    if (!clubId) return;
                                    const { error } = await supabase
                                      .from("club_invites")
                                      .delete()
                                      .eq("club_id", clubId)
                                      .eq("id", inv.id);
                                    if (error) {
                                      toast({ title: "Error", description: error.message, variant: "destructive" });
                                      return;
                                    }
                                    setInvites((prev) => prev.filter((x) => x.id !== inv.id));
                                    toast({ title: "Invite revoked" });
                                  }}
                                  className="h-7 text-[10px]"
                                >
                                  Revoke
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Create Invite Modal */}
                {showCreateInvite && (
                  <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateInvite(false)}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-foreground tracking-tight">Create invite</h3>
                          <p className="text-xs text-muted-foreground">iOS-style: simple, clear, fast.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowCreateInvite(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <Input
                          placeholder="Email (optional)"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="bg-background/60"
                          maxLength={254}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground"
                          >
                            <option value="member">Member</option>
                            <option value="player">Player</option>
                            <option value="trainer">Trainer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <select
                            value={inviteDays}
                            onChange={(e) => setInviteDays(e.target.value)}
                            className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground"
                          >
                            <option value="1">1 day</option>
                            <option value="3">3 days</option>
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                            <option value="0">No expiry</option>
                          </select>
                        </div>

                        <Button
                          onClick={() => handleCreateInvite()}
                          className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Create token
                        </Button>

                        {createdInviteToken && (
                          <div className="mt-2 p-4 rounded-2xl border border-border/60 bg-background/40">
                            <div className="text-[10px] text-muted-foreground mb-1">Invite token (copy now)</div>
                            <div className="font-mono text-xs text-foreground break-all">{createdInviteToken}</div>
                            <div className="mt-3 grid gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleCopy(createdInviteToken)}
                                className="w-full"
                              >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? "Copied" : "Copy token"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const qs = new URLSearchParams({ invite: createdInviteToken });
                                  if (clubSlug) qs.set("club", clubSlug);
                                  const link = `${window.location.origin}/onboarding?${qs.toString()}`;
                                  void handleCopy(link);
                                }}
                                className="w-full"
                              >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                                Copy invite link
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
