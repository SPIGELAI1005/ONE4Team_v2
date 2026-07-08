import { useRef, useState, type ReactNode } from "react";
import {
  User, MapPin, Dumbbell, Trophy, Building2, Landmark, ShieldAlert, IdCard,
  Download, Loader2, UserCircle2, UploadCloud,
  Sun, Moon, Crown,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEMBER_MASTER_FIELDS } from "@/lib/member-master-schema";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { cn } from "@/lib/utils";
import { captureClubPassAsPng } from "@/lib/club-pass-capture";
import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import { useToast } from "@/hooks/use-toast";
import one4teamLogo from "@/assets/one4team-logo.png";

const CLUB_PASS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function clubPassHeaderLineStyle(
  color: string,
  fontSize: number,
  lineHeight: number,
  options?: { fontWeight?: number; letterSpacing?: string },
) {
  return {
    display: "block" as const,
    margin: 0,
    padding: "2px 0",
    color,
    fontSize,
    lineHeight: `${lineHeight}px`,
    letterSpacing: options?.letterSpacing ?? "0.04em",
    fontWeight: options?.fontWeight ?? 500,
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis" as const,
    overflowX: "hidden" as const,
    overflowY: "visible" as const,
  };
}

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("identity");
  const passRef = useRef<HTMLDivElement | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const [cardTheme, setCardTheme] = useState<"light" | "dark" | "gold">(() => {
    try {
      const stored = localStorage.getItem("one4team.clubCardTheme");
      if (stored === "light" || stored === "dark" || stored === "gold") return stored;
    } catch { /* ignore */ }
    return "dark";
  });

  const cardVars = (() => {
    if (cardTheme === "light") {
      return {
        bg: "linear-gradient(145deg,#ffffff 0%,#f4f5f7 55%,#ffffff 100%)",
        border: "rgba(15,23,42,0.10)",
        fg: "rgba(15,23,42,0.92)",
        muted: "rgba(15,23,42,0.55)",
        soft: "rgba(15,23,42,0.05)",
        softBorder: "rgba(15,23,42,0.10)",
        accent: "rgba(196,149,42,0.95)",
        barcode: "rgba(15,23,42,0.65)",
        stripe: "rgba(15,23,42,0.10)",
      } as const;
    }
    if (cardTheme === "gold") {
      return {
        // Brighter, premium gold look (still readable)
        bg: "linear-gradient(145deg,#3a2a12 0%,#6b4a1a 45%,#2a1b0b 100%)",
        border: "rgba(255,221,128,0.28)",
        fg: "rgba(255,252,246,0.96)",
        muted: "rgba(255,246,224,0.70)",
        soft: "rgba(255,221,128,0.12)",
        softBorder: "rgba(255,221,128,0.22)",
        accent: "rgba(255,216,112,0.98)",
        barcode: "rgba(255,252,246,0.78)",
        stripe: "rgba(0,0,0,0.28)",
      } as const;
    }
    return {
      bg: "linear-gradient(145deg,#07070a 0%,#14141d 52%,#060607 100%)",
      border: "rgba(255,255,255,0.12)",
      fg: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.55)",
      soft: "rgba(255,255,255,0.06)",
      softBorder: "rgba(255,255,255,0.10)",
      accent: "rgba(34,197,94,0.95)",
      barcode: "rgba(255,255,255,0.70)",
      stripe: "rgba(0,0,0,0.35)",
    } as const;
  })();

  const setAndPersistCardTheme = (next: "light" | "dark" | "gold") => {
    setCardTheme(next);
    try {
      localStorage.setItem("one4team.clubCardTheme", next);
    } catch { /* ignore */ }
  };

  const memberNameFromMaster =
    `${values.first_name || ""} ${values.last_name || ""}`.trim();
  const memberName =
    memberNameFromMaster ||
    displayName ||
    "Member";

  const memberSince = values.club_registration_date ? String(values.club_registration_date) : null;
  const birthDate = values.birth_date ? String(values.birth_date) : null;
  const memberIdNo = values.internal_club_number ? String(values.internal_club_number) : null;
  const passNumber = values.player_passport_number ? String(values.player_passport_number) : null;

  const labelMap: Record<string, string> = {
    ...labels,
    clubcard: labels.clubCard,
  };

  const handleGenerateId = () => {
    const id = `O4T-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    onChange?.("internal_club_number", id);
  };

  const passExportBackground =
    cardTheme === "light" ? "#f4f5f7" : cardTheme === "gold" ? "#2a1b0b" : "#0c0c0f";

  const passAccentGradient =
    cardTheme === "gold"
      ? "linear-gradient(90deg, #ffd870 0%, #ffb347 50%, #ffd870 100%)"
      : cardTheme === "light"
        ? "linear-gradient(90deg, #c4952a 0%, #f59e0b 50%, #c4952a 100%)"
        : "linear-gradient(90deg, #c4952a 0%, #fbbf24 50%, #c4952a 100%)";

  const handleDownloadPass = async () => {
    if (!passRef.current) return;
    setPassBusy(true);
    try {
      const url = await captureClubPassAsPng(passRef.current, passExportBackground);
      const a = document.createElement("a");
      a.href = url;
      a.download = `club-pass-${values.internal_club_number || "member"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onChange?.("club_pass_generated_at", new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate pass image.";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPassBusy(false);
    }
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

          {!readOnly && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleGenerateId} className="text-sm">
                    <Ai4TLogo size="xs" variant="bubble" className="mr-1.5" /> {labels.generateId}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-gradient-gold-static text-primary-foreground text-sm"
                    disabled={passBusy || !values.internal_club_number}
                    onClick={() => void handleDownloadPass()}
                  >
                    {passBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                    {labels.downloadPass}
                  </Button>
                </div>

                {/* Card appearance (independent of app theme) */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/40 p-1">
                  {([
                    { id: "light" as const, label: "Light", icon: Sun },
                    { id: "dark" as const, label: "Dark", icon: Moon },
                    { id: "gold" as const, label: "Gold", icon: Crown },
                  ]).map((item) => {
                    const Icon = item.icon;
                    const isActive = cardTheme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAndPersistCardTheme(item.id)}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary/12 text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        )}
                        aria-pressed={isActive}
                        title={`${item.label} card`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-1 items-start justify-center overflow-y-auto py-2 min-h-0">
            <div
              ref={passRef}
              data-club-pass-root
              className={cn(
                "h-fit w-[380px] max-w-full shrink-0",
                "relative rounded-3xl shadow-xl text-left select-none",
              )}
              style={{
                background: cardVars.bg,
                border: `1px solid ${cardVars.border}`,
                fontFamily: CLUB_PASS_FONT,
              }}
            >
              {/* Decorative glows - kept away from header; hidden during PNG export */}
              <div
                data-club-pass-decoration
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl"
                aria-hidden
              >
                <div
                  className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full blur-3xl"
                  style={{ background: "rgba(34,197,94,0.16)" }}
                />
                <div
                  className="absolute -bottom-20 left-8 h-32 w-32 rounded-full blur-3xl"
                  style={{ background: "rgba(196,149,42,0.14)" }}
                />
              </div>

              <div className="relative z-10 rounded-3xl">
              {/* ID header - solid strip so text never competes with glows or overflow clipping */}
              <div
                data-club-pass-header
                className="grid items-start gap-x-3 rounded-t-3xl px-5 py-3.5"
                style={{
                  gridTemplateColumns: "auto minmax(0, 1fr) auto",
                  borderBottom: `1px solid ${cardVars.softBorder}`,
                  background: cardTheme === "light" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.28)",
                }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={clubName ? `${clubName} logo` : "Club logo"}
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover"
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                  />
                ) : (
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}`, color: cardVars.muted }}
                  >
                    {(clubName || "C")[0]}
                  </div>
                )}

                <div className="min-w-0">
                  <span
                    data-club-pass-header-line
                    data-line-height="18"
                    className="uppercase"
                    style={clubPassHeaderLineStyle(cardVars.muted, 11, 18, { fontWeight: 500, letterSpacing: "0.05em" })}
                  >
                    {clubName || "Club"}
                  </span>
                  <span
                    data-club-pass-header-line
                    data-line-height="20"
                    className="mt-1.5 font-semibold"
                    style={clubPassHeaderLineStyle(cardVars.fg, 12, 20, { fontWeight: 600, letterSpacing: "0.03em" })}
                  >
                    MEMBER ID CARD
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <img
                    src={one4teamLogo}
                    alt="ONE4Team"
                    className="h-7 w-7 rounded-lg p-1 object-contain"
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                  />
                  <span
                    data-club-pass-header-line
                    data-line-height="18"
                    className="uppercase"
                    style={clubPassHeaderLineStyle(cardVars.muted, 11, 18, { letterSpacing: "0.05em" })}
                  >
                    ONE4TEAM
                  </span>
                </div>
              </div>

              {/* Main content */}
              <div className="relative px-5 pt-4 pb-5">
                <div className="flex items-start gap-3">
                  {/* Photo */}
                  <div
                    className="h-16 w-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                  >
                    {typeof values.photo_url === "string" && values.photo_url.trim() ? (
                      <img
                        src={values.photo_url.trim()}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="h-8 w-8" style={{ color: cardVars.muted }} />
                    )}
                  </div>

                  {/* Identity + ID number */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-snug break-words" style={{ color: cardVars.fg }}>
                      {memberName}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>Member since</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>{memberSince || "-"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>Date of birth</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>{birthDate || "-"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>Role</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>
                          {membershipRole?.trim() ? membershipRole.replace(/_/g, " ") : "-"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>Team</div>
                        <div className="font-medium leading-4 mt-0.5 break-words" style={{ color: cardVars.fg }}>{teamLabel || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right max-w-[96px]">
                    <div className="text-[10px] leading-4" style={{ color: cardVars.muted }}>ID No.</div>
                    <div className="font-mono text-[12px] font-semibold leading-4 mt-0.5 break-all" style={{ color: cardVars.accent }}>
                      {memberIdNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Membership + pass */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}>
                    <div className="leading-4" style={{ color: cardVars.muted }}>Membership</div>
                    <div className="font-medium leading-4 mt-0.5 break-words" style={{ color: cardVars.fg }}>
                      {values.membership_kind ? String(values.membership_kind).replace(/_/g, " ") : "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}>
                    <div className="leading-4" style={{ color: cardVars.muted }}>Pass #</div>
                    <div className="font-medium leading-4 mt-0.5 break-all" style={{ color: cardVars.fg }}>
                      {passNumber || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom magnetic stripe + gold accent */}
              <div
                className="overflow-hidden rounded-b-3xl"
                style={{ borderTop: `1px solid ${cardVars.softBorder}` }}
              >
                <div className="h-5" style={{ background: cardVars.stripe }} />
                <div className="h-1.5" style={{ background: passAccentGradient }} />
              </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
