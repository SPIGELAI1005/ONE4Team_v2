import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, UserCircle2, Users } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MasterDataTabs } from "@/components/members/master-data-tabs";
import type { MasterDataTabsLabels } from "@/components/members/master-data-tabs";
import { useClubId } from "@/hooks/use-club-id";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import {
  buildMemberMasterSavePayload,
  editableFieldKeysForActor,
  editableGroupsForActor,
  masterRecordDisplayName,
  type MemberMasterEditActor,
} from "@/lib/member-master-field-policy";
import {
  getMemberMasterBundle,
  listEditableMemberMasterMemberships,
  saveMemberMasterRecord,
  type EditableMemberMasterRow,
} from "@/lib/member-master-api";
import {
  syncOwnProfileAvatarFromMasterPhoto,
} from "@/lib/member-photo-display";
import { resolveMyMemberDataLoadError, resolveMyMemberDataSaveError } from "@/lib/member-my-data-errors";

const PROFILE_AVATAR_BUCKET = "images-avatars";

function selectedMembershipStorageKey(clubId: string) {
  return `one4team:my-data:selected-membership:${clubId}`;
}

function mapEditActor(row: EditableMemberMasterRow["edit_actor"]): MemberMasterEditActor {
  if (row === "manager") return "manager";
  if (row === "trainer") return "trainer";
  return "self";
}

export default function MyMemberData() {
  const { clubId, loading: clubLoading } = useClubId();
  const { activeClub } = useActiveClub();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editableRows, setEditableRows] = useState<EditableMemberMasterRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClubMemberMasterRecord>>({});
  const [editActor, setEditActor] = useState<MemberMasterEditActor>("self");
  const [bundleMeta, setBundleMeta] = useState<{
    displayName: string | null;
    role: string;
    email: string | null;
    teamLabel: string | null;
  } | null>(null);
  const [missingMigration, setMissingMigration] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ownProfileAvatarUrl, setOwnProfileAvatarUrl] = useState<string | null>(null);

  const masterTabLabels = useMemo(
    (): MasterDataTabsLabels => ({
      identity: t.membersPage.masterSectionIdentity,
      contact: t.membersPage.masterSectionContact,
      sport: t.membersPage.masterSectionSport,
      performance: t.membersPage.masterSectionPerformance,
      club: t.membersPage.masterSectionClub,
      financial: t.membersPage.masterSectionFinancial,
      safety: t.membersPage.masterSectionSafety,
      clubCard: t.membersPage.masterSectionClubCard,
      clubCardHint: t.membersPage.masterClubCardHint,
      generateId: t.membersPage.masterGenerateId,
      downloadPass: t.membersPage.masterDownloadPassBtn,
      avatarPreview: t.settingsPage.avatarPreview,
      uploadAvatar: t.settingsPage.uploadAvatar,
      uploadingAvatar: t.settingsPage.uploadingAvatar,
      removeAvatar: t.settingsPage.removeAvatar,
      avatarUrl: t.settingsPage.avatarUrl,
      photoValidityHint: t.membersPage.photoValidityHint,
      photoRenewalDue: t.membersPage.photoRenewalDue,
      photoValidUntilLabel: t.membersPage.photoValidUntilLabel,
      photoFromRegistry: t.membersPage.photoFromRegistry,
      photoFromAccount: t.membersPage.photoFromAccount,
      photoAccountFallbackHint: t.membersPage.photoAccountFallbackHint,
      loginEmailLabel: t.membersPage.masterLoginEmailLabel,
      loginEmailHint: t.membersPage.masterLoginEmailHint,
      loginEmailMissing: t.membersPage.masterLoginEmailMissing,
    }),
    [t],
  );

  const fieldPolicy = useMemo(() => editableFieldKeysForActor(editActor), [editActor]);
  const groupPolicy = useMemo(() => editableGroupsForActor(editActor), [editActor]);

  useEffect(() => {
    if (!user) {
      setOwnProfileAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setOwnProfileAvatarUrl((data?.avatar_url as string | null) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadEditableList = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setMissingMigration(false);
    setLoadError(null);
    const { data, error } = await listEditableMemberMasterMemberships(clubId);
    if (error) {
      if (error.message.includes("function") && error.message.includes("does not exist")) {
        setMissingMigration(true);
        setEditableRows([]);
      } else {
        setLoadError(
          resolveMyMemberDataLoadError(error.message, {
            loadFailedGeneric: t.myMemberDataPage.loadFailedGeneric,
            loadFailedNotAuthenticated: t.myMemberDataPage.loadFailedNotAuthenticated,
            loadFailedNotAuthorized: t.myMemberDataPage.loadFailedNotAuthorized,
            loadFailedServer: t.myMemberDataPage.loadFailedServer,
            loadFailedMigration: t.myMemberDataPage.loadFailedMigration,
          }),
        );
        setEditableRows([]);
      }
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    setEditableRows(rows);
    if (rows.length) {
      const storedId =
        typeof window !== "undefined" ? window.sessionStorage.getItem(selectedMembershipStorageKey(clubId)) : null;
      const preferredId =
        (storedId && rows.some((row) => row.membership_id === storedId) ? storedId : null) ??
        rows.find((row) => row.relationship === "self")?.membership_id ??
        rows[0].membership_id;
      setSelectedId((current) => current ?? preferredId);
    }
    setLoading(false);
  }, [clubId, t]);

  const loadBundle = useCallback(async (membershipId: string, clubIdForForm: string) => {
    const { data, error } = await getMemberMasterBundle(membershipId);
    if (error || !data) {
      toast({
        title: t.common.error,
        description: error?.message ?? t.myMemberDataPage.loadFailed,
        variant: "destructive",
      });
      return null;
    }
    setEditActor(mapEditActor(data.edit_actor));
    setForm({ ...(data.master ?? {}), membership_id: membershipId, club_id: clubIdForForm });
    const displayName = masterRecordDisplayName(data.master, data.display_name);
    setBundleMeta({
      displayName: displayName || data.display_name,
      role: data.role,
      email: data.email,
      teamLabel: data.team_label,
    });
    return data;
  }, [t.common.error, t.myMemberDataPage.loadFailed, toast]);

  useEffect(() => {
    if (clubLoading) return;
    if (!clubId) {
      setLoading(false);
      setSelectedId(null);
      return;
    }
    setSelectedId(null);
    void loadEditableList();
  }, [clubId, clubLoading, loadEditableList]);

  useEffect(() => {
    if (!selectedId || !clubId) return;
    let cancelled = false;
    setForm({ membership_id: selectedId, club_id: clubId });
    setBundleMeta(null);
    void loadBundle(selectedId, clubId).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, clubId, loadBundle]);

  useEffect(() => {
    if (!clubId || !selectedId) return;
    window.sessionStorage.setItem(selectedMembershipStorageKey(clubId), selectedId);
  }, [clubId, selectedId]);

  const setField = (key: keyof ClubMemberMasterRecord, value: string | number | null) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "photo_url"
        ? { photo_uploaded_at: value ? (previous.photo_uploaded_at ?? new Date().toISOString()) : null }
        : {}),
    }));
  };

  const uploadPhoto = async (file: File) => {
    if (!user || !selectedId || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/my-member-data-${selectedId}-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      setField("photo_url", data.publicUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settingsPage.uploadFailed;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      const payload = buildMemberMasterSavePayload(form, editActor);
      if (!payload) {
        toast({
          title: t.common.error,
          description: t.myMemberDataPage.saveFailedNoEditableFields,
          variant: "destructive",
        });
        return;
      }
      const { data: savedRecord, error } = await saveMemberMasterRecord(selectedId, payload);
      if (error) throw error;
      const activeRow = editableRows.find((row) => row.membership_id === selectedId);
      const savedForSelf = activeRow?.relationship === "self";
      if (editActor === "self" && savedForSelf && user) {
        const photoUrl =
          typeof payload.photo_url === "string" && payload.photo_url.trim()
            ? payload.photo_url.trim()
            : null;
        const { error: avatarSyncError } = await syncOwnProfileAvatarFromMasterPhoto({
          userId: user.id,
          photoUrl,
        });
        if (avatarSyncError) throw avatarSyncError;
        setOwnProfileAvatarUrl(photoUrl);
      }
      const personName =
        masterRecordDisplayName(savedRecord, activeRow?.display_name) ||
        bundleMeta?.displayName?.trim() ||
        "";
      if (personName) {
        setBundleMeta((previous) => (previous ? { ...previous, displayName: personName } : previous));
        setEditableRows((previous) =>
          previous.map((row) =>
            row.membership_id === selectedId ? { ...row, display_name: personName } : row,
          ),
        );
      }
      toast({
        title: t.myMemberDataPage.saveSuccessTitle,
        description: savedForSelf
          ? t.myMemberDataPage.saveSuccessDescSelf
          : personName
            ? t.myMemberDataPage.saveSuccessDescOtherNamed.replace("{name}", personName)
            : t.myMemberDataPage.saveSuccessDescOther,
      });
      if (savedRecord && clubId) {
        setForm({ ...savedRecord, membership_id: selectedId, club_id: clubId });
      } else {
        await loadBundle(selectedId, clubId!);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.myMemberDataPage.saveFailed;
      toast({
        title: t.common.error,
        description: resolveMyMemberDataSaveError(message, {
          saveFailedGeneric: t.myMemberDataPage.saveFailed,
          saveFailedNoEditableFields: t.myMemberDataPage.saveFailedNoEditableFields,
          saveFailedNotAuthorized: t.myMemberDataPage.loadFailedNotAuthorized,
        }),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const relationshipLabel = (row: EditableMemberMasterRow) => {
    switch (row.relationship) {
      case "self":
        return t.myMemberDataPage.relationshipSelf;
      case "guardian":
        return t.myMemberDataPage.relationshipGuardian;
      case "household_email":
        return t.myMemberDataPage.relationshipHouseholdEmail;
      case "team_trainer":
        return t.myMemberDataPage.relationshipTrainer;
      case "manager":
        return t.myMemberDataPage.relationshipManager;
      default:
        return row.relationship ?? "";
    }
  };

  const selectedRow = editableRows.find((row) => row.membership_id === selectedId);

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.myMemberDataPage.title}
        subtitle={t.myMemberDataPage.subtitle}
        rightSlot={
          <Button
            size="sm"
            className="bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110"
            disabled={!selectedId || saving || loading}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? t.myMemberDataPage.saving : t.myMemberDataPage.save}
          </Button>
        }
      />

      <div className={`${DASHBOARD_PAGE_INNER} space-y-4 py-4 sm:py-6`}>
        {loading || clubLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : missingMigration ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-muted-foreground">
            {t.myMemberDataPage.migrationHint}
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm space-y-2">
            <div className="font-semibold text-destructive">{t.myMemberDataPage.loadFailedTitle}</div>
            <p className="text-muted-foreground leading-relaxed">{loadError}</p>
          </div>
        ) : !clubId ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t.myMemberDataPage.noClub}
          </div>
        ) : editableRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-sm space-y-4">
            <div>
              <div className="font-semibold text-foreground">{t.myMemberDataPage.emptyTitle}</div>
              <p className="mt-2 text-muted-foreground leading-relaxed">{t.myMemberDataPage.emptyIntro}</p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground leading-relaxed">
              <li>{t.myMemberDataPage.emptyReasonUnlinked}</li>
              <li>{t.myMemberDataPage.emptyReasonInactive}</li>
              <li>{t.myMemberDataPage.emptyReasonEmailMismatch}</li>
              <li>{t.myMemberDataPage.emptyReasonGuardian}</li>
              <li>{t.myMemberDataPage.emptyReasonWrongClub}</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">{t.myMemberDataPage.emptyAdminHint}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              {t.myMemberDataPage.intro}
            </div>

            {editableRows.length > 1 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t.myMemberDataPage.selectPerson}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editableRows.map((row) => (
                    <button
                      key={row.membership_id}
                      type="button"
                      onClick={() => setSelectedId(row.membership_id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === row.membership_id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="font-medium">{row.display_name || row.email || t.membersPage.unknownMember}</div>
                      <div className="mt-0.5 text-[11px]">{relationshipLabel(row)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedRow && bundleMeta ? (
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold text-foreground">
                      {bundleMeta.displayName || selectedRow.display_name || t.membersPage.unknownMember}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[bundleMeta.role, bundleMeta.teamLabel, bundleMeta.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {relationshipLabel(selectedRow)}
                  </Badge>
                </div>

                <MasterDataTabs
                  values={form}
                  labels={masterTabLabels}
                  onChange={setField}
                  displayName={bundleMeta.displayName ?? undefined}
                  clubName={activeClub?.name ?? null}
                  logoSrc={activeClub?.logo_url ?? ""}
                  membershipRole={bundleMeta.role}
                  isPlayer={bundleMeta.role === "player"}
                  teamLabel={bundleMeta.teamLabel ?? undefined}
                  email={bundleMeta.email}
                  clubId={clubId}
                  membershipId={selectedId}
                  allowedFieldKeys={fieldPolicy}
                  allowedGroups={groupPolicy}
                  hideClubNumberGenerator={editActor !== "manager"}
                  profileAvatarUrl={selectedRow.relationship === "self" ? ownProfileAvatarUrl : null}
                  avatarUpload={{
                    uploading: avatarUploading,
                    onUpload: (file) => void uploadPhoto(file),
                    onRemove: () => setField("photo_url", null),
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
