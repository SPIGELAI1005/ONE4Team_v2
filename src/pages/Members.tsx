import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Search, Plus, Filter, ArrowLeft,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Mail, Phone, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  team: string;
  position?: string;
  ageGroup?: string;
  status: "active" | "inactive";
  joinedAt: string;
  attendance: number;
};

const mockMembers: Member[] = [
  { id: "1", name: "Max Müller", email: "max@club.de", phone: "+49 151 1234567", roles: ["player"], team: "First Team", position: "Midfielder", ageGroup: "Senior", status: "active", joinedAt: "2023-01-15", attendance: 92 },
  { id: "2", name: "Sarah Chen", email: "sarah@club.de", phone: "+49 152 2345678", roles: ["trainer"], team: "U19 Youth", status: "active", joinedAt: "2021-08-01", attendance: 98 },
  { id: "3", name: "Tom Weber", email: "tom@club.de", phone: "+49 153 3456789", roles: ["player", "staff"], team: "First Team", position: "Goalkeeper", ageGroup: "Senior", status: "active", joinedAt: "2022-03-10", attendance: 85 },
  { id: "4", name: "Lisa Park", email: "lisa@club.de", phone: "+49 154 4567890", roles: ["trainer", "admin"], team: "Women's Team", status: "active", joinedAt: "2020-06-15", attendance: 95 },
  { id: "5", name: "Kenji Yamamoto", email: "kenji@club.de", phone: "+49 155 5678901", roles: ["player"], team: "U17 Development", position: "Striker", ageGroup: "U17", status: "active", joinedAt: "2024-01-20", attendance: 78 },
  { id: "6", name: "Anna Schmidt", email: "anna@club.de", phone: "+49 156 6789012", roles: ["member", "parent"], team: "-", status: "active", joinedAt: "2023-09-01", attendance: 60 },
  { id: "7", name: "Marco Ruiz", email: "marco@club.de", phone: "+49 157 7890123", roles: ["trainer"], team: "U17 Development", status: "active", joinedAt: "2022-07-01", attendance: 96 },
  { id: "8", name: "Eva Braun", email: "eva@club.de", phone: "+49 158 8901234", roles: ["player"], team: "Women's Team", position: "Defender", ageGroup: "Senior", status: "inactive", joinedAt: "2021-11-20", attendance: 45 },
];

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
};

const Members = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const filtered = mockMembers.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

  const allRoles = ["all", "admin", "trainer", "player", "staff", "member", "parent"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/admin")}>
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
                {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Members", value: mockMembers.length, color: "text-foreground" },
            { label: "Active", value: mockMembers.filter(m => m.status === "active").length, color: "text-primary" },
            { label: "Players", value: mockMembers.filter(m => m.roles.includes("player")).length, color: "text-blue-400" },
            { label: "Trainers", value: mockMembers.filter(m => m.roles.includes("trainer")).length, color: "text-accent" },
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
              <div className="hidden sm:grid grid-cols-[1fr_120px_140px_80px_40px] gap-2 px-4 py-3 border-b border-border text-xs text-muted-foreground font-medium">
                <span>Member</span>
                <span>Roles</span>
                <span>Team</span>
                <span>Status</span>
                <span></span>
              </div>
              {filtered.map((member, i) => (
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
                  <div className="sm:grid sm:grid-cols-[1fr_120px_140px_80px_40px] sm:gap-2 sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 sm:mt-0 flex-wrap">
                      {member.roles.map((r) => (
                        <span key={r} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColors[r] || "bg-muted text-muted-foreground"}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground">{member.team}</div>
                    <div className="hidden sm:block">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        member.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {member.status}
                      </span>
                    </div>
                    <div className="hidden sm:flex justify-end">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">No members found.</div>
              )}
            </div>
          </div>

          {/* Member Detail Panel */}
          {selectedMember && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-80 shrink-0"
            >
              <div className="rounded-xl bg-card border border-border p-5 sticky top-24">
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <span className="text-sm text-muted-foreground">Member Detail</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                </div>
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-3">
                    {selectedMember.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <h3 className="font-display font-bold text-foreground">{selectedMember.name}</h3>
                  <div className="flex gap-1.5 justify-center mt-2">
                    {selectedMember.roles.map((r) => {
                      const Icon = roleIcons[r] || Users;
                      return (
                        <span key={r} className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${roleColors[r]}`}>
                          <Icon className="w-3 h-3" /> {r}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> {selectedMember.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /> {selectedMember.phone}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" /> {selectedMember.team}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" /> Joined {selectedMember.joinedAt}
                  </div>
                </div>

                {selectedMember.position && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Player Attributes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="text-[10px] text-muted-foreground">Position</div>
                        <div className="text-sm font-medium text-foreground">{selectedMember.position}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="text-[10px] text-muted-foreground">Age Group</div>
                        <div className="text-sm font-medium text-foreground">{selectedMember.ageGroup}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 col-span-2">
                        <div className="text-[10px] text-muted-foreground">Attendance</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-gold"
                              style={{ width: `${selectedMember.attendance}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{selectedMember.attendance}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-accent border-accent/30 hover:bg-accent/10">Remove</Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Members;
