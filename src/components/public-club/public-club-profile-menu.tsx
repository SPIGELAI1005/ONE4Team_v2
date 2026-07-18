import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, LogOut, Settings, Trophy } from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { isHomepageModuleEnabled } from "@/lib/public-page-flex-config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClubMemberPassModal, buildClubMemberPassLabels } from "@/components/members/club-member-pass-modal";
import { PublicClubAccountSettingsModal } from "@/components/public-club/public-club-account-settings-modal";
import { clubPublicDropdownContentClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

function displayInitials(name: string, email?: string | null) {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (fromName) return fromName;
  return (email?.[0] ?? "U").toUpperCase();
}

function formatRoleLabel(role: string | null, t: ReturnType<typeof useLanguage>["t"]) {
  if (!role) return "-";
  const key = role as keyof typeof t.membersPage.roles;
  return t.membersPage.roles[key] ?? role.replace(/_/g, " ");
}

export function PublicClubProfileMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const {
    club,
    membershipId,
    membershipRole,
    basePath,
    searchSuffix,
    openDashboardOrAuth,
  } = usePublicClub();

  const [masterRecord, setMasterRecord] = useState<Partial<ClubMemberMasterRecord> | null>(null);
  const [teamLabel, setTeamLabel] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const clubPassLabels = buildClubMemberPassLabels(t);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata?.display_name;
    if (typeof meta === "string" && meta.trim()) return meta.trim();
    const first = user?.user_metadata?.first_name;
    const last = user?.user_metadata?.last_name;
    if (typeof first === "string" || typeof last === "string") {
      return `${String(first ?? "").trim()} ${String(last ?? "").trim()}`.trim();
    }
    return user?.email?.split("@")[0] ?? t.clubPage.profileMenu;
  }, [t.clubPage.profileMenu, user]);

  useEffect(() => {
    if (!membershipId) {
      setMasterRecord(null);
      setTeamLabel("");
      return;
    }

    let cancelled = false;
    void (async () => {
      const [masterRes, teamRes] = await Promise.all([
        supabase.from("club_member_master_records").select("*").eq("membership_id", membershipId).maybeSingle(),
        supabase
          .from("team_players")
          .select("teams(name)")
          .eq("membership_id", membershipId),
      ]);

      if (cancelled) return;

      setMasterRecord((masterRes.data as ClubMemberMasterRecord | null) ?? null);

      const teamNames = (teamRes.data ?? [])
        .map((row) => {
          const teams = row.teams as { name?: string } | null;
          return teams?.name ?? "";
        })
        .filter(Boolean);
      setTeamLabel(teamNames.join(", "));
    })();

    return () => {
      cancelled = true;
    };
  }, [membershipId]);

  if (!user || !club) return null;

  const triggerStyle = {
    backgroundColor: "var(--club-primary)",
    color: readableTextOnSolid(club.primary_color || "#C4A052"),
    borderColor: "var(--club-border)",
  } as const;

  const handleOpenMemberCard = async () => {
    if (!membershipId) {
      void openDashboardOrAuth();
      return;
    }
    if (!masterRecord?.internal_club_number) {
      setLoadingCard(true);
      const { data } = await supabase
        .from("club_member_master_records")
        .select("*")
        .eq("membership_id", membershipId)
        .maybeSingle();
      setMasterRecord((data as ClubMemberMasterRecord | null) ?? null);
      setLoadingCard(false);
    }
    setCardOpen(true);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate(window.location.pathname + window.location.search, { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const roleLabel = formatRoleLabel(membershipRole, t);
  const cardValues = masterRecord ?? {};
  const showMyProgress = isHomepageModuleEnabled(club.publicPageLayout, "myProgress");
  const progressHref = `${basePath}/${PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS.progress}${searchSuffix}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-9 w-9 shrink-0 rounded-md border p-0 font-semibold shadow-sm hover:brightness-110",
              className,
            )}
            style={triggerStyle}
            aria-label={t.clubPage.profileMenu}
          >
            {displayInitials(displayName, user.email)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={clubPublicDropdownContentClass}>
          <DropdownMenuLabel className="space-y-1 font-normal">
            <p className="text-sm font-semibold">{displayName}</p>
            {user.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
            {membershipRole ? (
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {showMyProgress ? (
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate(progressHref)}
            >
              <Trophy className="h-4 w-4" />
              {t.clubPage.profileMyProgress ?? t.clubProgress.sectionTitle}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            disabled={loadingCard}
            onClick={() => void handleOpenMemberCard()}
          >
            <IdCard className="h-4 w-4" />
            {t.clubPage.profileViewMemberCard}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            {t.clubPage.profileAccountSettings}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-4 w-4" />
            {t.clubPage.profileSignOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ClubMemberPassModal
        open={cardOpen}
        onOpenChange={setCardOpen}
        values={cardValues}
        displayName={displayName}
        clubName={club.name}
        logoSrc={club.logo_url ?? ""}
        membershipRole={roleLabel}
        isPlayer={(membershipRole || "").trim().toLowerCase() === "player"}
        teamLabel={teamLabel}
        readOnly
        appearance="publicClub"
        clubId={club.id}
        membershipId={membershipId}
        labels={clubPassLabels}
      />

      <PublicClubAccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
