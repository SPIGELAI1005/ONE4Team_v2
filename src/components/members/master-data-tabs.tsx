import { useState, type ReactNode } from "react";
import {
  User, MapPin, Dumbbell, Trophy, Building2, Landmark, ShieldAlert, IdCard,
  UserCircle2, UploadCloud,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEMBER_MASTER_FIELDS } from "@/lib/member-master-schema";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { cn } from "@/lib/utils";
import { ClubMemberPassCard } from "@/components/members/club-member-pass-card";
import { ClubMemberPassModal, buildClubMemberPassLabels } from "@/components/members/club-member-pass-modal";
import { useLanguage } from "@/hooks/use-language";

const FIELD_TABS = [
  { key: "identity",    icon: User,        accent: "text-violet-400",  activeBg: "data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300" },
  { key: "contact",     icon: MapPin,      accent: "text-sky-400",     activeBg: "data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-300" },
  { key: "sport",       icon: Dumbbell,    accent: "text-emerald-400", activeBg: "data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300" },
  { key: "performance", icon: Trophy,      accent: "text-amber-400",   activeBg: "data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300" },
  { key: "club",        icon: Building2,   accent: "text-blue-400",    activeBg: "data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-300" },
  { key: "financial",   icon: Landmark,    accent: "text-orange-400",  activeBg: "data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-300" },
  { key: "safety",      icon: ShieldAlert, accent: "text-red-400",     activeBg: "data-[state=active]:bg-red-500/15 data-[state=active]:text-red-300" },
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
  teamLabel?: string;
  email?: string | null;
  avatarUpload?: MasterDataTabsAvatarUpload;
  /** When false (default), `safetyTabExtra` is ignored - use only on the live roster member detail panel. */
  safetyTabExtraEnabled?: boolean;
  /** Rendered below Safety & Emergencies fields (e.g. linked guardians). */
  safetyTabExtra?: ReactNode;
}

function formatFieldLabel(column: string) {
  return column.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatDisplayValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "-";
  return String(raw).replace(/_/g, " ");
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
  displayName, clubName, logoSrc, membershipRole, teamLabel, avatarUpload,
  safetyTabExtraEnabled = false,
  safetyTabExtra,
}: MasterDataTabsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("identity");
  const [clubPassModalOpen, setClubPassModalOpen] = useState(false);
  const clubPassLabels = buildClubMemberPassLabels(t);

  const memberNameFromMaster =
    `${values.first_name || ""} ${values.last_name || ""}`.trim();
  const memberName =
    memberNameFromMaster ||
    displayName ||
    "Member";

  const memberIdNo = values.internal_club_number ? String(values.internal_club_number) : null;

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

  const allTabs = [...FIELD_TABS, CARD_TAB];

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

      {FIELD_TABS.map(({ key, accent }) => {
        const fields = MEMBER_MASTER_FIELDS.filter((f) => f.group === key);
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
                {fields.map((field) => {
                  const val = values[field.key];
                if (readOnly) {
                  if (field.key === "photo_url") {
                    const photoUrl = typeof val === "string" && val.trim() ? val.trim() : "";
                    return (
                      <div key={field.key} className={cn("p-2.5 rounded-lg border border-border/40 bg-background/30", photoUrlColSpan)}>
                        <div className={cn("text-sm mb-2", accent)}>{formatFieldLabel(field.column)}</div>
                        {photoUrl ? (
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-sm font-medium break-all min-w-0 text-foreground">{photoUrl}</div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground/40">-</div>
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
                      <div className={cn("text-xs font-medium mb-1", accent)}>{formatFieldLabel(field.column)}</div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          hasVal ? "text-foreground" : "text-muted-foreground/40",
                          isLongTextField(String(field.key)) ? "whitespace-pre-wrap break-words" : "truncate",
                        )}
                      >
                        {formatDisplayValue(val)}
                      </div>
                    </div>
                  );
                }

                if (field.key === "sex") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "membership_kind") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active_participant">Active participant</SelectItem>
                          <SelectItem value="supporting_member">Supporting member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "strong_leg" || field.key === "strong_hand") {
                  return (
                    <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                      <label className={cn("text-xs font-medium", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (field.key === "photo_url" && avatarUpload) {
                  const urlStr = val != null ? String(val) : "";
                  return (
                    <div key={field.key} className={cn("min-w-0 space-y-3", photoUrlColSpan)}>
                      <div>
                        <label className={cn("text-sm font-medium", accent)}>{formatFieldLabel(field.column)}</label>
                        <div className="mt-1 text-xs text-muted-foreground">{labels.avatarPreview}</div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="w-16 h-16 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                          {urlStr ? (
                            <img src={urlStr} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle2 className="w-9 h-9 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                            <span className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2.5 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground sm:w-auto">
                              {avatarUpload.uploading ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5 mr-1" />
                              )}
                              {avatarUpload.uploading ? labels.uploadingAvatar : labels.uploadAvatar}
                            </span>
                          </label>
                          {urlStr && avatarUpload.onRemove ? (
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
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">{labels.avatarUrl}</div>
                        <Input
                          className="h-10 w-full min-w-0 text-sm"
                          value={urlStr}
                          onChange={(e) => onChange?.(field.key, e.target.value || null)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  );
                }

                const isDate = ["birth_date", "club_registration_date", "team_assignment_date", "club_exit_date", "last_evaluation_date"].includes(field.key);
                const isNumber = ["height_cm", "weight_kg", "jersey_number", "goals_count"].includes(field.key);
                const isLong = isLongTextField(String(field.key));

                return (
                  <div key={field.key} className="min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3 space-y-2">
                    <label className={cn("text-xs font-medium", accent)}>{formatFieldLabel(field.column)}</label>
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

      <TabsContent value="clubcard" className="mt-0 w-full min-w-0 outline-none">
        <div className={cn("flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-muted/10 p-3 max-lg:p-4", panelHeightClass)}>
          <p className="text-sm text-muted-foreground mb-4">{labels.clubCardHint}</p>

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
            teamLabel={teamLabel}
            readOnly={readOnly}
            showControls={!readOnly}
            onGenerateId={readOnly ? undefined : handleGenerateId}
            onMemberIdClick={memberIdNo ? openClubPassModal : undefined}
            onDownloadComplete={() => onChange?.("club_pass_generated_at", new Date().toISOString())}
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
          teamLabel={teamLabel}
          readOnly={readOnly}
          onGenerateId={readOnly ? undefined : handleGenerateId}
          onDownloadComplete={() => onChange?.("club_pass_generated_at", new Date().toISOString())}
          labels={clubPassLabels}
        />
      </TabsContent>
    </Tabs>
  );
}
