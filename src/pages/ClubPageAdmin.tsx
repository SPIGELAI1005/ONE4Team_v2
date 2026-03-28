import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink, Globe, Palette, MapPin, Share2, Search as SearchIcon, Save, Eye, EyeOff, Image as ImageIcon, UploadCloud, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const CLUB_ASSETS_BUCKET = "images-clubs";

interface ClubFormData {
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
  logo_url: string;
  favicon_url: string;
  cover_image_url: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  support_color: string;
  reference_images: string[];
  address: string;
  phone: string;
  email: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  meta_title: string;
  meta_description: string;
  join_approval_mode: "manual" | "auto";
  join_reviewer_policy: "admin_only" | "admin_trainer";
  join_default_role: string;
  join_default_team: string;
}

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
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const EMPTY_FORM: ClubFormData = {
  name: "",
  slug: "",
  description: "",
  is_public: true,
  logo_url: "",
  favicon_url: "",
  cover_image_url: "",
  primary_color: "#C4A052",
  secondary_color: "#1E293B",
  tertiary_color: "#0F172A",
  support_color: "#22C55E",
  reference_images: [],
  address: "",
  phone: "",
  email: "",
  website: "",
  facebook_url: "",
  instagram_url: "",
  twitter_url: "",
  meta_title: "",
  meta_description: "",
  join_approval_mode: "manual",
  join_reviewer_policy: "admin_only",
  join_default_role: "member",
  join_default_team: "",
};

function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <h2 className="font-display font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder, type = "text", helper }: FieldRowProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {helper ? <div className="text-[10px] text-muted-foreground mt-1">{helper}</div> : null}
    </div>
  );
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-11 h-10 rounded-xl border border-border/60 cursor-pointer bg-transparent"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

export default function ClubPageAdmin() {
  const { activeClub, activeClubId, loading: clubLoading } = useActiveClub();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [form, setForm] = useState<ClubFormData>(EMPTY_FORM);
  const [referenceDraft, setReferenceDraft] = useState("");
  const [clubColumns, setClubColumns] = useState<Set<string>>(new Set());
  const [storageDiag, setStorageDiag] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string }>({
    status: "idle",
    message: "",
  });
  const [storageDiagLastCheckedAt, setStorageDiagLastCheckedAt] = useState<Date | null>(null);

  const fetchClubData = useCallback(async () => {
    if (!activeClubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("clubs").select("*").eq("id", activeClubId).single();
      if (error) throw error;
      if (data) {
        const record = data as Record<string, unknown>;
        setClubColumns(new Set(Object.keys(record)));
        const referenceImages = Array.isArray(record.reference_images)
          ? record.reference_images.map((item) => String(item)).filter(Boolean)
          : [];
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: (record.description as string) || "",
          is_public: record.is_public !== false,
          logo_url: (record.logo_url as string) || "",
          favicon_url: (record.favicon_url as string) || "",
          cover_image_url: (record.cover_image_url as string) || "",
          primary_color: (record.primary_color as string) || "#C4A052",
          secondary_color: (record.secondary_color as string) || "#1E293B",
          tertiary_color: (record.tertiary_color as string) || "#0F172A",
          support_color: (record.support_color as string) || "#22C55E",
          reference_images: referenceImages,
          address: (record.address as string) || "",
          phone: (record.phone as string) || "",
          email: (record.email as string) || "",
          website: (record.website as string) || "",
          facebook_url: (record.facebook_url as string) || "",
          instagram_url: (record.instagram_url as string) || "",
          twitter_url: (record.twitter_url as string) || "",
          meta_title: (record.meta_title as string) || "",
          meta_description: (record.meta_description as string) || "",
          join_approval_mode: (record.join_approval_mode as "manual" | "auto") || "manual",
          join_reviewer_policy: (record.join_reviewer_policy as "admin_only" | "admin_trainer") || "admin_only",
          join_default_role: (record.join_default_role as string) || "member",
          join_default_team: (record.join_default_team as string) || "",
        });
      }
    } catch {
      if (activeClub) {
        setForm((previous) => ({ ...previous, name: activeClub.name, slug: activeClub.slug }));
      }
    } finally {
      setLoading(false);
    }
  }, [activeClub, activeClubId]);

  useEffect(() => {
    void fetchClubData();
  }, [fetchClubData]);

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

  const updateField = (key: keyof ClubFormData, value: string | boolean | string[]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const referenceList = useMemo(
    () => form.reference_images.filter((image) => image.trim().length > 0),
    [form.reference_images]
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

  const handleUpload = async (file: File, key: "logo_url" | "favicon_url" | "cover_image_url" | "reference_images") => {
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
        description: message.includes("Bucket not found")
          ? t.clubPageAdmin.uploadBucketHint
          : message,
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

  const removeReferenceImage = (url: string) =>
    updateField("reference_images", referenceList.filter((item) => item !== url));

  const saveChanges = async () => {
    if (!activeClubId || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        is_public: form.is_public,
        logo_url: form.logo_url.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        primary_color: form.primary_color.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        twitter_url: form.twitter_url.trim() || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      };

      // Only send newer columns if the current DB actually exposes them.
      if (clubColumns.has("favicon_url")) payload.favicon_url = form.favicon_url.trim() || null;
      if (clubColumns.has("secondary_color")) payload.secondary_color = form.secondary_color.trim() || null;
      if (clubColumns.has("tertiary_color")) payload.tertiary_color = form.tertiary_color.trim() || null;
      if (clubColumns.has("support_color")) payload.support_color = form.support_color.trim() || null;
      if (clubColumns.has("reference_images")) payload.reference_images = referenceList;
      if (clubColumns.has("join_approval_mode")) payload.join_approval_mode = form.join_approval_mode;
      if (clubColumns.has("join_reviewer_policy")) payload.join_reviewer_policy = form.join_reviewer_policy;
      if (clubColumns.has("join_default_role")) payload.join_default_role = form.join_default_role || "member";
      if (clubColumns.has("join_default_team")) payload.join_default_team = form.join_default_team.trim() || null;

      const { error } = await supabase.from("clubs").update(payload).eq("id", activeClubId);
      if (error) throw error;
      toast({ title: t.clubPageAdmin.saved });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : t.clubPageAdmin.saveFailedGeneric;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (clubLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeaderSlot title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!activeClubId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeaderSlot title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.clubPageAdmin.noClub}</h2>
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
        toolbarRevision={`${form.slug}-${saving}`}
        rightSlot={
          <div className="flex items-center gap-2">
            {form.slug ? (
              <Button variant="outline" size="sm" onClick={() => window.open(`/club/${form.slug}?preview=1`, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> {t.clubPageAdmin.preview}
              </Button>
            ) : null}
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={saveChanges}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {saving ? t.clubPageAdmin.saving : t.clubPageAdmin.saveChanges}
            </Button>
          </div>
        }
      />

      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <ExternalLink className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground">{t.clubPageAdmin.preview}</div>
              <div className="text-[11px] text-muted-foreground">{t.clubPageAdmin.previewDesc}</div>
            </div>
            {form.slug ? (
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => window.open(`/club/${form.slug}?preview=1`, "_blank")}>
                /club/{form.slug} <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="font-medium">{t.clubPageAdmin.storageDiagLabel}</span>
            <span className={
              storageDiag.status === "ok"
                ? "text-emerald-500"
                : storageDiag.status === "error"
                  ? "text-accent"
                  : ""
            }>
              {storageDiag.message || t.clubPageAdmin.storageDiagChecking}
            </span>
            {storageDiagLastCheckedAt ? (
              <span>
                · {t.clubPageAdmin.storageDiagLastChecked}{" "}
                {storageDiagLastCheckedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void runStorageDiagnostics()}
              className="underline decoration-dotted hover:text-foreground transition-colors"
              disabled={storageDiag.status === "checking"}
            >
              {t.clubPageAdmin.storageDiagRecheck}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <SectionCard icon={ImageIcon} title={t.clubPageAdmin.liveBrandPreview}>
          <div
            className="rounded-2xl border border-border/60 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${form.tertiary_color} 0%, ${form.secondary_color} 40%, ${form.primary_color} 100%)`,
            }}
          >
            <div className="p-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 overflow-hidden flex items-center justify-center">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-white/80" />}
                </div>
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight">{form.name || t.clubPageAdmin.clubNamePlaceholder}</div>
                  <div className="text-xs text-white/80">{form.slug ? `/club/${form.slug}` : "/club/your-club"}</div>
                </div>
              </div>
              <div className="mt-4 max-w-xl text-sm text-white/85">{form.description || t.clubPageAdmin.descriptionPlaceholder}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Globe} title={t.clubPageAdmin.generalInfo}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.clubName} value={form.name} onChange={(value) => updateField("name", value)} placeholder={t.clubPageAdmin.clubNamePlaceholder} />
            <FieldRow label={t.clubPageAdmin.slug} value={form.slug} onChange={(value) => updateField("slug", value)} placeholder="tsv-allach-09" helper={t.clubPageAdmin.slugHelper} />
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.description}</div>
              <textarea
                className="w-full min-h-[90px] rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm resize-y"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder={t.clubPageAdmin.descriptionPlaceholder}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateField("is_public", !form.is_public)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.is_public ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_public ? "translate-x-5" : ""}`} />
              </button>
              <div>
                <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {form.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {t.clubPageAdmin.publicVisible}
                </div>
                <div className="text-[11px] text-muted-foreground">{t.clubPageAdmin.publicVisibleDesc}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Palette} title={t.clubPageAdmin.branding}>
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-3">
              <ColorField label={t.clubPageAdmin.primaryColor} value={form.primary_color} onChange={(value) => updateField("primary_color", value)} />
              <ColorField label={t.clubPageAdmin.secondaryColor} value={form.secondary_color} onChange={(value) => updateField("secondary_color", value)} />
              <ColorField label={t.clubPageAdmin.tertiaryColor} value={form.tertiary_color} onChange={(value) => updateField("tertiary_color", value)} />
              <ColorField label={t.clubPageAdmin.supportColor} value={form.support_color} onChange={(value) => updateField("support_color", value)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title={t.clubPageAdmin.visualAssets}>
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <FieldRow label={t.clubPageAdmin.logoUrl} value={form.logo_url} onChange={(value) => updateField("logo_url", value)} placeholder="https://..." />
                <label className="mt-2 inline-flex">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleUpload(file, "logo_url");
                    event.currentTarget.value = "";
                  }} />
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                    {uploadingKey === "logo_url" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1" />}
                    {t.clubPageAdmin.uploadLogo}
                  </span>
                </label>
              </div>
              <div>
                <FieldRow label={t.clubPageAdmin.faviconUrl} value={form.favicon_url} onChange={(value) => updateField("favicon_url", value)} placeholder="https://..." />
                <label className="mt-2 inline-flex">
                  <input type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" className="hidden" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleUpload(file, "favicon_url");
                    event.currentTarget.value = "";
                  }} />
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                    {uploadingKey === "favicon_url" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1" />}
                    {t.clubPageAdmin.uploadFavicon}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <FieldRow label={t.clubPageAdmin.coverImageUrl} value={form.cover_image_url} onChange={(value) => updateField("cover_image_url", value)} placeholder="https://..." />
              <label className="mt-2 inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleUpload(file, "cover_image_url");
                  event.currentTarget.value = "";
                }} />
                <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  {uploadingKey === "cover_image_url" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1" />}
                  {t.clubPageAdmin.uploadCover}
                </span>
              </label>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.referenceImages}</div>
              <div className="flex gap-2">
                <Input value={referenceDraft} onChange={(event) => setReferenceDraft(event.target.value)} placeholder="https://..." />
                <Button type="button" variant="outline" onClick={addReferenceImage}>{t.clubPageAdmin.addReferenceImage}</Button>
              </div>
              <label className="mt-2 inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleUpload(file, "reference_images");
                  event.currentTarget.value = "";
                }} />
                <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  {uploadingKey === "reference_images" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1" />}
                  {t.clubPageAdmin.uploadReferenceImage}
                </span>
              </label>
              {referenceList.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                  {referenceList.map((url) => (
                    <div key={url} className="rounded-xl border border-border/60 bg-background/50 p-2">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="text-[10px] text-muted-foreground truncate">{url}</div>
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

        <SectionCard icon={MapPin} title={t.clubPageAdmin.contactDetails}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldRow label={t.clubPageAdmin.address} value={form.address} onChange={(value) => updateField("address", value)} placeholder="Street, City, ZIP" />
            </div>
            <FieldRow label={t.clubPageAdmin.phone} value={form.phone} onChange={(value) => updateField("phone", value)} placeholder="+49 ..." />
            <FieldRow label={t.clubPageAdmin.email} value={form.email} onChange={(value) => updateField("email", value)} placeholder="info@club.de" />
            <div className="sm:col-span-2">
              <FieldRow label={t.clubPageAdmin.website} value={form.website} onChange={(value) => updateField("website", value)} placeholder="https://www.club.de" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Users} title={t.clubPageAdmin.memberOnboarding}>
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.joinApprovalMode}</div>
              <Select
                value={form.join_approval_mode}
                onValueChange={(value) => updateField("join_approval_mode", value as "manual" | "auto")}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t.clubPageAdmin.joinApprovalManual}</SelectItem>
                  <SelectItem value="auto">{t.clubPageAdmin.joinApprovalAuto}</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[10px] text-muted-foreground mt-1">{t.clubPageAdmin.joinApprovalModeDesc}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.joinReviewerPolicy}</div>
              <Select
                value={form.join_reviewer_policy}
                onValueChange={(value) => updateField("join_reviewer_policy", value as "admin_only" | "admin_trainer")}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">{t.clubPageAdmin.joinReviewerAdminOnly}</SelectItem>
                  <SelectItem value="admin_trainer">{t.clubPageAdmin.joinReviewerAdminTrainer}</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[10px] text-muted-foreground mt-1">{t.clubPageAdmin.joinReviewerPolicyDesc}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.defaultRoleForNewMembers}</div>
                <Select value={form.join_default_role} onValueChange={(value) => updateField("join_default_role", value)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
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
              <FieldRow
                label={t.clubPageAdmin.defaultTeamForNewMembers}
                value={form.join_default_team}
                onChange={(value) => updateField("join_default_team", value)}
                placeholder="U16 / Senior"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Share2} title={t.clubPageAdmin.socialLinks}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.facebook} value={form.facebook_url} onChange={(value) => updateField("facebook_url", value)} placeholder="https://facebook.com/..." />
            <FieldRow label={t.clubPageAdmin.instagram} value={form.instagram_url} onChange={(value) => updateField("instagram_url", value)} placeholder="https://instagram.com/..." />
            <FieldRow label={t.clubPageAdmin.twitter} value={form.twitter_url} onChange={(value) => updateField("twitter_url", value)} placeholder="https://x.com/..." />
          </div>
        </SectionCard>

        <SectionCard icon={SearchIcon} title={t.clubPageAdmin.seo}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.metaTitle} value={form.meta_title} onChange={(value) => updateField("meta_title", value)} placeholder="Club Name - Your Tagline" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.metaDescription}</div>
              <textarea
                className="w-full min-h-[60px] rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm resize-y"
                value={form.meta_description}
                onChange={(event) => updateField("meta_description", event.target.value)}
                placeholder={t.clubPageAdmin.metaDescriptionPlaceholder}
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end pb-8">
          <Button className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 px-8" onClick={saveChanges} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? t.clubPageAdmin.saving : t.clubPageAdmin.saveChanges}
          </Button>
        </div>
      </div>
    </div>
  );
}
