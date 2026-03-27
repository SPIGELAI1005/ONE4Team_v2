import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Trash2, Loader2, Users } from "lucide-react";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { useLanguage } from "@/hooks/use-language";
import type { ClubRoleKind, ClubRoleScope, ClubRoleAssignmentRow } from "@/lib/club-role-assignments";

interface MemberOption {
  membership_id: string;
  display_name: string;
  role: string;
}

const ROLE_KINDS: { value: ClubRoleKind; label: string }[] = [
  { value: "club_admin", label: "clubAdmin" },
  { value: "team_admin", label: "teamAdmin" },
  { value: "trainer", label: "trainer" },
  { value: "player", label: "player" },
  { value: "player_teen", label: "playerTeen" },
  { value: "player_adult", label: "playerAdult" },
  { value: "parent", label: "parent" },
  { value: "staff", label: "staff" },
  { value: "member", label: "member" },
  { value: "sponsor", label: "sponsor" },
  { value: "supplier", label: "supplier" },
  { value: "service_provider", label: "serviceProvider" },
  { value: "consultant", label: "consultant" },
];

const SCOPES: { value: ClubRoleScope; label: string }[] = [
  { value: "club", label: "clubWide" },
  { value: "team", label: "teamScoped" },
  { value: "self", label: "self" },
];

interface TeamOption {
  id: string;
  name: string;
}

export function RoleManager() {
  const { clubId } = useClubId();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [assignments, setAssignments] = useState<ClubRoleAssignmentRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState("");
  const [selectedRoleKind, setSelectedRoleKind] = useState<ClubRoleKind>("member");
  const [selectedScope, setSelectedScope] = useState<ClubRoleScope>("club");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [assignRes, memberRes, teamRes] = await Promise.all([
        supabaseDynamic
          .from("club_role_assignments")
          .select("*")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false }),
        supabaseDynamic
          .from("club_memberships")
          .select("id, role, user_id, profiles:profiles(display_name)")
          .eq("club_id", clubId)
          .eq("status", "active"),
        supabaseDynamic
          .from("teams")
          .select("id, name")
          .eq("club_id", clubId),
      ]);

      setAssignments((assignRes.data as unknown as ClubRoleAssignmentRow[]) || []);

      const memberRows = (memberRes.data || []) as unknown as Array<{
        id: string;
        role: string;
        profiles: { display_name: string | null } | null;
      }>;
      setMembers(
        memberRows.map((m) => ({
          membership_id: m.id,
          display_name: m.profiles?.display_name || t.membersPage.unknownMember,
          role: m.role,
        }))
      );

      setTeams((teamRes.data as unknown as TeamOption[]) || []);
    } catch {
      toast({ title: t.common.error, description: t.membersPage.roles.failedToLoad, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast, t.common.error]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!clubId || !selectedMembership || !selectedRoleKind) return;

    const payload: Record<string, unknown> = {
      club_id: clubId,
      membership_id: selectedMembership,
      role_kind: selectedRoleKind,
      scope: selectedScope,
    };
    if (selectedScope === "team" && selectedTeamId) {
      payload.scope_team_id = selectedTeamId;
    }

    const { error } = await supabaseDynamic.from("club_role_assignments").insert(payload);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t.membersPage.roles.toastAssigned });
    setShowAddForm(false);
    setSelectedMembership("");
    setSelectedRoleKind("member");
    setSelectedScope("club");
    setSelectedTeamId("");
    await loadData();
  };

  const handleRemove = async (id: string) => {
    if (!clubId) return;
    const { error } = await supabaseDynamic.from("club_role_assignments").delete().eq("id", id).eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.membersPage.roles.toastRemoved });
    await loadData();
  };

  const getMemberName = (membershipId: string) => {
    return members.find((m) => m.membership_id === membershipId)?.display_name || t.common.unknown;
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId)?.name || teamId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold-subtle flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-sm">{t.membersPage.roles.title}</h3>
            <p className="text-xs text-muted-foreground">{assignments.length} {t.membersPage.roles.activeAssignments}</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-1" /> {t.membersPage.roles.assignRole}
        </Button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.membersPage.roles.memberLabel}</label>
              <Select value={selectedMembership || "__none"} onValueChange={(v) => setSelectedMembership(v === "__none" ? "" : v)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50">
                  <SelectValue placeholder={t.membersPage.roles.selectMember} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.membersPage.roles.selectMemberEllipsis}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.membership_id} value={m.membership_id}>
                      {m.display_name} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.membersPage.roles.roleLabel}</label>
              <Select value={selectedRoleKind} onValueChange={(v) => setSelectedRoleKind(v as ClubRoleKind)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_KINDS.map((rk) => (
                    <SelectItem key={rk.value} value={rk.value}>{t.membersPage.roles.roleKinds[rk.label]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.membersPage.roles.scopeLabel}</label>
              <Select value={selectedScope} onValueChange={(v) => setSelectedScope(v as ClubRoleScope)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t.membersPage.roles.scopes[s.label]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedScope === "team" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.membersPage.roles.teamLabel}</label>
                <Select value={selectedTeamId || "__none"} onValueChange={(v) => setSelectedTeamId(v === "__none" ? "" : v)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50">
                    <SelectValue placeholder={t.membersPage.roles.selectTeam} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t.membersPage.roles.selectTeamEllipsis}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button
            onClick={() => void handleAdd()}
            disabled={!selectedMembership || !selectedRoleKind}
            className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
          >
            {t.membersPage.roles.assign}
          </Button>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t.membersPage.roles.empty}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {assignments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{getMemberName(a.membership_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.membersPage.roles.roleKinds[(ROLE_KINDS.find((rk) => rk.value === a.role_kind)?.label || a.role_kind) as keyof typeof t.membersPage.roles.roleKinds] ?? a.role_kind}
                    {" · "}
                    {t.membersPage.roles.scopes[(SCOPES.find((s) => s.value === a.scope)?.label || a.scope) as keyof typeof t.membersPage.roles.scopes] ?? a.scope}
                    {a.scope_team_id && ` · ${getTeamName(a.scope_team_id)}`}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleRemove(a.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
