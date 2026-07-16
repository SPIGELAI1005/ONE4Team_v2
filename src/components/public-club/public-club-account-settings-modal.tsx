import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save, Settings, UploadCloud, UserCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";
import {
  clubModalFormInputClass,
  clubModalFormLabelClass,
  clubReadableModalOverlayClass,
  clubReadableModalPanelClass,
} from "@/lib/public-club-glass-classes";
import { publicClubCssVars } from "@/components/public-club/club-theme-provider";
import { usePublicClub } from "@/contexts/public-club-context";
import { cn } from "@/lib/utils";

const PROFILE_AVATAR_BUCKET = "images-avatars";

interface PublicClubAccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicClubAccountSettingsModal({ open, onOpenChange }: PublicClubAccountSettingsModalProps) {
  const { club } = usePublicClub();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setDisplayName((data?.display_name as string | null) ?? "");
        setAvatarUrl((data?.avatar_url as string | null) ?? "");
        setPhone((data?.phone as string | null) ?? "");
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : t.settingsPage.saveFailed;
          toast({ title: t.common.error, description: message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, t.common.error, t.settingsPage.saveFailed, toast, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange, open]);

  const uploadProfileAvatar = async (file: File) => {
    if (!user || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/avatar-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsPage.uploadFailed;
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found")
          ? t.settingsPage.avatarUploadBucketHint
          : message,
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
          phone: phone.trim() || null,
        } as Record<string, unknown>)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: t.settingsPage.profileSaved });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsPage.saveFailed;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email || resetSending) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({ title: t.settingsPage.resetLinkSent });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsPage.resetLinkFailed;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setResetSending(false);
    }
  };

  if (!club || !user || !mounted) return null;

  const primaryStyle = clubCtaPrimaryInlineStyle(club.primary_color || "#C4A052");

  return createPortal(
    <div className="text-[color:var(--club-foreground)]" style={publicClubCssVars(club)}>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto",
              "p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6",
              clubReadableModalOverlayClass,
            )}
            onClick={() => onOpenChange(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="club-account-settings-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={cn(
                "my-auto flex w-full max-w-md flex-col overflow-hidden",
                "max-h-[min(92dvh,calc(100dvh-2rem))]",
                clubReadableModalPanelClass,
              )}
              onClick={(event) => event.stopPropagation()}
            >
            <div className="border-b border-neutral-200/80 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-[color:var(--club-primary)]">
                    <Settings className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="club-account-settings-title"
                      className="font-display text-base font-semibold text-neutral-900 sm:text-lg"
                    >
                      {t.clubPage.profileAccountSettings}
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-600 sm:text-sm">
                      {t.clubPage.profileSettingsModalDesc}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  onClick={() => onOpenChange(false)}
                  aria-label={t.common.close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--club-primary)]" />
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSave();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="club-profile-display-name" className={clubModalFormLabelClass}>
                      {t.settingsPage.displayName}
                    </Label>
                    <Input
                      id="club-profile-display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={t.settingsPage.displayNamePlaceholder}
                      className={clubModalFormInputClass}
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={clubModalFormLabelClass}>{t.settingsPage.avatarPreview}</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName || t.settingsPage.avatarAltFallback}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserCircle2 className="h-8 w-8 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              void uploadProfileAvatar(file);
                              event.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex cursor-pointer items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-50">
                            {avatarUploading ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UploadCloud className="mr-1 h-3.5 w-3.5" />
                            )}
                            {avatarUploading ? t.settingsPage.uploadingAvatar : t.settingsPage.uploadAvatar}
                          </span>
                        </label>
                        {avatarUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 border-neutral-300 bg-white text-xs text-neutral-900 hover:bg-neutral-50"
                            onClick={() => setAvatarUrl("")}
                            disabled={avatarUploading}
                          >
                            {t.settingsPage.removeAvatar}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="club-profile-phone" className={clubModalFormLabelClass}>
                      {t.settingsPage.phone}
                    </Label>
                    <Input
                      id="club-profile-phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+49 ..."
                      className={clubModalFormInputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="club-profile-email" className={clubModalFormLabelClass}>
                      {t.settingsPage.emailAddress}
                    </Label>
                    <Input
                      id="club-profile-email"
                      value={user.email ?? ""}
                      readOnly
                      className={cn(clubModalFormInputClass, "opacity-70")}
                    />
                    <p className="text-[11px] text-neutral-500">{t.settingsPage.emailReadOnly}</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-4">
                    <p className="text-sm font-medium text-neutral-900">{t.settingsPage.changePassword}</p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">{t.settingsPage.changePasswordDesc}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                      disabled={resetSending || !user.email}
                      onClick={() => void sendPasswordReset()}
                    >
                      {resetSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t.settingsPage.sendResetLink}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200/80 bg-white/80 px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                onClick={() => onOpenChange(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                className={cn("font-semibold", clubCtaFillHoverClass)}
                style={primaryStyle}
                disabled={loading || saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t.clubPage.profileSettingsSave}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
