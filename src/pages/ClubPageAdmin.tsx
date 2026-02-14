import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, ExternalLink, Globe, Palette, MapPin, Share2, Search as SearchIcon,
  Save, Eye, EyeOff, Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClub } from "@/hooks/use-active-club";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

interface ClubFormData {
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
  logo_url: string;
  primary_color: string;
  cover_image_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY_FORM: ClubFormData = {
  name: "", slug: "", description: "", is_public: true,
  logo_url: "", primary_color: "#C4A052", cover_image_url: "",
  address: "", phone: "", email: "", website: "",
  facebook_url: "", instagram_url: "", twitter_url: "",
  meta_title: "", meta_description: "",
};

export default function ClubPageAdmin() {
  const { activeClub, activeClubId, loading: clubLoading } = useActiveClub();
  const perms = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClubFormData>(EMPTY_FORM);

  const fetchClubData = useCallback(async () => {
    if (!activeClubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", activeClubId)
        .single();

      if (error) throw error;
      if (data) {
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: (data as Record<string, unknown>).description as string || "",
          is_public: (data as Record<string, unknown>).is_public !== false,
          logo_url: (data as Record<string, unknown>).logo_url as string || "",
          primary_color: (data as Record<string, unknown>).primary_color as string || "#C4A052",
          cover_image_url: (data as Record<string, unknown>).cover_image_url as string || "",
          address: (data as Record<string, unknown>).address as string || "",
          phone: (data as Record<string, unknown>).phone as string || "",
          email: (data as Record<string, unknown>).email as string || "",
          website: (data as Record<string, unknown>).website as string || "",
          facebook_url: (data as Record<string, unknown>).facebook_url as string || "",
          instagram_url: (data as Record<string, unknown>).instagram_url as string || "",
          twitter_url: (data as Record<string, unknown>).twitter_url as string || "",
          meta_title: (data as Record<string, unknown>).meta_title as string || "",
          meta_description: (data as Record<string, unknown>).meta_description as string || "",
        });
      }
    } catch {
      // Club might have limited columns; use name/slug from activeClub
      if (activeClub) {
        setForm((prev) => ({
          ...prev,
          name: activeClub.name,
          slug: activeClub.slug,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [activeClubId, activeClub]);

  useEffect(() => {
    void fetchClubData();
  }, [fetchClubData]);

  const updateField = (key: keyof ClubFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveChanges = async () => {
    if (!activeClubId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clubs")
        .update({
          name: form.name,
          slug: form.slug,
        } as Record<string, unknown>)
        .eq("id", activeClubId);

      if (error) throw error;
      toast({ title: t.clubPageAdmin.saved });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const SectionCard = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
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

  const FieldRow = ({ label, value, onChange, placeholder, type = "text", readOnly = false, helper }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string;
    type?: string; readOnly?: boolean; helper?: string;
  }) => (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} className={readOnly ? "opacity-60" : ""} />
      {helper && <div className="text-[10px] text-muted-foreground mt-1">{helper}</div>}
    </div>
  );

  if (clubLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!activeClubId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title={t.clubPageAdmin.title} subtitle={t.clubPageAdmin.subtitle} />
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
      <AppHeader
        title={t.clubPageAdmin.title}
        subtitle={t.clubPageAdmin.subtitle}
        rightSlot={
          <div className="flex items-center gap-2">
            {form.slug && (
              <Button
                variant="outline" size="sm"
                onClick={() => window.open(`/club/${form.slug}`, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> {t.clubPageAdmin.preview}
              </Button>
            )}
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

      {/* Preview banner */}
      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <ExternalLink className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground">{t.clubPageAdmin.preview}</div>
              <div className="text-[11px] text-muted-foreground">{t.clubPageAdmin.previewDesc}</div>
            </div>
            {form.slug && (
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => window.open(`/club/${form.slug}`, "_blank")}>
                /club/{form.slug} <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* General Info */}
        <SectionCard icon={Globe} title={t.clubPageAdmin.generalInfo}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.clubName} value={form.name} onChange={(v) => updateField("name", v)} placeholder="e.g. TSV Allach 09" />
            <FieldRow label={t.clubPageAdmin.slug} value={form.slug} onChange={(v) => updateField("slug", v)} placeholder="e.g. tsv-allach-09" helper={t.clubPageAdmin.slugHelper} />
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.description}</div>
              <textarea
                className="w-full min-h-[80px] rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm resize-y"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Tell visitors about your club..."
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

        {/* Branding */}
        <SectionCard icon={Palette} title={t.clubPageAdmin.branding}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.logoUrl} value={form.logo_url} onChange={(v) => updateField("logo_url", v)} placeholder="https://..." />
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.primaryColor}</div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={(e) => updateField("primary_color", e.target.value)} className="w-10 h-10 rounded-xl border border-border/60 cursor-pointer" />
                <Input value={form.primary_color} onChange={(e) => updateField("primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <FieldRow label={t.clubPageAdmin.coverImageUrl} value={form.cover_image_url} onChange={(v) => updateField("cover_image_url", v)} placeholder="https://..." />
          </div>
        </SectionCard>

        {/* Contact Details */}
        <SectionCard icon={MapPin} title={t.clubPageAdmin.contactDetails}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldRow label={t.clubPageAdmin.address} value={form.address} onChange={(v) => updateField("address", v)} placeholder="Street, City, ZIP" />
            </div>
            <FieldRow label={t.clubPageAdmin.phone} value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="+49 ..." />
            <FieldRow label={t.clubPageAdmin.email} value={form.email} onChange={(v) => updateField("email", v)} placeholder="info@club.de" />
            <div className="sm:col-span-2">
              <FieldRow label={t.clubPageAdmin.website} value={form.website} onChange={(v) => updateField("website", v)} placeholder="https://www.club.de" />
            </div>
          </div>
        </SectionCard>

        {/* Social Links */}
        <SectionCard icon={Share2} title={t.clubPageAdmin.socialLinks}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.facebook} value={form.facebook_url} onChange={(v) => updateField("facebook_url", v)} placeholder="https://facebook.com/..." />
            <FieldRow label={t.clubPageAdmin.instagram} value={form.instagram_url} onChange={(v) => updateField("instagram_url", v)} placeholder="https://instagram.com/..." />
            <FieldRow label={t.clubPageAdmin.twitter} value={form.twitter_url} onChange={(v) => updateField("twitter_url", v)} placeholder="https://x.com/..." />
          </div>
        </SectionCard>

        {/* SEO */}
        <SectionCard icon={SearchIcon} title={t.clubPageAdmin.seo}>
          <div className="grid gap-3">
            <FieldRow label={t.clubPageAdmin.metaTitle} value={form.meta_title} onChange={(v) => updateField("meta_title", v)} placeholder="Club Name - Your Tagline" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t.clubPageAdmin.metaDescription}</div>
              <textarea
                className="w-full min-h-[60px] rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm resize-y"
                value={form.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                placeholder="A brief description for search engines..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Save */}
        <div className="flex justify-end pb-8">
          <Button
            className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 px-8"
            onClick={saveChanges}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? t.clubPageAdmin.saving : t.clubPageAdmin.saveChanges}
          </Button>
        </div>
      </div>
    </div>
  );
}
