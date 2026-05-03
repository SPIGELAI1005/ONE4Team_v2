import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings2, User, Building2, Bell, Shield,
  Save, Loader2, LogOut, KeyRound, Trash2, AlertTriangle, Mail, UploadCloud, UserCircle2, Sparkles,
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveClub, notifyMembershipsUpdated } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { correlationHeaders } from "@/lib/observability";
import { supabaseErrorMessage, isTransientSupabaseMessage } from "@/lib/supabase-error-message";
import {
  DASHBOARD_PAGE_MAX_INNER,
  DASHBOARD_PAGE_ROOT,
  DASHBOARD_TABS_INNER_SCROLL,
  DASHBOARD_TABS_ROW,
} from "@/lib/dashboard-page-shell";

const LS_NOTIF_KEY = "one4team.notifications";
const PROFILE_AVATAR_BUCKET = "images-avatars";
const CLUB_ROLE_LADDER = ["admin", "trainer", "player", "member"];

type ClubLlmProvider = "openai" | "anthropic" | "google_gemini" | "azure_openai" | "github_models";

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
  const { activeClubId, activeClub, clubs, loading: activeClubLoading, refetchMemberships } = useActiveClub();
  const perms = usePermissions();
  const { t, setLanguage, language } = useLanguage();
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
  const [clubSettingsError, setClubSettingsError] = useState<string | null>(null);

  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmProvider, setLlmProvider] = useState<ClubLlmProvider>("openai");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmAzureEndpoint, setLlmAzureEndpoint] = useState("");
  const [llmAzureApiVersion, setLlmAzureApiVersion] = useState("2024-02-15-preview");
  const [llmHasSavedKey, setLlmHasSavedKey] = useState(false);

  type LlmHealthUi = "idle" | "checking" | "connected" | "not_configured" | "error";
  const [llmHealth, setLlmHealth] = useState<LlmHealthUi>("idle");
  const [llmHealthDetail, setLlmHealthDetail] = useState<string | null>(null);
  const [llmHealthSource, setLlmHealthSource] = useState<"club" | "platform" | null>(null);

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

  const fetchClubSettings = useCallback(async () => {
    if (!activeClubId) {
      setClubLoading(false);
      setClubSettingsError(null);
      return;
    }
    setClubLoading(true);
    setClubSettingsError(null);
    const { data, error } = await supabase
      .from("clubs")
      .select("default_language, timezone, season_start_month")
      .eq("id", activeClubId)
      .single();
    if (error) {
      setClubSettingsError(supabaseErrorMessage(error));
      setClubLoading(false);
      return;
    }
    if (data) {
      setDefaultLang((data.default_language || "en") as string);
      setTimezone((data.timezone || "Europe/Berlin") as string);
      setSeasonStart(String(data.season_start_month ?? 8));
    }
    setClubLoading(false);
  }, [activeClubId]);

  useEffect(() => {
    if (!activeClubId) {
      setClubLoading(false);
      setClubSettingsError(null);
      return;
    }
    void fetchClubSettings();
  }, [activeClubId, fetchClubSettings]);

  useEffect(() => {
    if (!activeClubId || !perms.isAdmin) return;
    let cancelled = false;
    const loadLlm = async () => {
      setLlmLoading(true);
      try {
        const { data, error } = await supabase
          .from("club_llm_settings")
          .select("provider, model, azure_endpoint, azure_api_version, api_key")
          .eq("club_id", activeClubId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (data) {
          setLlmProvider((data.provider as ClubLlmProvider) || "openai");
          setLlmModel(data.model ?? "");
          setLlmAzureEndpoint(data.azure_endpoint ?? "");
          setLlmAzureApiVersion(data.azure_api_version ?? "2024-02-15-preview");
          setLlmHasSavedKey(Boolean((data.api_key as string)?.trim()));
        } else {
          setLlmHasSavedKey(false);
          setLlmModel("");
          setLlmAzureEndpoint("");
          setLlmAzureApiVersion("2024-02-15-preview");
        }
        setLlmApiKey("");
      } catch {
        if (!cancelled) toast({ title: t.common.error, description: t.settingsPage.llmLoadFailed, variant: "destructive" });
      } finally {
        if (!cancelled) setLlmLoading(false);
      }
    };
    void loadLlm();
    return () => {
      cancelled = true;
    };
  }, [activeClubId, perms.isAdmin, toast, t.common.error, t.settingsPage.llmLoadFailed]);

  const runLlmHealthCheck = useCallback(async () => {
    if (!activeClubId || !perms.isAdmin) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
    const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
    if (
      !supabaseUrl ||
      !publishable ||
      supabaseUrl.includes("placeholder.supabase.co") ||
      publishable === "placeholder-key" ||
      /YOUR_PROJECT/i.test(supabaseUrl)
    ) {
      setLlmHealth("error");
      setLlmHealthDetail(t.settingsPage.llmHealthMissingUrl);
      setLlmHealthSource(null);
      return;
    }
    setLlmHealth("checking");
    setLlmHealthDetail(null);
    setLlmHealthSource(null);

    const withNetworkHint = (msg: string) =>
      /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
        ? `${msg}\n\n${t.settingsPage.llmHealthNetworkHint}`
        : msg;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLlmHealth("error");
        setLlmHealthDetail(t.settingsPage.llmHealthSignIn);
        return;
      }

      const { data, error } = await supabase.functions.invoke("co-trainer", {
        headers: correlationHeaders(),
        body: { mode: "health", club_id: activeClubId },
      });

      if (error) {
        let detail = error.message || "Request failed";
        const ctx = error as { context?: Response };
        if (ctx.context && typeof ctx.context.json === "function") {
          try {
            const j = (await ctx.context.json()) as { error?: string };
            if (typeof j?.error === "string" && j.error.trim()) detail = j.error.trim();
          } catch {
            /* ignore */
          }
        }
        setLlmHealth("error");
        setLlmHealthDetail(withNetworkHint(detail));
        return;
      }

      const payload = (data ?? {}) as {
        ok?: boolean;
        configured?: boolean;
        source?: string;
        error?: string;
      };

      if (payload.configured === false) {
        setLlmHealth("not_configured");
        setLlmHealthDetail(payload.error ?? null);
        return;
      }
      if (payload.ok === true) {
        setLlmHealth("connected");
        setLlmHealthSource(payload.source === "platform" ? "platform" : "club");
        return;
      }
      setLlmHealth("error");
      setLlmHealthDetail(withNetworkHint(payload.error ?? t.settingsPage.llmHealthUnknownError));
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setLlmHealth("error");
      setLlmHealthDetail(withNetworkHint(raw));
    }
  }, [
    activeClubId,
    perms.isAdmin,
    t.settingsPage.llmHealthMissingUrl,
    t.settingsPage.llmHealthNetworkHint,
    t.settingsPage.llmHealthSignIn,
    t.settingsPage.llmHealthUnknownError,
  ]);

  useEffect(() => {
    if (!activeClubId || !perms.isAdmin || llmLoading) return;
    void runLlmHealthCheck();
  }, [activeClubId, perms.isAdmin, llmLoading, runLlmHealthCheck]);

  const saveLlmSettings = async () => {
    if (!activeClubId || llmSaving) return;
    if (!llmApiKey.trim() && !llmHasSavedKey) {
      toast({ title: t.common.error, description: t.settingsPage.llmKeyRequired, variant: "destructive" });
      return;
    }
    setLlmSaving(true);
    try {
      if (llmApiKey.trim()) {
        const { error } = await supabase.from("club_llm_settings").upsert(
          {
            club_id: activeClubId,
            provider: llmProvider,
            api_key: llmApiKey.trim(),
            model: llmModel.trim() || null,
            azure_endpoint: llmProvider === "azure_openai" ? (llmAzureEndpoint.trim() || null) : null,
            azure_api_version: llmProvider === "azure_openai" ? (llmAzureApiVersion.trim() || "2024-02-15-preview") : null,
          },
          { onConflict: "club_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("club_llm_settings")
          .update({
            provider: llmProvider,
            model: llmModel.trim() || null,
            azure_endpoint: llmProvider === "azure_openai" ? (llmAzureEndpoint.trim() || null) : null,
            azure_api_version: llmProvider === "azure_openai" ? (llmAzureApiVersion.trim() || "2024-02-15-preview") : null,
          })
          .eq("club_id", activeClubId);
        if (error) throw error;
      }
      setLlmApiKey("");
      setLlmHasSavedKey(true);
      toast({ title: t.settingsPage.llmSaved });
      void runLlmHealthCheck();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.settingsPage.llmLoadFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setLlmSaving(false);
    }
  };

  const clearLlmSettings = async () => {
    if (!activeClubId) return;
    try {
      const { error } = await supabase.from("club_llm_settings").delete().eq("club_id", activeClubId);
      if (error) throw error;
      setLlmHasSavedKey(false);
      setLlmApiKey("");
      setLlmModel("");
      setLlmAzureEndpoint("");
      toast({ title: t.settingsPage.llmCleared });
      void runLlmHealthCheck();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.settingsPage.llmLoadFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    }
  };

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
      const msg = err instanceof Error ? err.message : t.settingsPage.saveFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
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
      const msg = err instanceof Error ? err.message : t.settingsPage.resetLinkFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
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
      const msg = err instanceof Error ? err.message : t.settingsPage.changeEmailLinkFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
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
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={t.settingsPage.title} subtitle={t.settingsPage.subtitle} />

      {/* Tabs */}
      <div className={DASHBOARD_TABS_ROW}>
        <div className={DASHBOARD_TABS_INNER_SCROLL}>
          {tabs.map((tb) => (
            <button
              type="button"
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === tb.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${DASHBOARD_PAGE_MAX_INNER} max-w-2xl py-4 sm:py-6`}>
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
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t.settingsPage.displayNamePlaceholder} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">{t.settingsPage.avatarPreview}</div>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName || t.settingsPage.avatarAltFallback} className="w-full h-full object-cover" />
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
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder={t.placeholders.urlHttps} />
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

                        {/* Active dashboard role switcher */}
                        <div className="rounded-xl border border-border/60 bg-background/30 p-3 space-y-2">
                          <div className="text-[11px] text-muted-foreground">{t.settingsPage.roleSwitchDashboardTitle}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {activeClubRoleSummary.effectiveRoles.map((role) => {
                              const currentActive = localStorage.getItem("one4team.activeRole") || activeClubRoleSummary.baseRole;
                              const isSelected = currentActive === role;
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => {
                                    void (async () => {
                                      localStorage.setItem("one4team.activeRole", role);
                                      await refetchMemberships();
                                      toast({
                                        title: "Dashboard role switched",
                                        description: `Now viewing as ${formatRoleLabel(role)}.`,
                                      });
                                      navigate(`/dashboard/${role}`);
                                    })();
                                  }}
                                  className={`min-h-11 rounded-xl border px-2.5 py-2 text-center transition-all ${
                                    isSelected
                                      ? "border-primary bg-gradient-gold-static text-primary-foreground shadow-gold"
                                      : "border-border/60 bg-card/30 text-foreground hover:border-primary/30 hover:bg-primary/5"
                                  }`}
                                >
                                  <div className="text-[11px] font-semibold">{formatRoleLabel(role)}</div>
                                  {isSelected && <div className="text-[9px] mt-0.5 opacity-90">{t.common.active}</div>}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Change DB role (admin only) */}
                        {perms.isAdmin && activeClubId && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                            <div className="text-[11px] text-muted-foreground">{t.settingsPage.roleDbChangeTitle}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Select
                                value={activeClubRoleSummary.baseRole}
                                onValueChange={async (newRole) => {
                                  if (!user || !activeClubId) return;
                                  const { error } = await supabase
                                    .from("club_memberships")
                                    .update({ role: newRole, updated_at: new Date().toISOString() } as Record<string, unknown>)
                                    .eq("club_id", activeClubId)
                                    .eq("user_id", user.id);
                                  if (error) {
                                    toast({ title: t.common.error, description: error.message, variant: "destructive" });
                                    return;
                                  }
                                  notifyMembershipsUpdated();
                                  localStorage.setItem("one4team.activeRole", newRole);
                                  toast({ title: "Role updated", description: `Your membership role is now ${formatRoleLabel(newRole)}. Reloading…` });
                                  setTimeout(() => window.location.reload(), 800);
                                }}
                              >
                                <SelectTrigger className="h-9 w-[180px] rounded-xl border-border/60 bg-background/50 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["admin", "trainer", "player", "staff", "member", "parent"].map((r) => (
                                    <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-[10px] text-amber-600">{t.settingsPage.roleDbChangeHint}</span>
                            </div>
                          </div>
                        )}

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

              {clubSettingsError && !clubLoading && perms.isAdmin && activeClubId && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t.common.error}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm">
                      {clubSettingsError}
                      {isTransientSupabaseMessage(clubSettingsError) ? " You can try again in a moment." : ""}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 w-fit border-destructive/40"
                      onClick={() => void fetchClubSettings()}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

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
                        <SelectItem value="en">{t.settingsPage.langEnglish}</SelectItem>
                        <SelectItem value="de">{t.settingsPage.langGerman}</SelectItem>
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

            {perms.isAdmin && activeClubId ? (
              <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-foreground">{t.settingsPage.llmTitle}</h2>
                      <p className="text-[11px] text-muted-foreground">{t.settingsPage.llmDesc}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    {!llmLoading ? (
                      <div
                        className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2 text-left text-xs ${
                          llmHealth === "connected"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                            : llmHealth === "not_configured"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                              : llmHealth === "error"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : llmHealth === "checking"
                                  ? "border-border bg-muted/40 text-muted-foreground"
                                  : "border-border/60 bg-background/50 text-muted-foreground"
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        {llmHealth === "checking" ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>{t.settingsPage.llmHealthChecking}</span>
                          </div>
                        ) : null}
                        {llmHealth === "connected" ? (
                          <div className="flex flex-col gap-1 items-start sm:items-end">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-medium">{t.settingsPage.llmHealthConnected}</span>
                            </div>
                            <span className="text-[10px] opacity-90 pl-6 sm:pl-0 max-w-[260px] sm:text-right">
                              {llmHealthSource === "platform"
                                ? t.settingsPage.llmHealthSubtitlePlatform
                                : t.settingsPage.llmHealthSubtitleClub}
                            </span>
                          </div>
                        ) : null}
                        {llmHealth === "not_configured" ? (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">{t.settingsPage.llmHealthNotConfigured}</div>
                              {llmHealthDetail ? (
                                <div className="text-[10px] opacity-90 mt-0.5 max-w-[240px] sm:max-w-[280px]">
                                  {llmHealthDetail}
                                </div>
                              ) : (
                                <div className="text-[10px] opacity-90 mt-0.5 max-w-[240px] sm:max-w-[280px]">
                                  {t.settingsPage.llmHealthNotConfiguredHint}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                        {llmHealth === "error" ? (
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">{t.settingsPage.llmHealthFailed}</div>
                              {llmHealthDetail ? (
                                <div className="text-[10px] opacity-90 mt-0.5 max-w-[260px] sm:max-w-[300px] break-words">
                                  {llmHealthDetail}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {llmHealth === "idle" ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 opacity-60" />
                            <span>{t.settingsPage.llmHealthIdle}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {!llmLoading ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl"
                        onClick={() => void runLlmHealthCheck()}
                        disabled={llmHealth === "checking"}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${llmHealth === "checking" ? "animate-spin" : ""}`} />
                        {t.settingsPage.llmTestConnection}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {llmLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.llmProvider}</div>
                      <Select value={llmProvider} onValueChange={(v) => setLlmProvider(v as ClubLlmProvider)}>
                        <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">{t.settingsPage.llmProviderOpenai}</SelectItem>
                          <SelectItem value="anthropic">{t.settingsPage.llmProviderAnthropic}</SelectItem>
                          <SelectItem value="google_gemini">{t.settingsPage.llmProviderGemini}</SelectItem>
                          <SelectItem value="azure_openai">{t.settingsPage.llmProviderAzure}</SelectItem>
                          <SelectItem value="github_models">{t.settingsPage.llmProviderGithub}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.llmModel}</div>
                      <Input
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        placeholder="gpt-4o-mini"
                        className="h-10 rounded-xl border-border/60 bg-background/50"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{t.settingsPage.llmModelHint}</p>
                    </div>
                    {llmProvider === "azure_openai" ? (
                      <>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.llmAzureEndpoint}</div>
                          <Input
                            value={llmAzureEndpoint}
                            onChange={(e) => setLlmAzureEndpoint(e.target.value)}
                            placeholder="https://..."
                            className="h-10 rounded-xl border-border/60 bg-background/50"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{t.settingsPage.llmAzureEndpointHint}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.llmAzureApiVersion}</div>
                          <Input
                            value={llmAzureApiVersion}
                            onChange={(e) => setLlmAzureApiVersion(e.target.value)}
                            className="h-10 rounded-xl border-border/60 bg-background/50"
                          />
                        </div>
                      </>
                    ) : null}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.llmApiKey}</div>
                      <Input
                        type="password"
                        autoComplete="off"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder={t.settingsPage.llmApiKeyPlaceholder}
                        className="h-10 rounded-xl border-border/60 bg-background/50"
                      />
                      {llmHasSavedKey ? (
                        <p className="text-[10px] text-muted-foreground mt-1">{t.settingsPage.llmApiKeyKeep}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => void clearLlmSettings()} disabled={!llmHasSavedKey || llmSaving}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t.settingsPage.llmClear}
                      </Button>
                      <Button
                        type="button"
                        className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                        onClick={() => void saveLlmSettings()}
                        disabled={llmSaving}
                      >
                        {llmSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        {t.settingsPage.llmSave}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
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
                    placeholder={t.placeholders.emailExample}
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
