import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Calendar, UserCircle2 } from "lucide-react";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { getMissingRequiredMasterFields, masterRecordCompletenessPct } from "@/lib/member-master-schema";
import { MasterDataTabs } from "@/components/members/master-data-tabs";
import type { MasterDataTabsLabels } from "@/components/members/master-data-tabs";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

const PROFILE_AVATAR_BUCKET = "images-avatars";

export interface MemberMasterDialogLabels {
  title: string;
  subtitle: string;
  save: string;
  cancel: string;
  readyBadge: string;
  missingFields: string;
  masterDataFields: string;
}

interface MemberMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  displayName: string;
  email: string | null;
  membershipRole: string;
  teamLabel: string;
  clubName: string | null;
  logoSrc: string;
  initial: Partial<ClubMemberMasterRecord> | null;
  profileAvatarUrl: string | null;
  memberStatus: string;
  phone: string | null;
  joinedAt: string;
  joinedLabel: string;
  supportingMemberLabel: string;
  activeLabel: string;
  roleDisplayLabel: string;
  roleBadgeClassName: string;
  labels: MemberMasterDialogLabels;
  masterTabLabels: MasterDataTabsLabels;
  onSave: (payload: Partial<ClubMemberMasterRecord>) => Promise<void>;
}

export function MemberMasterDialog({
  open,
  onOpenChange,
  membershipId,
  displayName,
  email,
  membershipRole,
  teamLabel,
  clubName,
  logoSrc,
  initial,
  profileAvatarUrl,
  memberStatus,
  phone,
  joinedAt,
  joinedLabel,
  supportingMemberLabel,
  activeLabel,
  roleDisplayLabel,
  roleBadgeClassName,
  labels,
  masterTabLabels,
  onSave,
}: MemberMasterDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState<Partial<ClubMemberMasterRecord>>({});
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

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

  const uploadRegistryAvatar = async (file: File) => {
    if (!user || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/club-member-registry-${membershipId}-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found") ? t.settingsPage.avatarUploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const headerPhoto =
    typeof form.photo_url === "string" && form.photo_url.trim()
      ? form.photo_url.trim()
      : profileAvatarUrl?.trim() || "";

  const initials = (displayName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[calc(100vw-1.5rem)] !max-w-6xl min-w-0 flex-col gap-0 overflow-hidden border-border/80 bg-card/95 p-0 backdrop-blur-xl sm:w-full">
        <DialogHeader className="px-4 sm:px-5 pt-5 pb-3 space-y-3 text-left border-b border-border/60">
          <DialogTitle className="sr-only">
            {labels.title}: {displayName}
          </DialogTitle>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 overflow-hidden">
                {headerPhoto ? (
                  <img src={headerPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                  <span>{teamLabel}</span>
                  {email ? <span className="text-xs opacity-80">· {email}</span> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 h-6">
                {pct}%
              </Badge>
              {form.membership_kind === "supporting_member" ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300">
                  {supportingMemberLabel}
                </span>
              ) : null}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadgeClassName}`}>
                {roleDisplayLabel}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  memberStatus === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                }`}
              >
                {memberStatus === "active" ? activeLabel : memberStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {phone ? (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" /> {phone}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" /> {joinedLabel}{" "}
              {new Date(joinedAt).toLocaleDateString()}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{labels.subtitle}</p>

          {missing.length > 0 ? (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 font-normal w-fit">
              {labels.missingFields}: {missing.join(", ")}
            </Badge>
          ) : (
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 font-normal border-0 w-fit">{labels.readyBadge}</Badge>
          )}
        </DialogHeader>

        <ScrollArea className="min-h-0 min-w-0 w-full flex-1 max-h-[calc(90vh-280px)] px-4 sm:px-5">
          <div className="w-full min-w-0 pb-4 pt-3 pr-2">
            <div className="w-full min-w-0 rounded-lg border border-border/40 bg-muted/10 p-3">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <UserCircle2 className="w-4 h-4 text-primary" /> {labels.masterDataFields}
              </div>
              <MasterDataTabs
                key={`${membershipId}-${String(open)}`}
                values={form}
                labels={masterTabLabels}
                compact
                displayName={displayName}
                clubName={clubName}
                logoSrc={logoSrc}
                membershipRole={membershipRole}
                teamLabel={teamLabel}
                email={email}
                avatarUpload={{
                  uploading: avatarUploading,
                  onUpload: (file) => void uploadRegistryAvatar(file),
                  onRemove: () => setField("photo_url", null),
                }}
                onChange={(key, value) => setField(key, value)}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="px-4 sm:px-5 py-4 border-t border-border/60 flex justify-end gap-2 bg-background/80 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {labels.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
