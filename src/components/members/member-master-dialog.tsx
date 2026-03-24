import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Sparkles, IdCard } from "lucide-react";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { MEMBER_MASTER_FIELDS, getMissingRequiredMasterFields, masterRecordCompletenessPct } from "@/lib/member-master-schema";
import { cn } from "@/lib/utils";

export interface MemberMasterDialogLabels {
  title: string;
  subtitle: string;
  save: string;
  cancel: string;
  readyBadge: string;
  requiredBadge: string;
  optionalBadge: string;
  recommendedBadge: string;
  sectionIdentity: string;
  sectionContact: string;
  sectionSport: string;
  sectionPerformance: string;
  sectionClub: string;
  sectionFinancial: string;
  sectionSafety: string;
  completeness: string;
  missingFields: string;
  generateInternalId: string;
  downloadPass: string;
  passTitle: string;
  passHint: string;
}

interface MemberMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  email: string | null;
  membershipRole: string;
  teamLabel: string;
  clubName: string | null;
  logoSrc: string;
  initial: Partial<ClubMemberMasterRecord> | null;
  labels: MemberMasterDialogLabels;
  onSave: (payload: Partial<ClubMemberMasterRecord>) => Promise<void>;
}

const groupOrder = ["identity", "contact", "sport", "performance", "club", "financial", "safety"] as const;

export function MemberMasterDialog({
  open,
  onOpenChange,
  displayName,
  email,
  membershipRole,
  teamLabel,
  clubName,
  logoSrc,
  initial,
  labels,
  onSave,
}: MemberMasterDialogProps) {
  const [form, setForm] = useState<Partial<ClubMemberMasterRecord>>({});
  const [saving, setSaving] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const passRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? { ...initial }
        : {
            membership_kind: "active_participant",
          },
    );
  }, [open, initial]);

  const missing = useMemo(
    () => getMissingRequiredMasterFields(form, membershipRole),
    [form, membershipRole],
  );
  const pct = useMemo(() => masterRecordCompletenessPct(form, membershipRole), [form, membershipRole]);

  const setField = (key: keyof ClubMemberMasterRecord, value: string | number | null) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch {
      /* Parent shows toast */
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateId = () => {
    const id = `O4T-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    setField("internal_club_number", id);
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
      a.download = `club-pass-${form.internal_club_number || "member"}.png`;
      a.click();
      setField("club_pass_generated_at", new Date().toISOString());
    } finally {
      setPassBusy(false);
    }
  };

  const fieldByGroup = useMemo(() => {
    const map = new Map<string, typeof MEMBER_MASTER_FIELDS>();
    for (const g of groupOrder) map.set(g, []);
    for (const f of MEMBER_MASTER_FIELDS) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return map;
  }, []);

  const sectionTitle: Record<string, string> = {
    identity: labels.sectionIdentity,
    contact: labels.sectionContact,
    sport: labels.sectionSport,
    performance: labels.sectionPerformance,
    club: labels.sectionClub,
    financial: labels.sectionFinancial,
    safety: labels.sectionSafety,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader className="px-6 pt-6 pb-2 space-y-1">
          <DialogTitle className="font-display text-xl">{labels.title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {labels.subtitle}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {labels.completeness}: {pct}%
            </Badge>
            {missing.length > 0 ? (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 font-normal">
                {labels.missingFields}: {missing.join(", ")}
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 font-normal border-0">{labels.readyBadge}</Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)] px-6">
          <div className="space-y-6 pb-4 pr-3">
            {groupOrder.map((group) => {
              const fields = fieldByGroup.get(group) ?? [];
              if (!fields.length) return null;
              return (
                <div key={group}>
                  <div className="text-xs font-semibold text-foreground/90 tracking-wide uppercase mb-3">
                    {sectionTitle[group]}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {fields.map((field) => {
                      const value = form[field.key];
                      const req = field.required ? labels.requiredBadge : field.recommended ? labels.recommendedBadge : labels.optionalBadge;
                      return (
                        <div key={field.key} className={cn("space-y-1.5", field.key === "role_development_notes" || field.key === "strengths" ? "sm:col-span-2" : "")}>
                          <Label className="text-[11px] text-muted-foreground flex items-center gap-2">
                            {field.column.replace(/_/g, " ")}
                            <span className="text-[10px] opacity-70">({req})</span>
                          </Label>
                          {field.key === "sex" ? (
                            <Select
                              value={(value as string) || ""}
                              onValueChange={(v) => setField("sex", v as ClubMemberMasterRecord["sex"])}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">male</SelectItem>
                                <SelectItem value="female">female</SelectItem>
                                <SelectItem value="other">other</SelectItem>
                                <SelectItem value="prefer_not_to_say">prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : field.key === "membership_kind" ? (
                            <Select
                              value={(value as string) || "active_participant"}
                              onValueChange={(v) => setField("membership_kind", v as ClubMemberMasterRecord["membership_kind"])}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active_participant">active participant</SelectItem>
                                <SelectItem value="supporting_member">supporting member</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : field.key === "strong_leg" || field.key === "strong_hand" ? (
                            <Select
                              value={(value as string) || ""}
                              onValueChange={(v) => setField(field.key, v as "left" | "right" | "both")}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">left</SelectItem>
                                <SelectItem value="right">right</SelectItem>
                                <SelectItem value="both">both</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : field.key === "birth_date" ||
                            field.key === "club_registration_date" ||
                            field.key === "team_assignment_date" ||
                            field.key === "club_exit_date" ? (
                            <Input
                              type="date"
                              className="h-9"
                              value={typeof value === "string" && value ? value.slice(0, 10) : ""}
                              onChange={(e) => setField(field.key, e.target.value || null)}
                            />
                          ) : field.key === "height_cm" ||
                            field.key === "weight_kg" ||
                            field.key === "jersey_number" ||
                            field.key === "goals_count" ? (
                            <Input
                              type="number"
                              className="h-9"
                              value={value === null || value === undefined ? "" : String(value)}
                              onChange={(e) => {
                                const n = e.target.value === "" ? null : Number(e.target.value);
                                setField(field.key, n === null || Number.isNaN(n) ? null : n);
                              }}
                            />
                          ) : field.key === "role_development_notes" || field.key === "strengths" ? (
                            <textarea
                              className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={typeof value === "string" ? value : ""}
                              onChange={(e) => setField(field.key, e.target.value || null)}
                            />
                          ) : (
                            <Input
                              className="h-9"
                              value={typeof value === "string" ? value : value === null || value === undefined ? "" : String(value)}
                              onChange={(e) => setField(field.key, e.target.value || null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="mt-6" />
                </div>
              );
            })}

            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
                <IdCard className="w-4 h-4 text-primary" /> {labels.passTitle}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{labels.passHint}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleGenerateId}>
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> {labels.generateInternalId}
                </Button>
                <Button type="button" size="sm" className="bg-gradient-gold-static text-primary-foreground" disabled={passBusy} onClick={handleDownloadPass}>
                  {passBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                  {labels.downloadPass}
                </Button>
              </div>
              <div className="flex justify-center pt-2">
                <div
                  ref={passRef}
                  className="w-[320px] rounded-2xl overflow-hidden border border-white/10 shadow-xl text-left"
                  style={{ background: "linear-gradient(145deg,#15151c,#0a0a0c)" }}
                >
                  <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10">
                    <img src={logoSrc} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/5 p-1" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">{clubName || "Club"}</div>
                      <div className="text-sm font-bold text-white leading-tight">{displayName}</div>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-2 text-xs text-white/80">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">ID</span>
                      <span className="font-mono text-emerald-300">{form.internal_club_number || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">Team</span>
                      <span>{teamLabel}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">Role</span>
                      <span className="capitalize">{membershipRole.replace("_", " ")}</span>
                    </div>
                    {email ? (
                      <div className="flex justify-between gap-2">
                        <span className="text-white/50">Email</span>
                        <span className="truncate max-w-[180px]">{email}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary opacity-90" />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-2 bg-background/80">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {labels.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
