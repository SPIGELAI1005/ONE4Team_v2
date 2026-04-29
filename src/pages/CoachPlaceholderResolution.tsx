import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(String(value));
  }
  return out;
}

interface CoachPlaceholder {
  id: string;
  display_name: string;
  resolved_membership_id: string | null;
}

interface MembershipOption {
  id: string;
  role: string;
  profiles?: { display_name: string | null } | null;
}

export default function CoachPlaceholderResolution() {
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const { t } = useLanguage();
  const cp = t.coachPlaceholdersPage;

  const [placeholders, setPlaceholders] = useState<CoachPlaceholder[]>([]);
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [selectedMembershipIdByPlaceholderId, setSelectedMembershipIdByPlaceholderId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clubLoading || !clubId) return;
    let isCancelled = false;
    setIsLoading(true);
    void Promise.all([
      supabase
        .from("club_person_placeholders")
        .select("id, display_name, resolved_membership_id")
        .eq("club_id", clubId)
        .eq("kind", "coach")
        .order("display_name", { ascending: true }),
      supabase
        .from("club_memberships")
        .select("id, role, profiles(display_name)")
        .eq("club_id", clubId)
        .eq("status", "active")
        .in("role", ["admin", "trainer"])
        .order("created_at", { ascending: true }),
    ])
      .then(([pRes, mRes]) => {
        if (isCancelled) return;
        if (pRes.error) throw pRes.error;
        if (mRes.error) throw mRes.error;
        setPlaceholders((pRes.data ?? []) as CoachPlaceholder[]);
        setMemberships((mRes.data ?? []) as MembershipOption[]);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : cp.loadFailed;
        toast({ title: t.common.error, description: message, variant: "destructive" });
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [clubId, clubLoading, cp.loadFailed, t.common.error, toast]);

  const membershipLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of memberships) {
      const name = m.profiles?.display_name || m.id;
      const roleLabel =
        m.role === "admin" ? cp.roleAdmin : m.role === "trainer" ? cp.roleTrainer : m.role;
      map.set(m.id, fill(cp.membershipLine, { name, role: roleLabel }));
    }
    return map;
  }, [cp, memberships]);

  async function handleResolve(placeholder: CoachPlaceholder) {
    if (!clubId) return;
    const membershipId = selectedMembershipIdByPlaceholderId[placeholder.id];
    if (!membershipId) {
      toast({
        title: cp.toastSelectMemberTitle,
        description: cp.toastSelectMemberDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Find all team links via placeholder.
      const { data: teamCoachRows, error: teamCoachError } = await supabase
        .from("team_coaches")
        .select("id, team_id, placeholder_id")
        .eq("placeholder_id", placeholder.id);
      if (teamCoachError) throw teamCoachError;

      const teamIds = Array.from(new Set((teamCoachRows ?? []).map((r) => r.team_id)));
      if (teamIds.length > 0) {
        // Insert membership-based coach links (ignore if already exists)
        const { error: upsertError } = await supabase.from("team_coaches").upsert(
          teamIds.map((team_id) => ({ team_id, membership_id: membershipId })),
          { onConflict: "team_id,membership_id" },
        );
        if (upsertError) throw upsertError;

        // Remove placeholder-based links
        const { error: deleteError } = await supabase.from("team_coaches").delete().eq("placeholder_id", placeholder.id);
        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from("club_person_placeholders")
        .update({ resolved_membership_id: membershipId })
        .eq("club_id", clubId)
        .eq("id", placeholder.id);
      if (updateError) throw updateError;

      setPlaceholders((prev) => prev.map((p) => (p.id === placeholder.id ? { ...p, resolved_membership_id: membershipId } : p)));
      toast({
        title: cp.toastResolvedTitle,
        description: fill(cp.toastResolvedDesc, {
          name: placeholder.display_name,
          membership: membershipLabelById.get(membershipId) ?? membershipId,
        }),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : cp.resolveFailedGeneric;
      toast({ title: cp.resolveFailedTitle, description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{cp.title}</CardTitle>
          <CardDescription>{cp.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {cp.clubPrefix} {clubId || "—"}
          </div>

          {placeholders.length === 0 ? (
            <div className="text-sm text-muted-foreground">{isLoading ? cp.loading : cp.empty}</div>
          ) : (
            <div className="space-y-2">
              {placeholders.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-border/60 p-3">
                  <div className="flex-1">
                    <div className="font-medium">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.resolved_membership_id
                        ? `${cp.resolvedPrefix} ${membershipLabelById.get(p.resolved_membership_id) ?? p.resolved_membership_id}`
                        : cp.unresolved}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedMembershipIdByPlaceholderId[p.id] || ""}
                      onValueChange={(value) => setSelectedMembershipIdByPlaceholderId((prev) => ({ ...prev, [p.id]: value }))}
                      disabled={Boolean(p.resolved_membership_id)}
                    >
                      <SelectTrigger className="w-[320px] max-w-full">
                        <SelectValue placeholder={cp.selectMembershipPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {memberships.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {membershipLabelById.get(m.id) ?? m.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button disabled={isLoading || Boolean(p.resolved_membership_id)} onClick={() => void handleResolve(p)}>
                      {cp.resolve}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

