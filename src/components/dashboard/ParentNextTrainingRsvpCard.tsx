import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useGuardianFamilyScope } from "@/hooks/use-guardian-family-scope";
import { upsertActivityAttendanceResponse } from "@/lib/activity-attendance-api";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_CARD } from "@/lib/dashboard-page-shell";

type TrainingActivity = {
  id: string;
  title: string;
  starts_at: string;
};

interface ParentNextTrainingRsvpCardProps {
  clubId: string | null;
}

export function ParentNextTrainingRsvpCard({ clubId }: ParentNextTrainingRsvpCardProps) {
  const { t } = useLanguage();
  const family = useGuardianFamilyScope(clubId);
  const [activity, setActivity] = useState<TrainingActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [childId, setChildId] = useState<string>("");

  const wards = family.wards;

  const loadNextTraining = useCallback(async () => {
    if (!clubId) {
      setActivity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("activities")
      .select("id, title, starts_at")
      .eq("club_id", clubId)
      .eq("type", "training")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setActivity((data as TrainingActivity | null) ?? null);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void loadNextTraining();
  }, [loadNextTraining]);

  useEffect(() => {
    if (!childId && wards.length) setChildId(wards[0]!.wardMembershipId);
  }, [childId, wards]);

  const childLabel = useMemo(
    () => wards.find((w) => w.wardMembershipId === childId)?.displayName ?? "",
    [childId, wards],
  );

  async function respond(status: "confirmed" | "declined") {
    if (!activity || !childId) return;
    setBusy(true);
    const result = await upsertActivityAttendanceResponse({
      activityId: activity.id,
      membershipId: childId,
      status,
      responseReason: status === "declined" ? "other" : null,
      notes: status === "declined" ? "Dashboard quick RSVP" : null,
    });
    setBusy(false);
    if (!result.ok) return;
    void loadNextTraining();
  }

  if (!clubId || !wards.length) return null;

  return (
    <div className={DASHBOARD_CARD} data-testid="parent-next-rsvp-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-foreground">{t.dashboard.parentRsvpTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.dashboard.parentRsvpSubtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !activity ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.parentRsvpNone}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <div className="font-medium text-foreground">{activity.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(activity.starts_at).toLocaleString()}
            </div>
          </div>

          {wards.length > 1 ? (
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="h-9 rounded-xl" data-testid="parent-rsvp-child-picker">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wards.map((ward) => (
                  <SelectItem key={ward.wardMembershipId} value={ward.wardMembershipId}>
                    {ward.displayName ?? ward.wardMembershipId.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">{childLabel}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              disabled={busy}
              data-testid="parent-rsvp-coming"
              onClick={() => void respond("confirmed")}
            >
              {t.dashboard.parentRsvpComing}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              data-testid="parent-rsvp-declined"
              onClick={() => void respond("declined")}
            >
              {t.dashboard.parentRsvpNotComing}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" asChild>
              <Link to="/activities">{t.dashboard.parentRsvpOpenActivities}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
