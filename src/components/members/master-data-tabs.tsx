import { useState, type ReactNode } from "react";
import {
  User, MapPin, Dumbbell, Trophy, Building2, Landmark, ShieldAlert, IdCard,
  UserCircle2, UploadCloud, Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEMBER_MASTER_FIELDS } from "@/lib/member-master-schema";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { photoValidUntil, shouldShowPhotoRenewalHint } from "@/lib/member-photo-validity";
import { resolveMemberPhotoDisplay } from "@/lib/member-photo-display";
import { cn } from "@/lib/utils";
import { ClubMemberPassCard } from "@/components/members/club-member-pass-card";
import { ClubMemberPassModal } from "@/components/members/club-member-pass-modal";
import { buildClubMemberPassLabels } from "@/components/members/club-member-pass-labels";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { useClubPassSkills } from "@/hooks/use-club-pass-skills";
import type { Translations } from "@/i18n";

const FIELD_TABS = [
  { key: "identity",    icon: User,        accent: "text-violet-700 dark:text-violet-300",  activeBg: "data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300" },
  { key: "contact",     icon: MapPin,      accent: "text-sky-700 dark:text-sky-300",     activeBg: "data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300" },
  { key: "sport",       icon: Dumbbell,    accent: "text-emerald-700 dark:text-emerald-300", activeBg: "data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300" },
  { key: "performance", icon: Trophy,      accent: "text-amber-800 dark:text-amber-300",   activeBg: "data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-300" },
  { key: "club",        icon: Building2,   accent: "text-blue-700 dark:text-blue-300",    activeBg: "data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300" },
  { key: "financial",   icon: Landmark,    accent: "text-orange-800 dark:text-orange-300",  activeBg: "data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-800 dark:data-[state=active]:text-orange-300" },
  { key: "safety",      icon: ShieldAlert, accent: "text-red-700 dark:text-red-300",     activeBg: "data-[state=active]:bg-red-500/15 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300" },
] as const;

const CARD_TAB = {
  key: "clubcard",
  icon: IdCard,
  accent: "text-primary",
  activeBg: "data-[state=active]:bg-primary/15 data-[state=active]:text-primary",
} as const;

export interface MasterDataTabsLabels {
  identity: string;
  contact: string;
  sport: string;
  performance: string;
  club: string;
  financial: string;
  safety: string;
  clubCard: string;
  clubCardHint: string;
  generateId: string;
  downloadPass: string;
  avatarPreview: string;
  uploadAvatar: string;
  uploadingAvatar: string;
  removeAvatar: string;
  avatarUrl: string;
  loginEmailLabel?: string;
  loginEmailHint?: string;
  loginEmailMissing?: string;
  photoValidityHint?: string;
  photoRenewalDue?: string;
  photoValidUntilLabel?: string;
  photoFromRegistry?: string;
  photoFromAccount?: string;
  photoAccountFallbackHint?: string;
}

export interface MasterDataTabsAvatarUpload {
  uploading: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onRemove?: () => void;
}

interface MasterDataTabsProps {
  values: Partial<ClubMemberMasterRecord>;
  labels: MasterDataTabsLabels;
  readOnly?: boolean;
  onChange?: (key: keyof ClubMemberMasterRecord, value: string | number | null) => void;
  compact?: boolean;
  displayName?: string;
  clubName?: string | null;
  logoSrc?: string;
  membershipRole?: string;
  /** Player role gets skills back; other roles get club crest back. */
  isPlayer?: boolean;
  teamLabel?: string;
  email?: string | null;
  clubId?: string | null;
  /** Enables skills back + AI market value on the club card preview. */
  membershipId?: string | null;
  avatarUpload?: MasterDataTabsAvatarUpload;
  /** When false (default), `safetyTabExtra` is ignored - use only on the live roster member detail panel. */
  safetyTabExtraEnabled?: boolean;
  /** Rendered below Safety & Emergencies fields (e.g. linked guardians). */
  safetyTabExtra?: ReactNode;
  /** When set, only these field keys are shown/editable. */
  allowedFieldKeys?: Set<keyof ClubMemberMasterRecord>;
  /** When set, only these tab groups are shown (e.g. hide club/financial for trainers). */
  allowedGroups?: Set<string>;
  /** Hide internal club-number generator (self-service editors). */
  hideClubNumberGenerator?: boolean;
  /** Login profile avatar — used as fallback for own membership only. */
  profileAvatarUrl?: string | null;
}

function formatFieldLabel(
  column: string,
  fieldLabels: Translations["membersPage"]["masterFieldLabels"] | undefined,
) {
  const translated = fieldLabels?.[column as keyof NonNullable<typeof fieldLabels>];
  if (typeof translated === "string" && translated.trim()) return translated;
  return column.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase());
}

function formatDisplayValue(
  raw: unknown,
  valueLabels: Translations["membersPage"]["masterValues"] | undefined,
): string {
  if (raw === null || raw === undefined || raw === "") return "-";
  const value = String(raw);
  const translated = valueLabels?.[value as keyof NonNullable<typeof valueLabels>];
  if (typeof translated === "string" && translated.trim()) return translated;
  return value.replace(/_/g, " ");
}

function isLongTextField(key: string): boolean {
  return [
    "allergies",
    "medical_conditions",
    "medications",
    "medical_notes",
    "onboarding_progress",
    "team_integration_status",
    "squad_status",
    "role_development_notes",
    "strengths",
  ].includes(key);
}

export function MasterDataTabs({
  values, labels, readOnly, onChange, compact,
  displayName, clubName, logoSrc, membershipRole, isPlayer = false, teamLabel, email, clubId, membershipId, avatarUpload,
  safetyTabExtraEnabled = false,
  safetyTabExtra,
  allowedFieldKeys,
  allowedGroups,
  hideClubNumberGenerator = false,
  profileAvatarUrl,
}: MasterDataTabsProps) {
  const { t } = useLanguage();
  const { clubId: activeClubId } = useClubId();
  const resolvedClubId =
    clubId ||
    (typeof values.club_id === "string" ? values.club_id : null) ||
    activeClubId ||
    null;
  const resolvedMembershipId =
    membershipId ||
    (typeof values.membership_id === "string" ? values.membership_id : null) ||
    null;
  const [activeTab, setActiveTab] = useState<string>("identity");
  const [clubPassModalOpen, setClubPassModalOpen] = useState(false);
  const clubPassLabels = buildClubMemberPassLabels(t);

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
    enabled: isPlayer,
    masterHints: {
      goalsCount:
        typeof values.goals_count === "number" ? values.goals_count : null,
    },
  });

  const memberNameFromMaster =
    `${values.first_name || ""} ${values.last_name || ""}`.trim();
  const memberName =
    memberNameFromMaster ||
    displayName ||
    t.membersPage.unknownMember;

  const memberIdNo = values.internal_club_number ? String(values.internal_club_number) : null;

  const resolvedMemberPhoto = resolveMemberPhotoDisplay(values.photo_url, profileAvatarUrl);

  const photoSourceBadge = resolvedMemberPhoto ? (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium",
        resolvedMemberPhoto.source === "registry"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
      )}
    >
      {resolvedMemberPhoto.source === "registry" ? labels.photoFromRegistry : labels.photoFromAccount}
    </span>
  ) : null;

  const labelMap: Record<string, string> = {
    ...labels,
    clubcard: labels.clubCard,
  };

  const handleGenerateId = () => {
    const id = `O4T-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    onChange?.("internal_club_number", id);
  };

  const openClubPassModal = () => {
    if (memberIdNo) setClubPassModalOpen(true);
  };

  const visibleFieldTabs = FIELD_TABS.filter(({ key }) => {
    if (allowedGroups && !allowedGroups.has(key)) return false;
    const fields = MEMBER_MASTER_FIELDS.filter((f) => f.group === key);
    if (!fields.length) return false;
    if (!allowedFieldKeys) return true;
    return fields.some((f) => allowedFieldKeys.has(f.key));
  });
  const showClubCard =
    (!allowedGroups || allowedGroups.has("clubcard")) &&
    (!allowedFieldKeys || allowedFieldKeys.has("internal_club_number") || Boolean(values.internal_club_number));
  const allTabs = showClubCard ? [...visibleFieldTabs, CARD_TAB] : visibleFieldTabs;

  const panelHeightClass = compact ? "lg:h-[520px]" : "lg:h-[560px]";
  const fieldGridClass = compact
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  const photoUrlColSpan = compact
    ? "col-span-1 sm:col-span-2 lg:col-span-3"
    : "col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4";
  const selectTriggerClass = "h-10 w-full min-w-0 text-sm";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className={cn("mb-3", compact && "mb-2")}>
        <TabsList
          className={cn(
            "w-full bg-transparent p-0",
            // No horizontal scroll: wrap into rows on small screens.
            // TabsList base component has `inline-flex h-10` - override both.
            "flex flex-wrap h-auto items-stretch justify-start gap-1.5",
          )}
        >
          {allTabs.map(({ key, icon: Icon, accent, activeBg }) => (
            <TabsTrigger
              key={key}
              value={key}
              className={cn(
                // 2 columns on mobile without grid (prevents fixed-height overlap issues)
                "relative flex-1 basis-[calc(50%-0.375rem)] sm:flex-none sm:basis-auto",
                "flex items-center justify-center sm:justify-start gap-2",
                "rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all",
                "border border-transparent",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50",
                activeBg,
                "data-[state=active]:border-current/20 data-[state=active]:shadow-sm",
              )}
            >
              <Icon className={cn("w-4 h-4", activeTab === key ? "" : accent)} />
              <span className="truncate">{labelMap[key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {visibleFieldTabs.map(({ key, accent }) => {
        const fields = MEMBER_MASTER_FIELDS.filter((f) => {
          if (f.group !== key) return false;
          if (allowedFieldKeys && !allowedFieldKeys.has(f.key)) return false;
          return true;
        });
        if (!fields.length) return null;
        return (
          <TabsContent key={key} value={key} className="mt-0 w-full min-w-0 outline-none">
            <div
              className={cn(
                "w-full min-w-0 overflow-hidden rounded-2xl border border-border/40 bg-muted/10 p-3 max-lg:p-4",
                panelHeightClass,
              )}
            >
              <div
                className={cn(
                  "grid w-full min-w-0 gap-3 pr-0 sm:pr-1",
                  fieldGridClass,
                  "max-lg:overflow-visible lg:max-h-full lg:overflow-y-auto",
                )}
            >
              {key === "contact" && (labels.loginEmailLabel || labels.loginEmailHint) ? (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 rounded-xl border border-border/60 bg-background/40 p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">{labels.loginEmailLabel}</div>
                  {email?.trim() ? (
                    <div className="text-sm font-medium break-all text-foreground">{email.trim()}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{labels.loginEmailMissing}</div>
                  )}
                  {labels.loginEmailHint ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{labels.loginEmailHint}</p>
                  ) : null}
                </div>
              ) : null}
              {fields.map((field) => {
                  const val = values[field.key];
                if (readOnly) {
                  if (field.key === "photo_url") {
                    const registryUrl = typeof val === "string" && val.trim() ? val.trim() : "";
                    const displayUrl = resolvedMemberPhoto?.url ?? "";
                    return (
                      <div key={field.key} className={cn("p-2.5 rounded-lg border border-border/40 bg-background/30", photoUrlColSpan)}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className={cn("text-sm", accent)}>
                            {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                          </div>
                          {displayUrl ? photoSourceBadge : null}
                        </div>
                        {displayUrl ? (
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              {registryUrl ? (
                                <div className="text-sm font-medium break-all min-w-0 text-foreground">{registryUrl}</div>
                              ) : labels.photoAccountFallbackHint ? (
                                <div className="text-xs text-muted-foreground leading-relaxed">{labels.photoAccountFallbackHint}</div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground/70">-</div>
                        )}
                      </div>
                    );
                  }
                  const hasVal = val !== null && val !== undefined && val !== "";
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "p-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl",
                        "shadow-[0_10px_26px_rgba(0,0,0,0.06)]",
                      )}
                    >
                      <div className={cn("text-xs font-medium mb-1", accent)}>
                        {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          hasVal ? "text-foreground" : "text-muted-foreground/70",
                          isLongTextField(String(field.key)) ? "whitespace-pre-wrap break-words" : "truncate",
                        )}
                      >
                        {formatDisplayValue(val, t.membersPage.masterValues)}
                      </div>
                    </div>
                  );
                }

                if (field.key === "sex") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>
                        {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                      </label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t.membersPage.masterValues.male}</SelectItem>
                          <SelectItem value="female">{t.membersPage.masterValues.female}</SelectItem>
                          <SelectItem value="other">{t.membersPage.masterValues.other}</SelectItem>
                          <SelectItem value="prefer_not_to_say">{t.membersPage.masterValues.prefer_not_to_say}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "membership_kind") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>
                        {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                      </label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active_participant">{t.membersPage.masterValues.active_participant}</SelectItem>
                          <SelectItem value="supporting_member">{t.membersPage.masterValues.supporting_member}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "strong_leg" || field.key === "strong_hand") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>
                        {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                      </label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">{t.membersPage.masterValues.left}</SelectItem>
                          <SelectItem value="right">{t.membersPage.masterValues.right}</SelectItem>
                          <SelectItem value="both">{t.membersPage.masterValues.both}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "photo_url" && avatarUpload) {
                  const registryUrl = val != null ? String(val).trim() : "";
                  const displayUrl = resolvedMemberPhoto?.url ?? "";
                  // Prefer stored stamp; if a photo exists without one (legacy / mid-edit), use now for display.
                  const uploadedAt =
                    values.photo_uploaded_at ??
                    (registryUrl ? new Date().toISOString() : null);
                  const renewalDue = shouldShowPhotoRenewalHint(registryUrl, values.photo_uploaded_at);
                  const validUntil = photoValidUntil(uploadedAt);
                  const validUntilText =
                    registryUrl && validUntil && labels.photoValidUntilLabel
                      ? labels.photoValidUntilLabel.replace(
                          "{date}",
                          validUntil.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        )
                      : null;
                  return (
                    <div key={field.key} className={cn("min-w-0 space-y-3", photoUrlColSpan)}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className={cn("text-sm font-medium", accent)}>
                            {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                          </label>
                          {displayUrl ? photoSourceBadge : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{labels.avatarPreview}</div>
                        {resolvedMemberPhoto?.isAccountFallback && labels.photoAccountFallbackHint ? (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{labels.photoAccountFallbackHint}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="w-16 h-16 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                          {displayUrl ? (
                            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle2 className="w-9 h-9 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <label className="inline-flex w-full sm:w-auto">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                void avatarUpload.onUpload(file);
                                event.currentTarget.value = "";
                              }}
                            />
                            <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground sm:w-auto">
                              {avatarUpload.uploading ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5 mr-1" />
                              )}
                              {avatarUpload.uploading ? labels.uploadingAvatar : labels.uploadAvatar}
                            </span>
                          </label>
                          {registryUrl && avatarUpload.onRemove ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full text-xs sm:w-auto"
                              onClick={() => avatarUpload.onRemove?.()}
                              disabled={avatarUpload.uploading}
                            >
                              {labels.removeAvatar}
                            </Button>
                          ) : null}
                          {registryUrl && renewalDue && labels.photoRenewalDue ? (
                            <span className="inline-flex h-10 items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-medium text-amber-700 dark:text-amber-200 sm:max-w-[16rem]">
                              {labels.photoRenewalDue}
                            </span>
                          ) : registryUrl && validUntilText ? (
                            <span className="inline-flex h-10 items-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {validUntilText}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {!registryUrl && labels.photoValidityHint ? (
                        <div className="text-xs text-muted-foreground">{labels.photoValidityHint}</div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">{labels.avatarUrl}</div>
                        <Input
                          className="h-10 w-full min-w-0 text-sm"
                          value={registryUrl}
                          onChange={(e) => {
                            const next = e.target.value || null;
                            onChange?.(field.key, next);
                            if (next?.trim()) {
                              onChange?.(
                                "photo_uploaded_at",
                                values.photo_uploaded_at ?? new Date().toISOString(),
                              );
                            } else {
                              onChange?.("photo_uploaded_at", null);
                            }
                          }}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  );
                }

                // Read-only photo: still show validity next to the preview.
                if (field.key === "photo_url" && !avatarUpload) {
                  const registryUrl = val != null ? String(val).trim() : "";
                  const displayUrl = resolvedMemberPhoto?.url ?? "";
                  const uploadedAt = values.photo_uploaded_at ?? null;
                  const renewalDue = shouldShowPhotoRenewalHint(registryUrl, uploadedAt);
                  const validUntil = photoValidUntil(uploadedAt);
                  const validUntilText =
                    registryUrl && validUntil && labels.photoValidUntilLabel
                      ? labels.photoValidUntilLabel.replace(
                          "{date}",
                          validUntil.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        )
                      : null;
                  return (
                    <div key={field.key} className={cn("min-w-0 space-y-3", photoUrlColSpan)}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className={cn("text-sm font-medium", accent)}>
                            {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                          </label>
                          {displayUrl ? photoSourceBadge : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{labels.avatarPreview}</div>
                        {resolvedMemberPhoto?.isAccountFallback && labels.photoAccountFallbackHint ? (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{labels.photoAccountFallbackHint}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="w-16 h-16 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                          {displayUrl ? (
                            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle2 className="w-9 h-9 text-muted-foreground" />
                          )}
                        </div>
                        {registryUrl && renewalDue && labels.photoRenewalDue ? (
                          <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-200">
                            {labels.photoRenewalDue}
                          </span>
                        ) : registryUrl && validUntilText ? (
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {validUntilText}
                          </span>
                        ) : !displayUrl && labels.photoValidityHint ? (
                          <span className="text-xs text-muted-foreground">{labels.photoValidityHint}</span>
                        ) : null}
                      </div>
                      {registryUrl ? (
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">{labels.avatarUrl}</div>
                          <Input className="h-10 w-full min-w-0 text-sm" value={registryUrl} readOnly disabled />
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const isDate = ["birth_date", "club_registration_date", "team_assignment_date", "club_exit_date", "last_evaluation_date"].includes(field.key);
                const isNumber = ["height_cm", "weight_kg", "jersey_number", "goals_count"].includes(field.key);
                const isLong = isLongTextField(String(field.key));

                return (
                  <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                    <label className={cn("text-xs font-medium", accent)}>
                      {formatFieldLabel(field.column, t.membersPage.masterFieldLabels)}
                    </label>
                    {isLong ? (
                      <Textarea
                        className="w-full min-w-0 text-sm min-h-[96px] rounded-xl bg-background/50"
                        value={val != null ? String(val) : ""}
                        placeholder="-"
                        onChange={(e) => onChange?.(field.key, e.target.value || null)}
                      />
                    ) : (
                      <Input
                        className="h-10 w-full min-w-0 text-sm rounded-xl bg-background/50"
                        type={isDate ? "date" : isNumber ? "number" : "text"}
                        value={val != null ? String(val) : ""}
                        placeholder="-"
                        onChange={(e) => {
                          if (isNumber) {
                            onChange?.(field.key, e.target.value === "" ? null : Number(e.target.value));
                          } else {
                            onChange?.(field.key, e.target.value || null);
                          }
                        }}
                      />
                    )}
                  </div>
                );
                })}
              </div>
            </div>
            {key === "safety" && safetyTabExtraEnabled && safetyTabExtra ? (
              <div className="mt-4 w-full min-w-0 space-y-3 border-t border-border/40 pt-4">{safetyTabExtra}</div>
            ) : null}
          </TabsContent>
        );
      })}

      {showClubCard ? (
      <TabsContent value="clubcard" className="mt-0 w-full min-w-0 outline-none">
        <div className="flex w-full min-w-0 flex-col overflow-visible rounded-2xl border border-border/40 bg-muted/10 p-3 max-lg:p-4">
          <p className="mb-4 text-sm text-muted-foreground">{labels.clubCardHint}</p>

          {memberIdNo ? (
            <button
              type="button"
              onClick={openClubPassModal}
              className="mb-4 inline-flex w-fit items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
            >
              <IdCard className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground">{clubPassLabels.idNo}</span>
              <span className="font-mono text-sm font-semibold text-primary">{memberIdNo}</span>
            </button>
          ) : null}

          <ClubMemberPassCard
            values={values}
            displayName={memberName}
            clubName={clubName}
            logoSrc={logoSrc}
            membershipRole={membershipRole}
            isPlayer={isPlayer}
            teamLabel={teamLabel}
            readOnly={readOnly}
            showControls={!readOnly}
            profileAvatarUrl={profileAvatarUrl}
            onGenerateId={readOnly || hideClubNumberGenerator ? undefined : handleGenerateId}
            onMemberIdClick={memberIdNo ? openClubPassModal : undefined}
            onDownloadComplete={() => onChange?.("club_pass_generated_at", new Date().toISOString())}
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
            labels={clubPassLabels}
          />
        </div>

        <ClubMemberPassModal
          open={clubPassModalOpen}
          onOpenChange={setClubPassModalOpen}
          values={values}
          displayName={memberName}
          clubName={clubName}
          logoSrc={logoSrc}
          membershipRole={membershipRole}
          isPlayer={isPlayer}
          teamLabel={teamLabel}
          readOnly={readOnly}
          profileAvatarUrl={profileAvatarUrl}
          onGenerateId={readOnly || hideClubNumberGenerator ? undefined : handleGenerateId}
          onDownloadComplete={() => onChange?.("club_pass_generated_at", new Date().toISOString())}
          clubId={resolvedClubId}
          membershipId={resolvedMembershipId}
          labels={clubPassLabels}
        />
      </TabsContent>
      ) : null}
    </Tabs>
  );
}
