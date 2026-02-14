import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings2, User, Building2, Bell, Shield,
  Save, Loader2, LogOut, KeyRound, Trash2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const LS_NOTIF_KEY = "one4team.notifications";

interface NotifPrefs {
  email: boolean;
  push: boolean;
  matchReminders: boolean;
  trainingReminders: boolean;
  paymentReminders: boolean;
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

export default function Settings() {
  const { user, signOut } = useAuth();
  const perms = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"profile" | "club" | "notifications" | "account">("profile");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Club
  const [defaultLang, setDefaultLang] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [seasonStart, setSeasonStart] = useState("8");

  // Notifications
  const [notifs, setNotifs] = useState<NotifPrefs>(loadNotifPrefs);

  // Account
  const [resetSending, setResetSending] = useState(false);

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
              ) : (
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.defaultLanguage}</div>
                    <select
                      className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                      value={defaultLang}
                      onChange={(e) => setDefaultLang(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.timezone}</div>
                    <select
                      className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Europe/Zurich">Europe/Zurich (CET)</option>
                      <option value="Europe/Vienna">Europe/Vienna (CET)</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.seasonStart}</div>
                    <select
                      className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                      value={seasonStart}
                      onChange={(e) => setSeasonStart(e.target.value)}
                    >
                      {["1","2","3","4","5","6","7","8","9","10","11","12"].map((m) => (
                        <option key={m} value={m}>
                          {new Date(2026, parseInt(m) - 1, 1).toLocaleString("en", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                      onClick={() => toast({ title: t.settingsPage.clubSettingsSaved })}
                    >
                      <Save className="w-4 h-4 mr-1" /> {t.clubPageAdmin.saveChanges}
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
