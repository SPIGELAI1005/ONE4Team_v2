import { useRef } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import {
  ClubMemberPassCard,
  type ClubMemberPassCardHandle,
  type ClubMemberPassCardLabels,
} from "@/components/members/club-member-pass-card";
import {
  clubReadableModalOverlayClass,
  clubReadableModalPanelClass,
} from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";
import { useClubId } from "@/hooks/use-club-id";
import { useClubPassSkills } from "@/hooks/use-club-pass-skills";

export interface ClubMemberPassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: Partial<ClubMemberMasterRecord>;
  displayName?: string;
  clubName?: string | null;
  logoSrc?: string;
  membershipRole?: string;
  /** Player role gets skills back; other roles get club crest back. */
  isPlayer?: boolean;
  teamLabel?: string;
  readOnly?: boolean;
  onGenerateId?: () => void;
  onDownloadComplete?: () => void;
  /** Public club microsite: white readable chrome + light pass card. */
  appearance?: "default" | "publicClub";
  /** Enables skills back + AI market value when membership is known. */
  clubId?: string | null;
  membershipId?: string | null;
  labels: ClubMemberPassCardLabels & {
    title: string;
    close: string;
  };
}

export function ClubMemberPassModal({
  open,
  onOpenChange,
  values,
  displayName,
  clubName,
  logoSrc,
  membershipRole,
  isPlayer = false,
  teamLabel,
  readOnly = true,
  onGenerateId,
  onDownloadComplete,
  appearance = "default",
  clubId: clubIdProp,
  membershipId: membershipIdProp,
  labels,
}: ClubMemberPassModalProps) {
  const cardRef = useRef<ClubMemberPassCardHandle>(null);
  const isPublicClub = appearance === "publicClub";
  const { clubId: activeClubId } = useClubId();

  const resolvedClubId =
    clubIdProp ||
    (typeof values.club_id === "string" ? values.club_id : null) ||
    activeClubId ||
    null;
  const resolvedMembershipId =
    membershipIdProp ||
    (typeof values.membership_id === "string" ? values.membership_id : null) ||
    null;

  const {
    skillsSummary,
    levelLabel,
    xpValue,
    estimateGeneratedAt,
    estimateRefreshing,
    refreshEstimate,
  } = useClubPassSkills({
    clubId: resolvedClubId,
    membershipId: resolvedMembershipId,
    enabled: open && isPlayer,
    masterHints: {
      goalsCount: typeof values.goals_count === "number" ? values.goals_count : null,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={isPublicClub ? clubReadableModalOverlayClass : undefined}
        className={cn(
          "flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full",
          isPublicClub
            ? cn(clubReadableModalPanelClass, "text-neutral-900")
            : "border-border/80 bg-card/95 backdrop-blur-xl",
        )}
      >
        <DialogHeader
          className={cn(
            "space-y-0 px-4 py-4 text-left sm:px-5",
            isPublicClub ? "border-b border-neutral-200/80" : "border-b border-border/60",
          )}
        >
          <DialogTitle
            className={cn(
              "font-display text-lg",
              isPublicClub && "text-neutral-900",
            )}
          >
            {labels.title}
          </DialogTitle>
          <DialogDescription
            className={cn(
              displayName ? "mt-1 truncate" : "sr-only",
              isPublicClub ? "text-neutral-600" : "text-muted-foreground",
            )}
          >
            {displayName || labels.memberIdCard}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <ClubMemberPassCard
            key={`${resolvedClubId ?? "club"}-${resolvedMembershipId ?? "member"}`}
            ref={cardRef}
            values={values}
            displayName={displayName}
            clubName={clubName}
            logoSrc={logoSrc}
            membershipRole={membershipRole}
            isPlayer={isPlayer}
            teamLabel={teamLabel}
            readOnly={readOnly}
            showControls={!readOnly || Boolean(onGenerateId)}
            theme={isPublicClub ? "light" : undefined}
            onGenerateId={onGenerateId}
            onDownloadComplete={onDownloadComplete}
            skillsSummary={isPlayer ? skillsSummary : null}
            levelLabel={isPlayer ? levelLabel : undefined}
            xpValue={isPlayer ? xpValue : undefined}
            estimateGeneratedAt={isPlayer ? estimateGeneratedAt : null}
            estimateRefreshing={estimateRefreshing}
            onRefreshEstimate={
              isPlayer && resolvedClubId && resolvedMembershipId
                ? () => void refreshEstimate()
                : undefined
            }
            labels={labels}
          />
        </div>

        <div
          className={cn(
            "flex justify-end gap-2 px-4 py-4 sm:px-5",
            isPublicClub
              ? "border-t border-neutral-200/80 bg-white/80"
              : "border-t border-border/60 bg-background/80",
          )}
        >
          <Button
            variant="outline"
            className={
              isPublicClub
                ? "border-neutral-300 bg-white text-neutral-900 hover:bg-white hover:text-neutral-900"
                : undefined
            }
            onClick={() => onOpenChange(false)}
          >
            {labels.close}
          </Button>
          <Button
            className="bg-gradient-gold-static text-primary-foreground"
            disabled={!values.internal_club_number}
            onClick={() => void cardRef.current?.download()}
          >
            <Download className="mr-2 h-4 w-4" />
            {labels.downloadPass}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function buildClubMemberPassLabels(t: {
  membersPage: {
    masterGenerateId: string;
    masterDownloadPass: string;
    masterDownloadPassBtn: string;
    clubPassMemberSince: string;
    clubPassDateOfBirth: string;
    clubPassRole: string;
    clubPassTeam: string;
    clubPassIdNo: string;
    clubPassMembership: string;
    clubPassNumber: string;
    clubPassMemberIdCard: string;
    clubPassThemeLight: string;
    clubPassThemeDark: string;
    clubPassThemeGold: string;
    clubPassDownloadFailed: string;
    clubPassModalTitle: string;
    clubPassSkillsTitle: string;
    clubPassSkillsOverview: string;
    clubPassFlipHint: string;
    clubPassFlipClubHint: string;
    clubPassFlipBackHint: string;
    clubPassOverall: string;
    clubPassOverallFull: string;
    clubPassSkillTec: string;
    clubPassSkillFit: string;
    clubPassSkillTac: string;
    clubPassSkillMnd: string;
    clubPassSkillAtt: string;
    clubPassSkillCmp: string;
    clubPassSkillTecFull: string;
    clubPassSkillFitFull: string;
    clubPassSkillTacFull: string;
    clubPassSkillMndFull: string;
    clubPassSkillAttFull: string;
    clubPassSkillCmpFull: string;
    clubPassMarketValue: string;
    clubPassMarketValueAi: string;
    clubPassMarketInfoTitle: string;
    clubPassMarketInfoBody: string;
    clubPassMarketEstimatedOn: string;
    clubPassMarketRefresh: string;
    clubPassMarketConfidenceLow: string;
    clubPassMarketConfidenceMedium: string;
    clubPassMarketConfidenceHigh: string;
    clubPassNoProgress: string;
    clubPassLevel: string;
    clubPassXp: string;
  };
  common: { close: string };
}): ClubMemberPassCardLabels & { title: string; close: string } {
  return {
    generateId: t.membersPage.masterGenerateId,
    downloadPass: t.membersPage.masterDownloadPassBtn,
    memberSince: t.membersPage.clubPassMemberSince,
    dateOfBirth: t.membersPage.clubPassDateOfBirth,
    role: t.membersPage.clubPassRole,
    team: t.membersPage.clubPassTeam,
    idNo: t.membersPage.clubPassIdNo,
    membership: t.membersPage.clubPassMembership,
    passNumber: t.membersPage.clubPassNumber,
    memberIdCard: t.membersPage.clubPassMemberIdCard,
    themeLight: t.membersPage.clubPassThemeLight,
    themeDark: t.membersPage.clubPassThemeDark,
    themeGold: t.membersPage.clubPassThemeGold,
    downloadFailed: t.membersPage.clubPassDownloadFailed,
    skillsTitle: t.membersPage.clubPassSkillsTitle,
    skillsOverview: t.membersPage.clubPassSkillsOverview,
    flipHint: t.membersPage.clubPassFlipHint,
    flipClubHint: t.membersPage.clubPassFlipClubHint,
    flipBackHint: t.membersPage.clubPassFlipBackHint,
    overall: t.membersPage.clubPassOverall,
    overallFull: t.membersPage.clubPassOverallFull,
    skillTec: t.membersPage.clubPassSkillTec,
    skillFit: t.membersPage.clubPassSkillFit,
    skillTac: t.membersPage.clubPassSkillTac,
    skillMnd: t.membersPage.clubPassSkillMnd,
    skillAtt: t.membersPage.clubPassSkillAtt,
    skillCmp: t.membersPage.clubPassSkillCmp,
    skillTecFull: t.membersPage.clubPassSkillTecFull,
    skillFitFull: t.membersPage.clubPassSkillFitFull,
    skillTacFull: t.membersPage.clubPassSkillTacFull,
    skillMndFull: t.membersPage.clubPassSkillMndFull,
    skillAttFull: t.membersPage.clubPassSkillAttFull,
    skillCmpFull: t.membersPage.clubPassSkillCmpFull,
    marketValue: t.membersPage.clubPassMarketValue,
    marketValueAi: t.membersPage.clubPassMarketValueAi,
    marketInfoTitle: t.membersPage.clubPassMarketInfoTitle,
    marketInfoBody: t.membersPage.clubPassMarketInfoBody,
    marketEstimatedOn: t.membersPage.clubPassMarketEstimatedOn,
    marketRefresh: t.membersPage.clubPassMarketRefresh,
    marketConfidenceLow: t.membersPage.clubPassMarketConfidenceLow,
    marketConfidenceMedium: t.membersPage.clubPassMarketConfidenceMedium,
    marketConfidenceHigh: t.membersPage.clubPassMarketConfidenceHigh,
    noProgress: t.membersPage.clubPassNoProgress,
    level: t.membersPage.clubPassLevel,
    xp: t.membersPage.clubPassXp,
    title: t.membersPage.clubPassModalTitle,
    close: t.common.close,
  };
}
