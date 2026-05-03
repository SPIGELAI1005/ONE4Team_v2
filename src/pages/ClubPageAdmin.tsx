import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  ExternalLink,
  Globe,
  Palette,
  MapPin,
  Share2,
  Search as SearchIcon,
  Save,
  Eye,
  EyeOff,
  Image as ImageIcon,
  UploadCloud,
  Users,
  List,
  Rocket,
  LayoutGrid,
  Shield,
  UserPlus,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useAuth } from "@/contexts/useAuth";
import {
  PUBLIC_PAGE_SECTION_KEYS,
  type PublicPageSectionId,
  type PublicPageSectionsState,
} from "@/lib/club-public-page-sections";
import {
  editorFormToPublicPageConfig,
  emptyClubPublicPageEditorForm,
  getClubPageDraftConfig,
  getPublishedBaselineConfig,
  publicPageConfigToEditorForm,
  publishClubPageConfig,
  saveClubPageDraftConfig,
  stableConfigFingerprint,
  unpublishClubPublicWebsite,
  type ClubPublicPageConfig,
  type ClubPublicPageEditorFormLike,
} from "@/lib/club-public-page-config";
import { DEFAULT_CLUB_HERO_ASSETS } from "@/lib/club-hero-default-assets";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  HOMEPAGE_MODULE_IDS,
  PUBLIC_MICRO_PAGE_ORDER,
  brandingContrastWarnings,
  isPrimaryForegroundContrastLow,
  type HomepageModuleId,
  type PublicMicroPageId,
} from "@/lib/club-page-settings-helpers";
import { ClubPageAdminLivePublicPreview } from "@/components/club-page-admin/club-page-admin-live-public-preview";
import type { PrivacyPack } from "@/lib/club-page-settings-helpers";

type ClubFormData = ClubPublicPageEditorFormLike;

const CLUB_ASSETS_BUCKET = "images-clubs";

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

interface FieldRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  helper?: string;
  required?: boolean;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <h2 className="font-display font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder, type = "text", helper, required }: FieldRowProps) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">
        <span>{label}</span>
        {required ? (
          <span className="ml-0.5 font-semibold text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </div>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required}
      />
      {helper ? <div className="mt-1 text-[10px] text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-11 cursor-pointer rounded-xl border border-border/60 bg-transparent"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

const microPageLabelKeys: Record<PublicMicroPageId, string> = {
  home: "tabMicroHome",
  news: "tabMicroNews",
  teams: "tabMicroTeams",
  schedule: "tabMicroSchedule",
  matches: "tabMicroMatches",
  events: "tabMicroEvents",
  documents: "tabMicroDocuments",
  join: "tabMicroJoin",
  contact: "tabMicroContact",
};

const homepageModuleLabelKeys: Record<HomepageModuleId, string> = {
  stats: "homeModStats",
  next_up: "homeModNextUp",
  latest_news: "homeModNews",
  featured_teams: "homeModTeams",
  upcoming_events: "homeModEvents",
  matches_preview: "homeModMatches",
  sponsors: "homeModSponsors",
  join_cta: "homeModJoin",
  gallery: "homeModGallery",
};

const privacyLabelKeys: (keyof PrivacyPack)[] = [
  "show_member_count_on_public_home",
  "show_coach_names_public",
  "show_coach_contact_public",
  "show_training_locations_public",
  "show_team_training_times_public",
  "show_match_results_public",
  "show_player_stats_public",
  "show_player_names_public",
  "show_documents_public",
  "show_contact_persons_public",
  "allow_join_requests_public",
];

export default function ClubPageAdmin() {
  const { activeClub, activeClubId, loading: clubLoading } = useActiveClub();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [livePublishedSlug, setLivePublishedSlug] = useState("");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishVersion, setPublishVersion] = useState(0);
  const [publishedBaselineFingerprint, setPublishedBaselineFingerprint] = useState("");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [form, setForm] = useState<ClubFormData>(emptyClubPublicPageEditorForm());
  const [referenceDraft, setReferenceDraft] = useState("");
  const [storageDiag, setStorageDiag] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string }>({
    status: "idle",
    message: "",
  });
  const [storageDiagLastCheckedAt, setStorageDiagLastCheckedAt] = useState<Date | null>(null);
  const [clubRowKeys, setClubRowKeys] = useState<Set<string>>(new Set());
  const [configSaveBaseline, setConfigSaveBaseline] = useState<ClubPublicPageConfig | null>(null);
  const [teamsForHome, setTeamsForHome] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState("basics");

  const fetchClubData = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (!activeClubId) return false;
      const silent = options?.silent === true;
      if (!silent) setLoading(true);
      try {
        const { data, error } = await supabase.from("clubs").select("*").eq("id", activeClubId).single();
        if (error) throw error;
        if (data) {
          const record = data as Record<string, unknown>;
          setClubRowKeys(new Set(Object.keys(record)));
          setLivePublishedSlug(String(record.slug ?? ""));
          setPublishedAt((record.public_page_published_at as string | null) ?? null);
          setPublishVersion(Number(record.public_page_publish_version ?? 0) || 0);
          const baseline = getPublishedBaselineConfig(record);
          setPublishedBaselineFingerprint(stableConfigFingerprint(baseline));
          const [{ data: draftCfg }, { data: draftRow }] = await Promise.all([
            getClubPageDraftConfig(supabase, activeClubId),
            supabase.from("club_public_page_drafts").select("updated_at").eq("club_id", activeClubId).maybeSingle(),
          ]);
          setDraftUpdatedAt((draftRow as { updated_at?: string } | null)?.updated_at ?? null);
          const effective = draftCfg ?? baseline;
          setConfigSaveBaseline(effective);
          setForm({
            ...emptyClubPublicPageEditorForm(),
            ...publicPageConfigToEditorForm(effective),
          });
        }
        return true;
      } catch (err: unknown) {
        setClubRowKeys(new Set());
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : t.clubPageAdmin.fetchClubFailedGeneric;
        toast({
          title: t.common.error,
          description: silent ? t.clubPageAdmin.reloadFailedAfterSave : message,
          variant: "destructive",
        });
        if (activeClub) {
          setForm((previous) => ({ ...previous, name: activeClub.name, slug: activeClub.slug }));
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeClub, activeClubId, t.clubPageAdmin.fetchClubFailedGeneric, t.clubPageAdmin.reloadFailedAfterSave, t.common.error, toast]
  );

  useEffect(() => {
    void fetchClubData();
  }, [fetchClubData]);

  useEffect(() => {
    if (!activeClubId) return;
    void supabase
      .from("teams")
      .select("id, name")
      .eq("club_id", activeClubId)
      .order("name")
      .then(({ data }) => setTeamsForHome((data as { id: string; name: string }[]) ?? []));
  }, [activeClubId]);

  const runStorageDiagnostics = useCallback(async () => {
    if (!activeClubId) return;
    setStorageDiag({ status: "checking", message: t.clubPageAdmin.storageDiagChecking });
    const probePath = `${activeClubId}/diagnostics/${Date.now()}-probe.txt`;
    try {
      const { error: listError } = await supabase.storage.from(CLUB_ASSETS_BUCKET).list(activeClubId, { limit: 1 });
      if (listError) throw listError;
      const payload = new Blob([`probe:${new Date().toISOString()}`], { type: "text/plain" });
      const { error: uploadError } = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(probePath, payload, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: removeError } = await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([probePath]);
      if (removeError) throw removeError;
      setStorageDiag({ status: "ok", message: t.clubPageAdmin.storageDiagOk });
      setStorageDiagLastCheckedAt(new Date());
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown error";
      setStorageDiag({
        status: "error",
        message: `${t.clubPageAdmin.storageDiagErrorPrefix}: ${details}`,
      });
      setStorageDiagLastCheckedAt(new Date());
    }
  }, [activeClubId, t.clubPageAdmin.storageDiagChecking, t.clubPageAdmin.storageDiagErrorPrefix, t.clubPageAdmin.storageDiagOk]);

  useEffect(() => {
    if (!activeClubId) return;
    void runStorageDiagnostics();
  }, [activeClubId, runStorageDiagnostics]);

  const updateField = <K extends keyof ClubFormData>(key: K, value: ClubFormData[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const updateMicroPage = useCallback((id: PublicMicroPageId, patch: Partial<ClubFormData["microPages"][PublicMicroPageId]>) => {
    setForm((prev) => ({
      ...prev,
      microPages: { ...prev.microPages, [id]: { ...prev.microPages[id], ...patch } },
    }));
  }, []);

  const updateHomeModule = useCallback((id: HomepageModuleId, patch: Partial<ClubFormData["homepageModuleDefs"][HomepageModuleId]>) => {
    setForm((prev) => ({
      ...prev,
      homepageModuleDefs: { ...prev.homepageModuleDefs, [id]: { ...prev.homepageModuleDefs[id], ...patch } },
    }));
  }, []);

  const updatePrivacy = useCallback(<K extends keyof PrivacyPack>(key: K, value: boolean) => {
    setForm((prev) => ({ ...prev, privacy: { ...prev.privacy, [key]: value } }));
  }, []);

  const toggleFeaturedTeam = useCallback((teamId: string) => {
    setForm((prev) => {
      const cur = prev.featured_team_ids.filter(Boolean);
      if (cur.includes(teamId)) return { ...prev, featured_team_ids: cur.filter((id) => id !== teamId) };
      if (cur.length >= 12) return prev;
      return { ...prev, featured_team_ids: [...cur, teamId] };
    });
  }, []);

  const referenceList = useMemo(() => form.reference_images.filter((image) => image.trim().length > 0), [form.reference_images]);

  const publicSectionLabels = useMemo(
    () =>
      ({
        about: t.clubPageAdmin.sectionAbout,
        news: t.clubPageAdmin.sectionNews,
        teams: t.clubPageAdmin.sectionTeams,
        shop: t.clubPageAdmin.sectionShop,
        media: t.clubPageAdmin.sectionMedia,
        schedule: t.clubPageAdmin.sectionSchedule,
        events: t.clubPageAdmin.sectionEvents,
        matches: t.clubPageAdmin.sectionMatches,
        messages: t.clubPageAdmin.sectionMessages,
        one4ai: t.clubPageAdmin.sectionOne4ai,
        documents: t.clubPageAdmin.sectionDocuments,
        faq: t.clubPageAdmin.sectionFaq,
        nextsteps: t.clubPageAdmin.sectionNextSteps,
        reports: t.clubPageAdmin.sectionReports,
        livescores: t.clubPageAdmin.sectionLiveScores,
        contact: t.clubPageAdmin.sectionContact,
      }) satisfies Record<PublicPageSectionId, string>,
    [t.clubPageAdmin]
  );

  const uploadAsset = async (file: File, folder: string) => {
    if (!activeClubId) return null;
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const filePath = `${activeClubId}/${folder}/${Date.now()}-${cleanName}`;
    const { error } = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpload = async (
    file: File,
    key: "logo_url" | "favicon_url" | "cover_image_url" | "hero_image_url" | "reference_images" | "seo_og_image_url"
  ) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const url = await uploadAsset(file, key);
      if (!url) return;
      if (key === "reference_images") {
        const nextImages = [url, ...referenceList].slice(0, 8);
        updateField("reference_images", nextImages);
      } else {
        updateField(key, url);
      }
      toast({ title: t.clubPageAdmin.uploadSuccess });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({
        title: t.clubPageAdmin.uploadFailed,
        description: message.includes("Bucket not found") ? t.clubPageAdmin.uploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setUploadingKey(null);
    }
  };

  const addReferenceImage = () => {
    const url = referenceDraft.trim();
    if (!url) return;
    if (referenceList.includes(url)) return;
    updateField("reference_images", [url, ...referenceList].slice(0, 8));
    setReferenceDraft("");
  };

  const removeReferenceImage = (url: string) => updateField("reference_images", referenceList.filter((item) => item !== url));

  const buildDraftPayload = useCallback(() => {
    return editorFormToPublicPageConfig({ ...form, reference_images: referenceList }, configSaveBaseline);
  }, [configSaveBaseline, form, referenceList]);

  const saveChanges = async () => {
    if (!activeClubId || saving) return;
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: t.common.error, description: t.clubPageAdmin.fillRequiredNameSlug, variant: "destructive" });
      return;
    }
    if (clubRowKeys.has("address") && !form.address.trim()) {
      toast({ title: t.common.error, description: t.clubPageAdmin.fillRequiredAddress, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const draftPayload = buildDraftPayload();
      const { error } = await saveClubPageDraftConfig(supabase, activeClubId, draftPayload, user?.id ?? null);
      if (error) throw error;
      const { data: dr } = await supabase.from("club_public_page_drafts").select("updated_at").eq("club_id", activeClubId).maybeSingle();
      setDraftUpdatedAt((dr as { updated_at?: string } | null)?.updated_at ?? new Date().toISOString());
      toast({ title: t.clubPageAdmin.draftSavedTitle, description: t.clubPageAdmin.draftSavedDesc });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : t.clubPageAdmin.saveFailedGeneric;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const publishChanges = async () => {
    if (!activeClubId || publishing) return;
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: t.common.error, description: t.clubPageAdmin.fillRequiredNameSlug, variant: "destructive" });
      return;
    }
    if (clubRowKeys.has("address") && !form.address.trim()) {
      toast({ title: t.common.error, description: t.clubPageAdmin.fillRequiredAddress, variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      const draftPayload = buildDraftPayload();
      const saveDraft = await saveClubPageDraftConfig(supabase, activeClubId, draftPayload, user?.id ?? null);
      if (saveDraft.error) throw saveDraft.error;
      const { error } = await publishClubPageConfig(supabase, activeClubId);
      if (error) throw error;
      toast({ title: t.clubPageAdmin.publishSuccessTitle, description: t.clubPageAdmin.publishSuccessDesc });
      await fetchClubData({ silent: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : t.clubPageAdmin.publishFailedGeneric;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const unpublishWebsite = async () => {
    if (!activeClubId || unpublishing) return;
    setUnpublishing(true);
    try {
      const { error } = await unpublishClubPublicWebsite(supabase, activeClubId);
      if (error) throw error;
      toast({ title: t.clubPageAdmin.unpublishSuccessTitle, description: t.clubPageAdmin.unpublishSuccessDesc });
      await fetchClubData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setUnpublishing(false);
    }
  };

  const currentDraftFingerprint = useMemo(() => stableConfigFingerprint(buildDraftPayload()), [buildDraftPayload]);
  const hasUnpublishedChanges = publishedBaselineFingerprint !== "" && currentDraftFingerprint !== publishedBaselineFingerprint;

  const contrastNotes = useMemo(
    () => brandingContrastWarnings(form.primary_color, form.secondary_color, form.tertiary_color, form.foreground_color),
    [form.foreground_color, form.primary_color, form.secondary_color, form.tertiary_color]
  );

  const primaryForegroundContrastLow = useMemo(
    () => isPrimaryForegroundContrastLow(form.primary_color, form.foreground_color),
    [form.foreground_color, form.primary_color]
  );

  const privacySensitiveWarnings = useMemo(() => {
    const p = form.privacy;
    const w: string[] = [];
    if (p.show_player_names_public) w.push(t.clubPageAdmin.privacyWarnPlayerNames);
    if (p.show_player_stats_public) w.push(t.clubPageAdmin.privacyWarnPlayerStats);
    if (p.show_coach_contact_public) w.push(t.clubPageAdmin.privacyWarnCoachContact);
    if (p.show_match_results_public) w.push(t.clubPageAdmin.privacyWarnMatchResults);
    return w;
  }, [form.privacy, t.clubPageAdmin]);

  if (clubLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeaderSlot title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!activeClubId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeaderSlot title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
        <div className="py-20 text-center">
          <Globe className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 font-display text-xl font-bold text-foreground">{t.clubPageAdmin.noClub}</h2>
          <p className="text-muted-foreground">{t.clubPageAdmin.noClubDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeaderSlot
        title={t.clubPageAdmin.title}
        subtitle={t.clubPageAdmin.subtitle}
        toolbarRevision={`${livePublishedSlug || form.slug}-${saving}-${publishing}-${publishVersion}`}
        rightSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {livePublishedSlug || form.slug ? (
              <>
                <Button variant="outline" size="sm" onClick={() => window.open(`/club/${livePublishedSlug || form.slug}`, "_blank")}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> {t.clubPageAdmin.viewLivePage}
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`/club/${livePublishedSlug || form.slug}?draft=1`, "_blank")}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> {t.clubPageAdmin.previewDraft}
                </Button>
              </>
            ) : null}
            <Button size="sm" variant="secondary" onClick={saveChanges} disabled={saving || publishing}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {saving ? t.clubPageAdmin.saving : t.clubPageAdmin.saveChanges}
            </Button>
            <Button
              size="sm"
              className="bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110"
              onClick={() => void publishChanges()}
              disabled={saving || publishing}
            >
              {publishing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
              {publishing ? t.clubPageAdmin.publishing : t.clubPageAdmin.publishChanges}
            </Button>
          </div>
        }
      />

      <div className="border-b border-border/60">
        <div className="container mx-auto space-y-2 px-4 py-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-2.5 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{t.clubPageAdmin.publishStatusLabel}</span>
              <Badge variant={form.is_public ? "default" : "destructive"}>
                {form.is_public ? t.clubPageAdmin.badgeSiteLive : t.clubPageAdmin.badgeSiteHidden}
              </Badge>
              <Badge variant={publishedAt ? "secondary" : "outline"}>
                {publishedAt
                  ? `${t.clubPageAdmin.badgeSnapshotPublished} v${publishVersion}`
                  : t.clubPageAdmin.badgeSnapshotNever}
              </Badge>
              <Badge variant={hasUnpublishedChanges ? "outline" : "secondary"} className={hasUnpublishedChanges ? "border-amber-500/60 text-amber-800 dark:text-amber-200" : ""}>
                {hasUnpublishedChanges ? t.clubPageAdmin.badgeDraftPending : t.clubPageAdmin.badgeDraftSynced}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
              {publishedAt ? (
                <span>
                  {t.clubPageAdmin.publishedVersionLabel} {publishVersion} · {new Date(publishedAt).toLocaleString()}
                </span>
              ) : (
                <span>{t.clubPageAdmin.legacyLiveHint}</span>
              )}
              <span>·</span>
              {draftUpdatedAt ? (
                <span>
                  {t.clubPageAdmin.draftUpdatedLabel} {new Date(draftUpdatedAt).toLocaleString()}
                </span>
              ) : (
                <span>{t.clubPageAdmin.draftNeverSaved}</span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium">{t.clubPageAdmin.storageDiagLabel}</span>
            <span className={storageDiag.status === "ok" ? "text-emerald-500" : storageDiag.status === "error" ? "text-accent" : ""}>
              {storageDiag.message || t.clubPageAdmin.storageDiagChecking}
            </span>
            {storageDiagLastCheckedAt ? (
              <span>
                · {t.clubPageAdmin.storageDiagLastChecked}{" "}
                {storageDiagLastCheckedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void runStorageDiagnostics()}
              className="underline decoration-dotted transition-colors hover:text-foreground"
              disabled={storageDiag.status === "checking"}
            >
              {t.clubPageAdmin.storageDiagRecheck}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {clubRowKeys.size > 0 && !clubRowKeys.has("address") ? (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="mb-1 font-semibold text-amber-950 dark:text-amber-100">{t.clubPageAdmin.schemaProfileColumnsMissingTitle}</div>
            <p className="text-[13px] leading-snug text-amber-950/90 dark:text-amber-50/90">{t.clubPageAdmin.schemaProfileColumnsMissingDesc}</p>
          </div>
        ) : null}

        <ClubPageAdminLivePublicPreview form={form} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex h-auto min-h-11 w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="basics" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabBasics}
            </TabsTrigger>
            <TabsTrigger value="branding" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabBranding}
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabAssets}
            </TabsTrigger>
            <TabsTrigger value="pages" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabPages}
            </TabsTrigger>
            <TabsTrigger value="homepage" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabHomepage}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabPrivacy}
            </TabsTrigger>
            <TabsTrigger value="join" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabJoin}
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabContactSocial}
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabSeo}
            </TabsTrigger>
            <TabsTrigger value="publish" className="text-xs sm:text-sm">
              {t.clubPageAdmin.tabPublish}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <SectionCard icon={Globe} title={t.clubPageAdmin.tabBasics}>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {clubRowKeys.has("address") ? t.clubPageAdmin.requiredFieldsLegend : t.clubPageAdmin.requiredFieldsLegendCore}
              </p>
              <div className="grid gap-3">
                <FieldRow required label={t.clubPageAdmin.clubName} value={form.name} onChange={(v) => updateField("name", v)} placeholder={t.clubPageAdmin.clubNamePlaceholder} />
                <FieldRow required label={t.clubPageAdmin.slug} value={form.slug} onChange={(v) => updateField("slug", v)} placeholder="my-club" helper={t.clubPageAdmin.slugHelper} />
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.description}</div>
                  <textarea
                    className="min-h-[90px] w-full resize-y rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={t.clubPageAdmin.descriptionPlaceholder}
                  />
                </div>
                <FieldRow label={t.clubPageAdmin.clubCategoryLabel} value={form.club_category} onChange={(v) => updateField("club_category", v)} placeholder={t.clubPageAdmin.clubCategoryPlaceholder} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow label={t.clubPageAdmin.defaultLanguageLabel} value={form.default_language} onChange={(v) => updateField("default_language", v)} placeholder="en" />
                  <FieldRow label={t.clubPageAdmin.timezoneLabel} value={form.timezone} onChange={(v) => updateField("timezone", v)} placeholder="Europe/Berlin" />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("is_public", !form.is_public)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${form.is_public ? "bg-primary" : "bg-muted"}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_public ? "translate-x-5" : ""}`}
                    />
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {form.is_public ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {t.clubPageAdmin.publicVisible}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t.clubPageAdmin.publicVisibleDesc}</div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <SectionCard icon={Palette} title={t.clubPageAdmin.tabBranding}>
              <div className="grid gap-4 md:grid-cols-2">
                <ColorField label={t.clubPageAdmin.primaryColor} value={form.primary_color} onChange={(v) => updateField("primary_color", v)} />
                <ColorField label={t.clubPageAdmin.secondaryColor} value={form.secondary_color} onChange={(v) => updateField("secondary_color", v)} />
                <ColorField label={t.clubPageAdmin.tertiaryColor} value={form.tertiary_color} onChange={(v) => updateField("tertiary_color", v)} />
                <ColorField label={t.clubPageAdmin.supportColor} value={form.support_color} onChange={(v) => updateField("support_color", v)} />
                <ColorField label={t.clubPageAdmin.foregroundColorLabel} value={form.foreground_color} onChange={(v) => updateField("foreground_color", v)} />
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.themePreferenceLabel}</div>
                  <Select value={form.theme_preference} onValueChange={(v) => updateField("theme_preference", v as ClubFormData["theme_preference"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">{t.clubPageAdmin.themeSystem}</SelectItem>
                      <SelectItem value="light">{t.clubPageAdmin.themeLight}</SelectItem>
                      <SelectItem value="dark">{t.clubPageAdmin.themeDark}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {contrastNotes.length > 0 || primaryForegroundContrastLow ? (
                <Alert variant="destructive" className="mt-4 border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-50">
                  <AlertTitle>{t.clubPageAdmin.contrastWarningTitle}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-inside list-disc text-sm">
                      {contrastNotes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                      {primaryForegroundContrastLow ? <li key="primary-fg">{t.clubPageAdmin.lowContrastPrimaryForeground}</li> : null}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
            </SectionCard>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <SectionCard icon={ImageIcon} title={t.clubPageAdmin.tabAssets}>
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldRow label={t.clubPageAdmin.logoUrl} value={form.logo_url} onChange={(v) => updateField("logo_url", v)} />
                    <Label className="mt-1 block text-[10px] text-muted-foreground">{t.clubPageAdmin.altTextLogo}</Label>
                    <Input className="mt-1" value={form.logo_alt} onChange={(e) => updateField("logo_alt", e.target.value)} />
                    <label className="mt-2 inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void handleUpload(file, "logo_url");
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                        {uploadingKey === "logo_url" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                        {t.clubPageAdmin.uploadLogo}
                      </span>
                    </label>
                  </div>
                  <div>
                    <FieldRow label={t.clubPageAdmin.faviconUrl} value={form.favicon_url} onChange={(v) => updateField("favicon_url", v)} />
                    <Label className="mt-1 block text-[10px] text-muted-foreground">{t.clubPageAdmin.altTextFavicon}</Label>
                    <Input className="mt-1" value={form.favicon_alt} onChange={(e) => updateField("favicon_alt", e.target.value)} />
                    <label className="mt-2 inline-flex">
                      <input
                        type="file"
                        accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void handleUpload(file, "favicon_url");
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                        {uploadingKey === "favicon_url" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                        {t.clubPageAdmin.uploadFavicon}
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <FieldRow label={t.clubPageAdmin.coverImageUrl} value={form.cover_image_url} onChange={(v) => updateField("cover_image_url", v)} />
                  <Label className="mt-1 block text-[10px] text-muted-foreground">{t.clubPageAdmin.altTextCover}</Label>
                  <Input className="mt-1" value={form.cover_alt} onChange={(e) => updateField("cover_alt", e.target.value)} />
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <FieldRow label={t.clubPageAdmin.coverPositionLabel} value={form.cover_object_position} onChange={(v) => updateField("cover_object_position", v)} placeholder="center" />
                    <FieldRow label={t.clubPageAdmin.defaultAssetLabel} value={form.default_generated_asset} onChange={(v) => updateField("default_generated_asset", v)} placeholder="cover" />
                  </div>
                  <label className="mt-2 inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUpload(file, "cover_image_url");
                        event.currentTarget.value = "";
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                      {uploadingKey === "cover_image_url" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                      {t.clubPageAdmin.uploadCover}
                    </span>
                  </label>
                </div>
                <div>
                  <FieldRow label={t.clubPageAdmin.heroImageUrlLabel} value={form.hero_image_url} onChange={(v) => updateField("hero_image_url", v)} />
                  <Label className="mt-1 block text-[10px] text-muted-foreground">{t.clubPageAdmin.altTextHero}</Label>
                  <Input className="mt-1" value={form.hero_alt} onChange={(e) => updateField("hero_alt", e.target.value)} />
                  <FieldRow label={t.clubPageAdmin.heroPositionLabel} value={form.hero_object_position} onChange={(v) => updateField("hero_object_position", v)} placeholder="center" />
                  <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-medium text-foreground">{t.clubPageAdmin.heroClubColorOverlayLabel}</Label>
                      <Switch checked={form.hero_club_color_overlay} onCheckedChange={(c) => updateField("hero_club_color_overlay", Boolean(c))} />
                    </div>
                    <div className={form.hero_club_color_overlay ? "space-y-2" : "pointer-events-none space-y-2 opacity-50"}>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t.clubPageAdmin.heroTintStrengthLabel}</span>
                        <span className="tabular-nums text-foreground">{Math.round(form.hero_tint_strength * 100)}%</span>
                      </div>
                      <Slider
                        value={[form.hero_tint_strength]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={(v) => updateField("hero_tint_strength", Math.min(1, Math.max(0, v[0] ?? 0.45)))}
                      />
                    </div>
                  </div>
                  <label className="mt-2 inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUpload(file, "hero_image_url");
                        event.currentTarget.value = "";
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                      {uploadingKey === "hero_image_url" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                      {t.clubPageAdmin.uploadHero}
                    </span>
                  </label>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    <div className="mb-1.5 font-medium text-foreground">{t.clubPageAdmin.heroImageGuidanceTitle}</div>
                    <ul className="list-inside list-disc space-y-0.5">
                      <li>{t.clubPageAdmin.heroImageGuidanceRatio}</li>
                      <li>{t.clubPageAdmin.heroImageGuidanceMinSize}</li>
                      <li>{t.clubPageAdmin.heroImageGuidanceNoText}</li>
                      <li>{t.clubPageAdmin.heroImageGuidanceFaces}</li>
                      <li>{t.clubPageAdmin.heroImageGuidanceNeutral}</li>
                    </ul>
                  </div>
                  <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-3">
                    <div className="mb-1 text-xs font-medium text-foreground">{t.clubPageAdmin.defaultHeroStyleLabel}</div>
                    <p className="mb-2 text-[10px] text-muted-foreground">{t.clubPageAdmin.defaultHeroStyleDesc}</p>
                    <Select value={form.default_hero_asset_id} onValueChange={(v) => updateField("default_hero_asset_id", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CLUB_HERO_ASSETS.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.referenceImages}</div>
                  <div className="flex gap-2">
                    <Input value={referenceDraft} onChange={(event) => setReferenceDraft(event.target.value)} placeholder="https://..." />
                    <Button type="button" variant="outline" onClick={addReferenceImage}>
                      {t.clubPageAdmin.addReferenceImage}
                    </Button>
                  </div>
                  <label className="mt-2 inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUpload(file, "reference_images");
                        event.currentTarget.value = "";
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                      {uploadingKey === "reference_images" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                      {t.clubPageAdmin.uploadReferenceImage}
                    </span>
                  </label>
                  {referenceList.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {referenceList.map((url) => (
                        <div key={url} className="rounded-xl border border-border/60 bg-background/50 p-2">
                          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="truncate text-[10px] text-muted-foreground">{url}</div>
                            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => removeReferenceImage(url)}>
                              {t.common.remove}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <SectionCard icon={LayoutGrid} title={t.clubPageAdmin.tabPages}>
              <p className="mb-4 text-[11px] text-muted-foreground">{t.clubPageAdmin.pagesNavIntro}</p>
              <div className="space-y-3">
                {PUBLIC_MICRO_PAGE_ORDER.map((id) => {
                  const mp = form.microPages[id];
                  return (
                    <div key={id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                      <div className="mb-2 font-medium text-foreground">{t.clubPageAdmin[microPageLabelKeys[id] as keyof typeof t.clubPageAdmin]}</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{t.clubPageAdmin.pageEnabled}</span>
                          <Switch checked={mp.enabled} disabled={id === "home"} onCheckedChange={(c) => updateMicroPage(id, { enabled: Boolean(c) })} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{t.clubPageAdmin.pageInNav}</span>
                          <Switch checked={mp.showInNav} onCheckedChange={(c) => updateMicroPage(id, { showInNav: Boolean(c) })} />
                        </div>
                        <FieldRow label={t.clubPageAdmin.pageSort} value={String(mp.sortOrder)} onChange={(v) => updateMicroPage(id, { sortOrder: Number(v) || 0 })} type="number" />
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.pageVisibility}</div>
                          <Select value={mp.visibility} onValueChange={(v) => updateMicroPage(id, { visibility: v as "public" | "members_only" })}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">{t.clubPageAdmin.visibilityPublic}</SelectItem>
                              <SelectItem value="members_only">{t.clubPageAdmin.visibilityMembers}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4">
                          <FieldRow label={t.clubPageAdmin.pageCustomLabel} value={mp.label} onChange={(v) => updateMicroPage(id, { label: v })} placeholder={t.clubPageAdmin.pageCustomLabelHint} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-xs font-semibold text-foreground">{t.clubPageAdmin.otherSectionsTitle}</p>
              <p className="mb-3 text-[11px] text-muted-foreground">{t.clubPageAdmin.otherSectionsDesc}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PUBLIC_PAGE_SECTION_KEYS.filter((k) => !["news", "teams", "schedule", "events", "matches", "documents", "nextsteps", "contact"].includes(k)).map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                    <span className="pr-2 text-sm text-foreground">{publicSectionLabels[key]}</span>
                    <Switch
                      disabled={!clubRowKeys.has("public_page_sections")}
                      checked={form.publicPageSections[key]}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          publicPageSections: { ...prev.publicPageSections, [key]: Boolean(checked) },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="homepage" className="space-y-6">
            <SectionCard icon={Megaphone} title={t.clubPageAdmin.tabHomepage}>
              <p className="mb-4 text-[11px] text-muted-foreground">{t.clubPageAdmin.homepageModulesIntro}</p>
              <div className="space-y-4">
                {HOMEPAGE_MODULE_IDS.map((id) => {
                  const m = form.homepageModuleDefs[id];
                  return (
                    <div key={id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                      <div className="mb-2 font-medium">{t.clubPageAdmin[homepageModuleLabelKeys[id] as keyof typeof t.clubPageAdmin]}</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{t.clubPageAdmin.homeModShow}</span>
                          <Switch checked={m.visible} onCheckedChange={(c) => updateHomeModule(id, { visible: Boolean(c) })} />
                        </div>
                        <FieldRow label={t.clubPageAdmin.homeModOrder} value={String(m.order)} onChange={(v) => updateHomeModule(id, { order: Number(v) || 0 })} type="number" />
                        <FieldRow label={t.clubPageAdmin.homeModMax} value={String(m.maxItems)} onChange={(v) => updateHomeModule(id, { maxItems: Math.min(48, Math.max(1, Number(v) || 1)) })} type="number" />
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.homeModSource}</div>
                          <Select value={m.source} onValueChange={(v) => updateHomeModule(id, { source: v as "auto" | "manual" })}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">{t.clubPageAdmin.homeModSourceAuto}</SelectItem>
                              <SelectItem value="manual">{t.clubPageAdmin.homeModSourceManual}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div>
                  <div className="mb-2 text-xs text-muted-foreground">{t.clubPageAdmin.publicHomeFeaturedTeams}</div>
                  {teamsForHome.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t.clubPageAdmin.noTeamsForFeaturedHint}</p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/30 p-2">
                      {teamsForHome.map((team) => (
                        <label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40">
                          <Checkbox checked={form.featured_team_ids.includes(team.id)} onCheckedChange={() => toggleFeaturedTeam(team.id)} />
                          <span className="truncate">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                  <div>
                    <div className="text-sm text-foreground">{t.clubPageAdmin.publicHomeShowPartners}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{t.clubPageAdmin.publicHomeShowPartnersDesc}</div>
                  </div>
                  <Switch checked={form.homepage_show_partners} onCheckedChange={(c) => updateField("homepage_show_partners", Boolean(c))} />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <SectionCard icon={Shield} title={t.clubPageAdmin.tabPrivacy}>
              <p className="mb-4 text-[11px] text-muted-foreground">{t.clubPageAdmin.privacyIntro}</p>
              <Alert className="mb-4 border-border/60 bg-muted/30">
                <AlertTitle className="text-sm">{t.clubPageAdmin.privacyHardRulesTitle}</AlertTitle>
                <AlertDescription className="text-[11px] leading-relaxed text-muted-foreground">
                  {t.clubPageAdmin.privacyHardRulesBody}
                </AlertDescription>
              </Alert>
              <p className="mb-3 text-[11px] text-muted-foreground">{t.clubPageAdmin.privacyJoinApprovalHint}</p>
              {privacySensitiveWarnings.length > 0 ? (
                <Alert variant="destructive" className="mb-4 border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-50">
                  <AlertTitle className="text-sm">{t.clubPageAdmin.privacySensitiveBannerTitle}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-inside list-disc text-[11px]">
                      {privacySensitiveWarnings.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-3">
                {privacyLabelKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                    <span className="text-sm text-foreground">{t.clubPageAdmin[`privacy_${key}` as keyof typeof t.clubPageAdmin]}</span>
                    <Switch checked={form.privacy[key]} onCheckedChange={(c) => updatePrivacy(key, Boolean(c))} />
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3 rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground">{t.clubPageAdmin.privacyYouthSectionTitle}</div>
                <p className="text-[11px] text-muted-foreground">{t.clubPageAdmin.privacyYouthSectionDesc}</p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                  <span className="text-sm text-foreground">{t.clubPageAdmin.privacy_youth_protection_mode}</span>
                  <Switch
                    checked={form.privacy.youth_protection_mode}
                    onCheckedChange={(c) => updatePrivacy("youth_protection_mode", Boolean(c))}
                  />
                </div>
                {form.privacy.youth_protection_mode ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                    <span className="text-sm text-foreground">{t.clubPageAdmin.privacy_youth_allow_coach_phone_public}</span>
                    <Switch
                      checked={form.privacy.youth_allow_coach_phone_public}
                      onCheckedChange={(c) => updatePrivacy("youth_allow_coach_phone_public", Boolean(c))}
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="join" className="space-y-6">
            <SectionCard icon={UserPlus} title={t.clubPageAdmin.tabJoin}>
              <div className="grid gap-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.joinApprovalMode}</div>
                  <Select value={form.join_approval_mode} onValueChange={(value) => updateField("join_approval_mode", value as "manual" | "auto")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t.clubPageAdmin.joinApprovalManual}</SelectItem>
                      <SelectItem value="auto">{t.clubPageAdmin.joinApprovalAuto}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.clubPageAdmin.joinApprovalModeDesc}</div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                  <div>
                    <div className="text-sm text-foreground">{t.clubPageAdmin.joinAutoInvitedOnlyLabel}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{t.clubPageAdmin.joinAutoInvitedOnlyDesc}</div>
                  </div>
                  <Switch checked={form.join_auto_approve_invited_only} onCheckedChange={(c) => updateField("join_auto_approve_invited_only", Boolean(c))} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.joinReviewerPolicy}</div>
                  <Select value={form.join_reviewer_policy} onValueChange={(value) => updateField("join_reviewer_policy", value as "admin_only" | "admin_trainer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_only">{t.clubPageAdmin.joinReviewerAdminOnly}</SelectItem>
                      <SelectItem value="admin_trainer">{t.clubPageAdmin.joinReviewerAdminTrainer}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.clubPageAdmin.joinReviewerPolicyDesc}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.defaultRoleForNewMembers}</div>
                    <Select value={form.join_default_role} onValueChange={(value) => updateField("join_default_role", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">{t.onboarding.member}</SelectItem>
                        <SelectItem value="player">{t.onboarding.player}</SelectItem>
                        <SelectItem value="trainer">{t.onboarding.trainer}</SelectItem>
                        <SelectItem value="staff">{t.onboarding.teamStaff}</SelectItem>
                        <SelectItem value="parent">{t.onboarding.parentSupporter}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldRow label={t.clubPageAdmin.defaultTeamForNewMembers} value={form.join_default_team} onChange={(v) => updateField("join_default_team", v)} placeholder="U16" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.joinNotifyEmailsLabel}</div>
                  <textarea
                    className="min-h-[72px] w-full rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                    value={form.join_notify_emails}
                    onChange={(e) => updateField("join_notify_emails", e.target.value)}
                    placeholder={t.clubPageAdmin.joinNotifyEmailsPlaceholder}
                  />
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.clubPageAdmin.joinNotifyEmailsHint}</div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <SectionCard icon={MapPin} title={t.clubPageAdmin.contactDetails}>
              {clubRowKeys.has("address") ? <p className="mb-3 text-[11px] text-muted-foreground">{t.clubPageAdmin.contactRequiredHint}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldRow required={clubRowKeys.has("address")} label={t.clubPageAdmin.address} value={form.address} onChange={(v) => updateField("address", v)} />
                </div>
                <FieldRow label={t.clubPageAdmin.phone} value={form.phone} onChange={(v) => updateField("phone", v)} />
                <FieldRow label={t.clubPageAdmin.email} value={form.email} onChange={(v) => updateField("email", v)} />
                <div className="sm:col-span-2">
                  <FieldRow label={t.clubPageAdmin.website} value={form.website} onChange={(v) => updateField("website", v)} />
                </div>
                <FieldRow label={t.clubPageAdmin.mapLatLabel} value={form.contact_latitude} onChange={(v) => updateField("contact_latitude", v)} placeholder="52.52" />
                <FieldRow label={t.clubPageAdmin.mapLngLabel} value={form.contact_longitude} onChange={(v) => updateField("contact_longitude", v)} placeholder="13.405" />
                <div className="sm:col-span-2">
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.publicLocationNotesLabel}</div>
                  <textarea
                    className="min-h-[72px] w-full rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                    value={form.public_location_notes}
                    onChange={(e) => updateField("public_location_notes", e.target.value)}
                    placeholder={t.clubPageAdmin.publicLocationNotesPlaceholder}
                  />
                </div>
              </div>
            </SectionCard>
            <SectionCard icon={Share2} title={t.clubPageAdmin.socialLinks}>
              <div className="grid gap-3">
                <FieldRow label={t.clubPageAdmin.facebook} value={form.facebook_url} onChange={(v) => updateField("facebook_url", v)} />
                <FieldRow label={t.clubPageAdmin.instagram} value={form.instagram_url} onChange={(v) => updateField("instagram_url", v)} />
                <FieldRow label={t.clubPageAdmin.twitter} value={form.twitter_url} onChange={(v) => updateField("twitter_url", v)} />
                <FieldRow label={t.clubPageAdmin.youtubeLabel} value={form.youtube_url} onChange={(v) => updateField("youtube_url", v)} />
                <FieldRow label={t.clubPageAdmin.tiktokLabel} value={form.tiktok_url} onChange={(v) => updateField("tiktok_url", v)} />
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <SectionCard icon={SearchIcon} title={t.clubPageAdmin.tabSeo}>
              <div className="grid gap-3">
                <FieldRow label={t.clubPageAdmin.metaTitle} value={form.meta_title} onChange={(v) => updateField("meta_title", v)} />
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{t.clubPageAdmin.metaDescription}</div>
                  <textarea
                    className="min-h-[60px] w-full rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                    value={form.meta_description}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    placeholder={t.clubPageAdmin.metaDescriptionPlaceholder}
                  />
                </div>
                <FieldRow label={t.clubPageAdmin.newsPageSubtitleLabel} value={form.news_page_subtitle} onChange={(v) => updateField("news_page_subtitle", v)} />
                <FieldRow label={t.clubPageAdmin.ogImageLabel} value={form.seo_og_image_url} onChange={(v) => updateField("seo_og_image_url", v)} />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void handleUpload(file, "seo_og_image_url");
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                    {uploadingKey === "seo_og_image_url" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
                    {t.clubPageAdmin.uploadOgImage}
                  </span>
                </label>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                  <span className="text-sm">{t.clubPageAdmin.seoAllowIndexing}</span>
                  <Switch checked={form.seo_allow_indexing} onCheckedChange={(c) => updateField("seo_allow_indexing", Boolean(c))} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                  <span className="text-sm">{t.clubPageAdmin.seoStructuredData}</span>
                  <Switch checked={form.seo_structured_data_enabled} onCheckedChange={(c) => updateField("seo_structured_data_enabled", Boolean(c))} />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="publish" className="space-y-6">
            <SectionCard icon={List} title={t.clubPageAdmin.tabPublish}>
              <p className="mb-4 text-sm text-muted-foreground">{t.clubPageAdmin.publishTabIntro}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/30 p-4 text-sm">
                  <div className="text-xs text-muted-foreground">{t.clubPageAdmin.draftUpdatedLabel}</div>
                  <div className="font-medium">{draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString() : t.clubPageAdmin.draftNeverSaved}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/30 p-4 text-sm">
                  <div className="text-xs text-muted-foreground">{t.clubPageAdmin.lastPublishedLabel}</div>
                  <div className="font-medium">{publishedAt ? new Date(publishedAt).toLocaleString() : t.clubPageAdmin.neverPublished}</div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={saveChanges} disabled={saving || publishing}>
                  {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  {saving ? t.clubPageAdmin.saving : t.clubPageAdmin.saveChanges}
                </Button>
                <Button className="bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110" onClick={() => void publishChanges()} disabled={saving || publishing}>
                  {publishing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
                  {publishing ? t.clubPageAdmin.publishing : t.clubPageAdmin.publishChanges}
                </Button>
                <Button variant="outline" onClick={() => window.open(`/club/${livePublishedSlug || form.slug}?draft=1`, "_blank")}>
                  <ExternalLink className="mr-1 h-4 w-4" /> {t.clubPageAdmin.previewDraft}
                </Button>
                <Button variant="outline" onClick={() => window.open(`/club/${livePublishedSlug || form.slug}`, "_blank")}>
                  <ExternalLink className="mr-1 h-4 w-4" /> {t.clubPageAdmin.viewLivePage}
                </Button>
                <Button variant="destructive" onClick={() => void unpublishWebsite()} disabled={unpublishing}>
                  {unpublishing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <EyeOff className="mr-1 h-4 w-4" />}
                  {t.clubPageAdmin.unpublishWebsite}
                </Button>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
