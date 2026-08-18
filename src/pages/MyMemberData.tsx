import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, UserCircle2, Users } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MasterDataTabs } from "@/components/members/master-data-tabs";
import type { MasterDataTabsLabels } from "@/components/members/master-data-tabs";
import { useClubId } from "@/hooks/use-club-id";
import { useMembershipId } from "@/hooks/use-membership-id";
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
import { MemberAvailabilityPanel } from "@/components/members/member-availability-panel";
import { CalendarSubscriptionCard } from "@/components/members/calendar-subscription-card";
import { GuardianFamilyPanel } from "@/components/members/guardian-family-panel";
import { listGuardianWardSummaries, type GuardianWardSummary } from "@/lib/member-guardian-api";
import { formatDashboardRoleLabel } from "@/lib/rbac-config";
import { usePlanGuard } from "@/hooks/use-plan-guard";

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
  const { membershipId: ownMembershipId, loading: ownMembershipLoading } = useMembershipId();
  const { activeClub } = useActiveClub();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canUseFeature } = usePlanGuard();
  const canUseCalendarIcs = canUseFeature("calendarIcs");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editableRows, setEditableRows] = useState<EditableMemberMasterRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClubMemberMasterRecord>>({});
  const [baseline, setBaseline] = useState<Partial<ClubMemberMasterRecord>>({});
  const [editActor, setEditActor] = useState<MemberMasterEditActor>("self");
  const [bundleLoading, setBundleLoading] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [bundleLoadError, setBundleLoadError] = useState<string | null>(null);
  const [dirtyKeys, setDirtyKeys] = useState<Set<keyof ClubMemberMasterRecord>>(() => new Set());
  const loadGenerationRef = useRef(0);
  const [bundleMeta, setBundleMeta] = useState<{
    displayName: string | null;
    role: string;
    email: string | null;
    teamLabel: string | null;
  } | null>(null);
  const [missingMigration, setMissingMigration] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ownProfileAvatarUrl, setOwnProfileAvatarUrl] = useState<string | null>(null);
  const [guardianWards, setGuardianWards] = useState<GuardianWardSummary[]>([]);
  const [guardianWardsLoading, setGuardianWardsLoading] = useState(false);

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

  const loadGuardianWards = useCallback(async () => {
    if (!clubId || !ownMembershipId) {
      setGuardianWards([]);
      return;
    }
    setGuardianWardsLoading(true);
    const { data, error } = await listGuardianWardSummaries(clubId, ownMembershipId);
    if (error) {
      setGuardianWards([]);
    } else {
      setGuardianWards(data);
    }
    setGuardianWardsLoading(false);
  }, [clubId, ownMembershipId]);

  const loadBundle = useCallback(async (membershipId: string, clubIdForForm: string, generation: number) => {
    const { data, error } = await getMemberMasterBundle(membershipId);
    if (generation !== loadGenerationRef.current) return null;
    if (error || !data) {
      setMasterLoaded(false);
      setBundleLoadError(error?.message ?? t.myMemberDataPage.loadFailed);
      return null;
    }
    setBundleLoadError(null);
    setEditActor(mapEditActor(data.edit_actor));
    const master = { ...(data.master ?? {}) };
    setBaseline(master);
    setForm({ ...master, membership_id: membershipId, club_id: clubIdForForm });
    setDirtyKeys(new Set());
    setMasterLoaded(true);
    const displayName = masterRecordDisplayName(data.master, data.display_name);
    setBundleMeta({
      displayName: displayName || data.display_name,
      role: data.role,
      email: data.email,
      teamLabel: data.team_label,
    });
    return data;
  }, [t.myMemberDataPage.loadFailed]);

  const loadBundleRef = useRef(loadBundle);
  loadBundleRef.current = loadBundle;

  useEffect(() => {
    if (clubLoading) return;
    if (!clubId) {
      setLoading(false);
      setSelectedId(null);
      setBundleMeta(null);
      setBaseline({});
      setForm({});
      setMasterLoaded(false);
      setDirtyKeys(new Set());
      return;
    }
    setSelectedId(null);
    setBundleMeta(null);
    setBaseline({});
    setForm({});
    setMasterLoaded(false);
    setDirtyKeys(new Set());
    loadGenerationRef.current += 1;
    void loadEditableList();
  }, [clubId, clubLoading, loadEditableList]);

  useEffect(() => {
    if (clubLoading || ownMembershipLoading) return;
    void loadGuardianWards();
  }, [clubLoading, ownMembershipLoading, loadGuardianWards]);

  useEffect(() => {
    if (!selectedId || !clubId) return;
    const row = editableRows.find((item) => item.membership_id === selectedId);
    if (row) {
      setBundleMeta({
        displayName: row.display_name,
        role: row.role,
        email: row.email,
        teamLabel: row.team_label,
      });
    }
  }, [selectedId, clubId, editableRows]);

  useEffect(() => {
    if (!selectedId || !clubId) return;
    const generation = ++loadGenerationRef.current;
    let cancelled = false;
    setBundleLoading(true);
    setMasterLoaded(false);
    setBundleLoadError(null);
    void loadBundleRef.current(selectedId, clubId, generation).finally(() => {
      if (!cancelled) setBundleLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, clubId]);

  useEffect(() => {
    if (!clubId || !selectedId) return;
    window.sessionStorage.setItem(selectedMembershipStorageKey(clubId), selectedId);
  }, [clubId, selectedId]);

  const setField = (key: keyof ClubMemberMasterRecord, value: string | number | null) => {
    setDirtyKeys((previous) => {
      const next = new Set(previous);
      next.add(key);
      return next;
    });
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "photo_url"
        ? { photo_uploaded_at: value ? (previous.photo_uploaded_at ?? new Date().toISOString()) : null }
        : {}),
    }));
  };

  const retryBundleLoad = () => {
    if (!selectedId || !clubId) return;
    const generation = ++loadGenerationRef.current;
    setBundleLoading(true);
    setBundleLoadError(null);
    void loadBundleRef.current(selectedId, clubId, generation).finally(() => {
      setBundleLoading(false);
    });
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

  const canSave =
    Boolean(
      selectedId &&
        clubId &&
        masterLoaded &&
        !bundleLoading &&
        !loading &&
        !clubLoading &&
        !saving,
    );

  const handleSave = async () => {
    if (!selectedId || !clubId || saving || bundleLoading || !masterLoaded) return;
    setSaving(true);
    try {
      const payload = buildMemberMasterSavePayload(form, editActor, baseline, dirtyKeys);
      if (!payload) {
        toast({
          title: t.common.error,
          description: t.myMemberDataPage.saveFailedNoChanges,
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
        const nextMaster = { ...savedRecord };
        setBaseline(nextMaster);
        setForm({ ...nextMaster, membership_id: selectedId, club_id: clubId });
        setDirtyKeys(new Set());
      } else {
        const generation = ++loadGenerationRef.current;
        await loadBundle(selectedId, clubId, generation);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.myMemberDataPage.saveFailed;
      toast({
        title: t.common.error,
        description: resolveMyMemberDataSaveError(message, {
          saveFailedGeneric: t.myMemberDataPage.saveFailed,
          saveFailedNoEditableFields: t.myMemberDataPage.saveFailedNoEditableFields,
          saveFailedNoChanges: t.myMemberDataPage.saveFailedNoChanges,
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
            disabled={!canSave}
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

            {!guardianWardsLoading && ownMembershipId ? (
              <GuardianFamilyPanel
                wards={guardianWards}
                labels={{
                  title: t.myMemberDataPage.guardianFamilyTitle,
                  subtitle: t.myMemberDataPage.guardianFamilySubtitle,
                  emptyTitle: t.myMemberDataPage.guardianFamilyEmptyTitle,
                  emptyDesc: t.myMemberDataPage.guardianFamilyEmptyDesc,
                  editRegistry: t.myMemberDataPage.guardianFamilyEditRegistry,
                  openActivities: t.myMemberDataPage.guardianFamilyOpenActivities,
                  inactiveBadge: t.myMemberDataPage.guardianFamilyInactive,
                }}
                getRoleLabel={formatDashboardRoleLabel}
                unknownMemberLabel={t.membersPage.unknownMember}
                onSelectWard={(wardMembershipId) => {
                  if (editableRows.some((row) => row.membership_id === wardMembershipId)) {
                    setSelectedId(wardMembershipId);
                    return;
                  }
                  toast({
                    title: t.myMemberDataPage.guardianFamilyWardNotEditableTitle,
                    description: t.myMemberDataPage.guardianFamilyWardNotEditableDesc,
                    variant: "destructive",
                  });
                }}
              />
            ) : null}

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

            {bundleLoadError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-3">
                <p className="text-muted-foreground leading-relaxed">{bundleLoadError}</p>
                <Button size="sm" variant="outline" onClick={retryBundleLoad}>
                  {t.common.refresh}
                </Button>
              </div>
            ) : null}

            {bundleLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedRow && masterLoaded && bundleMeta ? (
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

                {selectedId && clubId && (selectedRow.edit_actor === "self" || selectedRow.edit_actor === "guardian") ? (
                  <div className="mt-4">
                    <MemberAvailabilityPanel
                      clubId={clubId}
                      membershipId={selectedId}
                      labels={{
                        title: t.myMemberDataPage.availabilityTitle,
                        subtitle: t.myMemberDataPage.availabilitySubtitle,
                        add: t.myMemberDataPage.availabilityAdd,
                        status: t.myMemberDataPage.availabilityStatus,
                        reason: t.myMemberDataPage.availabilityReason,
                        note: t.myMemberDataPage.availabilityNote,
                        from: t.myMemberDataPage.availabilityFrom,
                        to: t.myMemberDataPage.availabilityTo,
                        save: t.common.save,
                        empty: t.myMemberDataPage.availabilityEmpty,
                        delete: t.common.delete,
                        statusUnavailable: t.myMemberDataPage.availabilityUnavailable,
                        statusLimited: t.myMemberDataPage.availabilityLimited,
                        statusAvailable: t.myMemberDataPage.availabilityAvailable,
                        reasonHoliday: t.activitiesPage.attendancePresetVacation,
                        reasonIllness: t.activitiesPage.attendancePresetIllness,
                        reasonInjury: t.activitiesPage.attendancePresetInjury,
                        reasonSchool: t.activitiesPage.attendancePresetSchool,
                        reasonFamily: t.myMemberDataPage.availabilityReasonFamily,
                        reasonWork: t.activitiesPage.attendancePresetWork,
                        reasonOther: t.myMemberDataPage.availabilityReasonOther,
                        saved: t.myMemberDataPage.availabilitySaved,
                        failed: t.myMemberDataPage.availabilityFailed,
                      }}
                      onToast={(payload) => toast(payload)}
                    />
                    {selectedRow.edit_actor === "self" && canUseCalendarIcs ? (
                      <CalendarSubscriptionCard
                        clubId={clubId}
                        labels={{
                          title: t.myMemberDataPage.calendarTitle,
                          subtitle: t.myMemberDataPage.calendarSubtitle,
                          create: t.myMemberDataPage.calendarCreate,
                          copy: t.myMemberDataPage.calendarCopy,
                          copyWebcal: t.myMemberDataPage.calendarCopyWebcal,
                          created: t.myMemberDataPage.calendarCreated,
                          failed: t.myMemberDataPage.calendarFailed,
                          tokenHint: t.myMemberDataPage.calendarTokenHint,
                          feedUrlLabel: t.myMemberDataPage.calendarFeedUrlLabel,
                          activeFeeds: t.myMemberDataPage.calendarActiveFeeds,
                          revoke: t.myMemberDataPage.calendarRevoke,
                          revoked: t.myMemberDataPage.calendarRevoked,
                          emptyFeeds: t.myMemberDataPage.calendarEmptyFeeds,
                        }}
                        onToast={(payload) => toast(payload)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
