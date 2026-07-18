import { useRef } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
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

export interface ClubMemberPassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: Partial<ClubMemberMasterRecord>;
  displayName?: string;
  clubName?: string | null;
  logoSrc?: string;
  membershipRole?: string;
  teamLabel?: string;
  readOnly?: boolean;
  onGenerateId?: () => void;
  onDownloadComplete?: () => void;
  /** Public club microsite: white readable chrome + light pass card. */
  appearance?: "default" | "publicClub";
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
  teamLabel,
  readOnly = true,
  onGenerateId,
  onDownloadComplete,
  appearance = "default",
  labels,
}: ClubMemberPassModalProps) {
  const cardRef = useRef<ClubMemberPassCardHandle>(null);
  const isPublicClub = appearance === "publicClub";

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
          {displayName ? (
            <p
              className={cn(
                "mt-1 truncate text-sm",
                isPublicClub ? "text-neutral-600" : "text-muted-foreground",
              )}
            >
              {displayName}
            </p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <ClubMemberPassCard
            ref={cardRef}
            values={values}
            displayName={displayName}
            clubName={clubName}
            logoSrc={logoSrc}
            membershipRole={membershipRole}
            teamLabel={teamLabel}
            readOnly={readOnly}
            showControls={!readOnly || Boolean(onGenerateId)}
            theme={isPublicClub ? "light" : undefined}
            onGenerateId={onGenerateId}
            onDownloadComplete={onDownloadComplete}
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
                ? "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900"
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
    title: t.membersPage.clubPassModalTitle,
    close: t.common.close,
  };
}
