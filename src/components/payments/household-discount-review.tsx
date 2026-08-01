import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Percent, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import {
  buildHouseholdDiscountGroups,
  householdRefFromMasterLike,
  type HouseholdDiscountGroup,
  type HouseholdDiscountStatus,
} from "@/lib/member-household-discount";

interface HouseholdDiscountReviewPanelProps {
  clubId: string;
  canManage: boolean;
}

export function HouseholdDiscountReviewPanel({ clubId, canManage }: HouseholdDiscountReviewPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [masters, setMasters] = useState<Array<ClubMemberMasterRecord & { membership_id: string }>>([]);
  const [emailsByMembership, setEmailsByMembership] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [masterRes, emailRes] = await Promise.all([
      supabase
        .from("club_member_master_records")
        .select("*")
        .eq("club_id", clubId)
        .not("household_discount_group_id", "is", null),
      supabase.rpc("list_club_membership_emails", { _club_id: clubId }),
    ]);
    setMasters((masterRes.data as Array<ClubMemberMasterRecord & { membership_id: string }>) ?? []);
    const emailMap: Record<string, string> = {};
    for (const row of (emailRes.data as Array<{ membership_id: string; email: string }> | null) ?? []) {
      if (row.membership_id && row.email) emailMap[row.membership_id] = row.email;
    }
    setEmailsByMembership(emailMap);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingGroups = useMemo(() => {
    const refs = masters
      .filter((m) => m.household_discount_status === "pending_verification")
      .map((m) =>
        householdRefFromMasterLike(m.membership_id, emailsByMembership[m.membership_id] || "", m, {
          membershipId: m.membership_id,
        }),
      );
    return buildHouseholdDiscountGroups(refs).filter((g) => g.eligibleForFamilyDiscount);
  }, [emailsByMembership, masters]);

  const updateGroupStatus = async (group: HouseholdDiscountGroup, status: HouseholdDiscountStatus) => {
    if (!canManage) return;
    setBusyGroupId(group.groupId);
    try {
      const membershipIds = group.members.map((m) => m.membershipId).filter(Boolean) as string[];
      if (!membershipIds.length) return;

      for (const membershipId of membershipIds) {
        const existing = masters.find((m) => m.membership_id === membershipId);
        if (!existing) continue;
        const { error } = await supabase
          .from("club_member_master_records")
          .upsert(
            {
              ...existing,
              membership_id: membershipId,
              club_id: clubId,
              household_discount_group_id: group.groupId,
              household_discount_status: status,
            },
            { onConflict: "membership_id" },
          );
        if (error) throw error;
      }

      toast({
        title:
          status === "verified"
            ? t.payments.householdDiscountVerifiedTitle
            : t.payments.householdDiscountRejectedTitle,
        description: t.payments.householdDiscountVerifiedDesc.replace("{count}", String(membershipIds.length)),
      });
      await load();
    } catch (error) {
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setBusyGroupId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t.payments.householdDiscountLoading}
      </div>
    );
  }

  if (!pendingGroups.length) return null;

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Percent className="w-4 h-4 text-violet-300 mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium text-foreground">{t.payments.householdDiscountReviewTitle}</div>
          <p className="text-xs text-muted-foreground mt-1">{t.payments.householdDiscountReviewDesc}</p>
        </div>
      </div>
      <div className="space-y-2">
        {pendingGroups.map((group) => (
          <div
            key={group.groupId}
            className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 justify-between"
          >
            <div className="min-w-0 text-xs">
              <div className="font-medium text-foreground">
                {group.lastName} · {group.email} · {group.members.length} {t.payments.householdDiscountMembersLabel}
              </div>
              <div className="text-muted-foreground mt-0.5">{group.addressLabel}</div>
              <div className="text-muted-foreground mt-1">
                {group.members
                  .map((m) => [m.firstName, m.lastName].filter(Boolean).join(" "))
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            {canManage ? (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  disabled={busyGroupId === group.groupId}
                  onClick={() => void updateGroupStatus(group, "verified")}
                >
                  {busyGroupId === group.groupId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  {t.payments.householdDiscountVerify}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={busyGroupId === group.groupId}
                  onClick={() => void updateGroupStatus(group, "rejected")}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  {t.payments.householdDiscountReject}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
