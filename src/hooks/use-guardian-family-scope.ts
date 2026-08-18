import { useCallback, useEffect, useMemo, useState } from "react";
import { useMembershipId } from "@/hooks/use-membership-id";
import { resolveFamilyMembershipIds } from "@/lib/guardian-family-scope";
import { listGuardianWardSummaries, type GuardianWardSummary } from "@/lib/member-guardian-api";

export function useGuardianFamilyScope(clubId: string | null | undefined) {
  const { membershipId: ownMembershipId, loading: ownMembershipLoading } = useMembershipId();
  const [wards, setWards] = useState<GuardianWardSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId || !ownMembershipId) {
      setWards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await listGuardianWardSummaries(clubId, ownMembershipId);
    setWards(error ? [] : data);
    setLoading(false);
  }, [clubId, ownMembershipId]);

  useEffect(() => {
    if (ownMembershipLoading) return;
    void reload();
  }, [ownMembershipLoading, reload]);

  const wardMembershipIds = useMemo(
    () => wards.map((ward) => ward.wardMembershipId),
    [wards],
  );

  const familyMembershipIds = useMemo(
    () => resolveFamilyMembershipIds(ownMembershipId, wardMembershipIds),
    [ownMembershipId, wardMembershipIds],
  );

  return {
    ownMembershipId,
    wards,
    wardMembershipIds,
    familyMembershipIds,
    hasGuardianWards: wardMembershipIds.length > 0,
    loading: ownMembershipLoading || loading,
    reload,
  };
}
