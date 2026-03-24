import { useRef, useState } from "react";
import {
  User, MapPin, Dumbbell, Trophy, Building2, Landmark, ShieldAlert, IdCard,
  Sparkles, Download, Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEMBER_MASTER_FIELDS } from "@/lib/member-master-schema";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { cn } from "@/lib/utils";

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
}

function formatFieldLabel(column: string) {
  return column.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatDisplayValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  return String(raw).replace(/_/g, " ");
}

export function MasterDataTabs({
  values, labels, readOnly, onChange, compact,
  displayName, clubName, logoSrc, membershipRole, teamLabel, email,
}: MasterDataTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("identity");
  const passRef = useRef<HTMLDivElement | null>(null);
  const [passBusy, setPassBusy] = useState(false);

  const labelMap: Record<string, string> = {
    ...labels,
    clubcard: labels.clubCard,
  };

  const maxFields = FIELD_TABS.reduce((max, { key }) => {
    const count = MEMBER_MASTER_FIELDS.filter((f) => f.group === key).length;
    return Math.max(max, count);
  }, 0);

  const handleGenerateId = () => {
    const id = `O4T-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    onChange?.("internal_club_number", id);
  };

  const handleDownloadPass = async () => {
    if (!passRef.current) return;
    setPassBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(passRef.current, { scale: 2, backgroundColor: "#0c0c0f" });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `club-pass-${values.internal_club_number || "member"}.png`;
      a.click();
      onChange?.("club_pass_generated_at", new Date().toISOString());
    } finally {
      setPassBusy(false);
    }
  };

  const allTabs = [...FIELD_TABS, CARD_TAB];

  const cols = compact ? 3 : 4;
  const maxRows = Math.ceil(maxFields / cols);
  const rowHeight = readOnly ? 64 : 72;
  const gapPx = 12;
  const minH = maxRows * rowHeight + (maxRows - 1) * gapPx;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={cn(
        "w-full flex flex-wrap justify-start gap-1 h-auto bg-transparent p-0 mb-3",
        compact && "mb-2",
      )}>
        {allTabs.map(({ key, icon: Icon, accent, activeBg }) => (
          <TabsTrigger
            key={key}
            value={key}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border border-transparent",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50",
              activeBg,
              "data-[state=active]:border-current/20 data-[state=active]:shadow-sm",
            )}
          >
            <Icon className={cn("w-4 h-4", activeTab === key ? "" : accent)} />
            <span className="hidden sm:inline">{labelMap[key]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {FIELD_TABS.map(({ key, accent }) => {
        const fields = MEMBER_MASTER_FIELDS.filter((f) => f.group === key);
        if (!fields.length) return null;
        return (
          <TabsContent key={key} value={key} className="mt-0">
            <div
              className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}
              style={{ minHeight: minH }}
            >
              {fields.map((field) => {
                const val = values[field.key];
                if (readOnly) {
                  const hasVal = val !== null && val !== undefined && val !== "";
                  return (
                    <div key={field.key} className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <div className={cn("text-sm mb-0.5", accent)}>{formatFieldLabel(field.column)}</div>
                      <div className={cn("text-sm font-medium truncate", hasVal ? "text-foreground" : "text-muted-foreground/40")}>
                        {formatDisplayValue(val)}
                      </div>
                    </div>
                  );
                }

                if (field.key === "sex") {
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className={cn("text-sm", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
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
                    <div key={field.key} className="space-y-1">
                      <label className={cn("text-sm", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
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
                    <div key={field.key} className="space-y-1">
                      <label className={cn("text-sm", accent)}>{formatFieldLabel(field.column)}</label>
                      <Select value={String(val ?? "")} onValueChange={(v) => onChange?.(field.key, v || null)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                const isDate = ["birth_date", "club_registration_date", "team_assignment_date", "club_exit_date"].includes(field.key);
                const isNumber = ["height_cm", "weight_kg", "jersey_number", "goals_count"].includes(field.key);

                return (
                  <div key={field.key} className="space-y-1">
                    <label className={cn("text-sm", accent)}>{formatFieldLabel(field.column)}</label>
                    <Input
                      className="h-10 text-sm"
                      type={isDate ? "date" : isNumber ? "number" : "text"}
                      value={val != null ? String(val) : ""}
                      placeholder="—"
                      onChange={(e) => {
                        if (isNumber) {
                          onChange?.(field.key, e.target.value === "" ? null : Number(e.target.value));
                        } else {
                          onChange?.(field.key, e.target.value || null);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        );
      })}

      <TabsContent value="clubcard" className="mt-0">
        <div style={{ minHeight: minH }} className="flex flex-col">
          <p className="text-sm text-muted-foreground mb-4">{labels.clubCardHint}</p>

          {!readOnly && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button type="button" size="sm" variant="outline" onClick={handleGenerateId} className="text-sm">
                <Sparkles className="w-4 h-4 mr-1.5" /> {labels.generateId}
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
          )}

          <div className="flex justify-center py-2">
            <div
              ref={passRef}
              className="w-[340px] rounded-2xl overflow-hidden border border-white/10 shadow-xl text-left"
              style={{ background: "linear-gradient(145deg,#15151c,#0a0a0c)" }}
            >
              <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/5 p-1" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-xs font-bold">
                    {(clubName || "C")[0]}
                  </div>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">{clubName || "Club"}</div>
                  <div className="text-sm font-bold text-white leading-tight">{displayName || values.first_name ? `${values.first_name || ""} ${values.last_name || ""}`.trim() : "Member"}</div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2.5 text-sm text-white/80">
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">ID</span>
                  <span className="font-mono text-emerald-300 font-medium">{values.internal_club_number || "—"}</span>
                </div>
                {teamLabel ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Team</span>
                    <span>{teamLabel}</span>
                  </div>
                ) : null}
                {membershipRole ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Role</span>
                    <span className="capitalize">{membershipRole.replace(/_/g, " ")}</span>
                  </div>
                ) : null}
                {email ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Email</span>
                    <span className="truncate max-w-[190px]">{email}</span>
                  </div>
                ) : null}
                {values.birth_date ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Birth date</span>
                    <span>{values.birth_date}</span>
                  </div>
                ) : null}
                {values.nationality ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Nationality</span>
                    <span>{values.nationality}</span>
                  </div>
                ) : null}
                {values.player_passport_number ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Pass #</span>
                    <span className="font-mono">{values.player_passport_number}</span>
                  </div>
                ) : null}
              </div>
              <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary opacity-90" />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
