import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings2, User, Building2, Bell, Shield,
  Save, Loader2, LogOut, KeyRound, Trash2, AlertTriangle, Mail, UploadCloud, UserCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const LS_NOTIF_KEY = "one4team.notifications";
const PROFILE_AVATAR_BUCKET = "images-avatars";
const CLUB_ROLE_LADDER = ["admin", "trainer", "player", "member"];

interface NotifPrefs {
  email: boolean;
  push: boolean;
  matchReminders: boolean;
  trainingReminders: boolean;
  paymentReminders: boolean;
}

interface RoleMembershipSummary {
  clubId: string;
  clubName: string;
  baseRole: string;
  effectiveRoles: string[];
  isActiveClub: boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  email: true,
  push: true,
  matchReminders: true,
  trainingReminders: true,
  paymentReminders: true,
};

function loadNotifPrefs(): NotifPrefs {
  try {
    const stored = localStorage.getItem(LS_NOTIF_KEY);
    if (stored) return { ...DEFAULT_NOTIF, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_NOTIF;
}

function getImpliedRoles(role: string | null | undefined): string[] {
  if (!role) return [];

  const roleImplications: Record<string, string[]> = {
    admin: ["admin", "trainer", "player", "member"],
    trainer: ["trainer", "player", "member"],
    player: ["player", "member"],
    staff: ["staff", "member"],
    member: ["member"],
    parent: ["parent"],
    sponsor: ["sponsor"],
    supplier: ["supplier"],
    service_provider: ["service_provider"],
    consultant: ["consultant"],
  };

  return roleImplications[role] ?? [role];
}

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function Settings() {
  const { user, changeEmail, signOut } = useAuth();
  const { activeClubId, activeClub, clubs, loading: activeClubLoading } = useActiveClub();
  const perms = usePermissions();
  const { t, setLanguage } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"profile" | "club" | "notifications" | "account">("profile");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Club
  const [defaultLang, setDefaultLang] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [seasonStart, setSeasonStart] = useState("8");
  const [clubLoading, setClubLoading] = useState(true);
  const [clubSaving, setClubSaving] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<NotifPrefs>(loadNotifPrefs);

  // Account
  const [resetSending, setResetSending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changeEmailSending, setChangeEmailSending] = useState(false);

  const roleMemberships = useMemo<RoleMembershipSummary[]>(
    () =>
      clubs.map((club) => ({
        clubId: club.id,
        clubName: club.name,
        baseRole: club.role,
        effectiveRoles: getImpliedRoles(club.role),
        isActiveClub: club.id === activeClubId,
      })),
    [clubs, activeClubId],
  );

  const activeClubRoleSummary = useMemo(
    () => roleMemberships.find((membership) => membership.isActiveClub) ?? null,
    [roleMemberships],
  );

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, phone")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setDisplayName((data as Record<string, unknown>).display_name as string || "");
          setAvatarUrl((data as Record<string, unknown>).avatar_url as string || "");
          setPhone((data as Record<string, unknown>).phone as string || "");
        }
      } catch { /* ok */ }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!activeClubId) {
      setClubLoading(false);
      return;
    }

    const fetchClubSettings = async () => {
      setClubLoading(true);
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select("default_language, timezone, season_start_month")
          .eq("id", activeClubId)
          .single();
        if (error) throw error;

        if (data) {
          setDefaultLang((data.default_language || "en") as string);
          setTimezone((data.timezone || "Europe/Berlin") as string);
          setSeasonStart(String(data.season_start_month ?? 8));
        }
      } catch {
        // Fallback values keep screen usable if columns are not migrated yet.
      } finally {
        setClubLoading(false);
      }
    };

    void fetchClubSettings();
  }, [activeClubId]);

  const saveProfile = async () => {
    if (!user || profileSaving) return;
    setProfileSaving(true);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
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

  const toggleNotif = (key: keyof NotifPrefs) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(LS_NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sendPasswordReset = async () => {
    if (!user?.email || resetSending) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast({ title: t.settingsPage.resetLinkSent });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset link";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setResetSending(false);
    }
  };

  const sendChangeEmail = async () => {
    const targetEmail = newEmail.trim().toLowerCase();
    if (!targetEmail || !user?.email || changeEmailSending) return;
    if (targetEmail === user.email.toLowerCase()) {
      toast({ title: t.settingsPage.changeEmailSameAddress, variant: "destructive" });
      return;
    }
    setChangeEmailSending(true);
    try {
      const { error } = await changeEmail(targetEmail);
      if (error) throw error;
      toast({ title: t.settingsPage.changeEmailLinkSent });
      setNewEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send change email link";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setChangeEmailSending(false);
    }
  };

  const saveClubSettings = async () => {
    if (!activeClubId || clubSaving) return;
    setClubSaving(true);
    try {
      const { error } = await supabase
        .from("clubs")
        .update({
          default_language: defaultLang,
          timezone,
          season_start_month: Number.parseInt(seasonStart, 10),
        })
        .eq("id", activeClubId);
      if (error) throw error;

      if (defaultLang === "en" || defaultLang === "de") setLanguage(defaultLang);
      toast({ title: t.settingsPage.clubSettingsSaved });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setClubSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const tabs = [
    { id: "profile" as const, label: t.settingsPage.tabs.profile, icon: User },
    { id: "club" as const, label: t.settingsPage.tabs.club, icon: Building2 },
    { id: "notifications" as const, label: t.settingsPage.tabs.notifications, icon: Bell },
    { id: "account" as const, label: t.settingsPage.tabs.account, icon: Shield },
  ];

  const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description: string }) => (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 pr-4">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={t.settingsPage.title} subtitle={t.settingsPage.subtitle} />

      {/* Tabs */}
      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === tb.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* ── Profile ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              {profileLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.displayName}</div>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">{t.settingsPage.avatarPreview}</div>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName || "Avatar"} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle2 className="w-8 h-8 text-muted-foreground" />
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
                          <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                            {avatarUploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1" />}
                            {avatarUploading ? t.settingsPage.uploadingAvatar : t.settingsPage.uploadAvatar}
                          </span>
                        </label>
                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs"
                            onClick={() => setAvatarUrl("")}
                            disabled={avatarUploading}
                          >
                            {t.settingsPage.removeAvatar}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.avatarUrl}</div>
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.phone}</div>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 ..." />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.emailAddress}</div>
                    <Input value={user?.email || ""} readOnly className="opacity-60" />
                    <div className="text-[10px] text-muted-foreground mt-1">{t.settingsPage.emailReadOnly}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.settingsPage.roleAccessTitle}</div>
                      <p className="text-[11px] text-muted-foreground">{t.settingsPage.roleAccessDesc}</p>
                    </div>

                    {activeClubRoleSummary ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{t.settingsPage.roleActiveClub}</span>
                          <span className="text-xs px-2 py-1 rounded-full border border-border/60 bg-card/40 text-foreground">
                            {activeClub?.name || activeClubRoleSummary.clubName}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary">
                            {t.settingsPage.roleBaseRole}: {formatRoleLabel(activeClubRoleSummary.baseRole)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {CLUB_ROLE_LADDER.map((role) => {
                            const hasRole = activeClubRoleSummary.effectiveRoles.includes(role);
                            const isBaseRole = activeClubRoleSummary.baseRole === role;
                            return (
                              <div
                                key={role}
                                className={`rounded-xl border px-2.5 py-2 text-center ${
                                  hasRole
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border/60 bg-card/30 text-muted-foreground"
                                }`}
                              >
                                <div className="text-[11px] font-medium">{formatRoleLabel(role)}</div>
                                <div className="text-[10px] mt-0.5 opacity-80">
                                  {isBaseRole ? t.settingsPage.roleAssigned : hasRole ? t.settingsPage.roleInherited : t.settingsPage.roleNotGranted}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{t.settingsPage.roleEffectiveRoles}</span>
                          {activeClubRoleSummary.effectiveRoles.map((role) => (
                            <span key={role} className="text-xs px-2 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                              {formatRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t.settingsPage.roleNoClub}</p>
                    )}

                    {roleMemberships.length > 1 && (
                      <div className="pt-1 border-t border-border/60">
                        <div className="text-[11px] text-muted-foreground mb-2">{t.settingsPage.roleMembershipsOverview}</div>
                        <div className="space-y-2">
                          {roleMemberships.map((membership) => (
                            <div key={membership.clubId} className="rounded-xl border border-border/60 bg-card/30 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-foreground truncate">{membership.clubName}</div>
                                {membership.isActiveClub && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary">
                                    {t.settingsPage.roleActiveTag}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {t.settingsPage.roleBaseRole}: {formatRoleLabel(membership.baseRole)} {"->"} {membership.effectiveRoles.map(formatRoleLabel).join(" / ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                      onClick={saveProfile}
                      disabled={profileSaving}
                    >
                      {profileSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      {t.settingsPage.saveProfile}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Club ── */}
        {tab === "club" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground">{t.settingsPage.clubSettings}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.settingsPage.clubSettingsDesc}</p>
                </div>
              </div>

              {!perms.isAdmin ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{t.settingsPage.adminOnly}</p>
                </div>
              ) : !activeClubId ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{t.clubPageAdmin.noClubDesc}</p>
                </div>
              ) : clubLoading || activeClubLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.defaultLanguage}</div>
                    <Select value={defaultLang} onValueChange={setDefaultLang}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.timezone}</div>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                        <SelectItem value="Europe/Zurich">Europe/Zurich (CET)</SelectItem>
                        <SelectItem value="Europe/Vienna">Europe/Vienna (CET)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.seasonStart}</div>
                    <Select value={seasonStart} onValueChange={setSeasonStart}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1","2","3","4","5","6","7","8","9","10","11","12"].map((month) => (
                          <SelectItem key={month} value={month}>
                            {new Date(2026, parseInt(month, 10) - 1, 1).toLocaleString("en", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                      onClick={saveClubSettings}
                      disabled={clubSaving}
                    >
                      {clubSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      {t.clubPageAdmin.saveChanges}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === "notifications" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground">{t.settingsPage.notificationPrefs}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.settingsPage.notificationPrefsDesc}</p>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                <Toggle checked={notifs.email} onChange={() => toggleNotif("email")} label={t.settingsPage.emailNotifications} description={t.settingsPage.emailNotificationsDesc} />
                <Toggle checked={notifs.push} onChange={() => toggleNotif("push")} label={t.settingsPage.pushNotifications} description={t.settingsPage.pushNotificationsDesc} />
                <Toggle checked={notifs.matchReminders} onChange={() => toggleNotif("matchReminders")} label={t.settingsPage.matchReminders} description={t.settingsPage.matchRemindersDesc} />
                <Toggle checked={notifs.trainingReminders} onChange={() => toggleNotif("trainingReminders")} label={t.settingsPage.trainingReminders} description={t.settingsPage.trainingRemindersDesc} />
                <Toggle checked={notifs.paymentReminders} onChange={() => toggleNotif("paymentReminders")} label={t.settingsPage.paymentReminders} description={t.settingsPage.paymentRemindersDesc} />
              </div>
            </div>
          </div>
        )}

        {/* ── Account ── */}
        {tab === "account" && (
          <div className="space-y-4">
            {/* Password */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <KeyRound className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground">{t.settingsPage.changePassword}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.settingsPage.changePasswordDesc}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={sendPasswordReset}
                disabled={resetSending}
              >
                {resetSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <KeyRound className="w-4 h-4 mr-1" />}
                {t.settingsPage.sendResetLink}
              </Button>
            </div>

            {/* Change email */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground">{t.settingsPage.changeEmail}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.settingsPage.changeEmailDesc}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.newEmailAddress}</div>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={sendChangeEmail}
                  disabled={changeEmailSending || !newEmail.trim()}
                >
                  {changeEmailSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
                  {t.settingsPage.sendChangeEmailLink}
                </Button>
              </div>
            </div>

            {/* Sign out */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LogOut className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground">{t.settingsPage.signOut}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.settingsPage.signOutDesc}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-1" /> {t.settingsPage.signOut}
              </Button>
            </div>

            {/* Danger zone */}
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 backdrop-blur-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-destructive" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-destructive">{t.settingsPage.dangerZone}</h2>
                </div>
              </div>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground">{t.settingsPage.deleteAccount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.settingsPage.deleteAccountDesc}</p>
              </div>
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" disabled>
                <Trash2 className="w-4 h-4 mr-1" /> {t.settingsPage.deleteAccount}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">{t.settingsPage.deleteAccountPlaceholder}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
