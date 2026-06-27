import { TrainingAttendanceRsvp } from "@/components/activities/training-attendance-rsvp";
import { TrainingAttendanceOverview } from "@/components/activities/training-attendance-overview";
import { useLanguage } from "@/hooks/use-language";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubAttendance } from "@/contexts/public-club-attendance-context";
import type { PublicClubRsvpTarget } from "@/lib/public-club-attendance";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError, isRlsOrPermissionError } from "@/lib/supabase-error";
import { publicClubCssVars } from "@/components/public-club/club-theme-provider";

interface PublicClubAttendanceRsvpProps {
  title: string;
  target: PublicClubRsvpTarget;
  className?: string;
  compact?: boolean;
}

export function PublicClubAttendanceRsvp({ title, target, className, compact = false }: PublicClubAttendanceRsvpProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, club, basePath, searchSuffix, goToAuthWithReturn } = usePublicClub();
  const { canRsvp, busyActivityId, attendanceByActivityId, getActivityOverview, canMemberRespond, isRsvpOpenForTarget, resolveActivityId, respond } =
    usePublicClubAttendance();

  const activityId = resolveActivityId(target);
  const myAttendance = activityId ? attendanceByActivityId[activityId] ?? null : null;
  const overview = activityId ? getActivityOverview(activityId) : null;
  const rsvpOpen = isRsvpOpenForTarget(target);
  const invited = activityId ? canMemberRespond(activityId) : false;

  const labels = {
    coming: t.clubPage.attendanceComing,
    notComing: t.clubPage.attendanceNotComing,
    changeResponse: t.clubPage.attendanceYourResponse,
    statusComing: t.clubPage.attendanceStatusComing,
    statusNotComing: t.clubPage.attendanceStatusNotComing,
    statusPending: t.clubPage.attendanceStatusPending,
    declineTitle: t.clubPage.attendanceDeclineTitle,
    declineDescription: t.clubPage.attendanceDeclineDescription,
    declineReasonLabel: t.clubPage.attendanceDeclineReasonLabel,
    declineReasonPlaceholder: t.clubPage.attendanceDeclineReasonPlaceholder,
    declineConfirm: t.clubPage.attendanceDeclineConfirm,
    declineCancel: t.common.cancel,
    reasonRequired: t.clubPage.attendanceReasonRequired,
    presets: [
      { id: "injury", label: t.clubPage.attendancePresetInjury },
      { id: "illness", label: t.clubPage.attendancePresetIllness },
      { id: "school", label: t.clubPage.attendancePresetSchool },
      { id: "work", label: t.clubPage.attendancePresetWork },
      { id: "vacation", label: t.clubPage.attendancePresetVacation },
    ],
  };

  const overviewLabels = {
    sectionTitle: t.clubPage.attendanceTeamOverview,
    summaryHeadline: t.clubPage.attendanceSummaryHeadline,
    statComing: t.clubPage.attendanceStatComing,
    statDeclined: t.clubPage.attendanceStatDeclined,
    statPending: t.clubPage.attendanceStatPending,
    comingList: t.clubPage.attendanceComingList,
    declinedList: t.clubPage.attendanceDeclinedList,
    noResponsesYet: t.clubPage.attendanceNoRosterYet,
  };

  if (!user) {
    return (
      <p className={cn("text-[11px] text-[color:var(--club-muted)]", className)}>
        <button
          type="button"
          className="font-semibold text-[color:var(--club-primary)] underline-offset-2 hover:underline"
          onClick={() => goToAuthWithReturn(`${basePath}${searchSuffix}`)}
        >
          {t.clubPage.attendanceSignIn}
        </button>{" "}
        {t.clubPage.attendanceSignInHint}
      </p>
    );
  }

  if (!canRsvp) {
    return (
      <p className={cn("text-[11px] text-[color:var(--club-muted)]", className)}>{t.clubPage.attendanceMembersOnly}</p>
    );
  }

  if (!activityId) {
    return (
      <p className={cn("text-[11px] text-[color:var(--club-muted)]", className)}>{t.clubPage.attendanceUnavailable}</p>
    );
  }

  if (!invited) {
    return (
      <p className={cn("text-[11px] text-[color:var(--club-muted)]", className)}>{t.clubPage.attendanceNotInvited}</p>
    );
  }

  return (
    <div
      className={cn(compact ? "mt-3 space-y-3" : "mt-4 space-y-3", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {overview ? (
        <TrainingAttendanceOverview overview={overview} variant="club" labels={overviewLabels} />
      ) : null}

      <TrainingAttendanceRsvp
        activityTitle={title}
        myAttendance={myAttendance}
        busy={busyActivityId === activityId}
        variant="club"
        clubDialogStyle={publicClubCssVars(club)}
        rsvpClosed={!rsvpOpen}
        rsvpClosedMessage={t.clubPage.attendanceRsvpClosedTraining}
        onRespond={async (status, notes) => {
          try {
            await respond(activityId, status, notes);
            toast({
              title: status === "confirmed" ? t.clubPage.attendanceConfirmedToast : t.clubPage.attendanceDeclinedToast,
            });
          } catch (err: unknown) {
            const msg =
              err instanceof Error && err.message === "RSVP window closed"
                ? t.clubPage.attendanceRsvpClosedTraining
                : err instanceof Error && err.message === "Not invited"
                  ? t.clubPage.attendanceNotInvited
                  : isRlsOrPermissionError(err)
                    ? t.clubPage.attendanceRsvpPermissionDenied
                    : formatSupabaseError(err) || t.clubPage.attendanceRsvpFailed;
            toast({ title: t.common.error, description: msg, variant: "destructive" });
          }
        }}
        labels={labels}
      />
    </div>
  );
}
