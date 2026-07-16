import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { isPublicProviderListingDiscoverable } from "@/lib/public-provider-profile";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function PublicProviderProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const copy = t.publicProviderPage;
  const [profile, setProfile] = useState<MarketplaceProviderProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("marketplace_provider_profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !isPublicProviderListingDiscoverable(data as MarketplaceProviderProfileRow)) {
        setNotFound(true);
        setProfile(null);
      } else {
        setProfile(data as MarketplaceProviderProfileRow);
        setNotFound(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!profile) return;
    const prevTitle = document.title;
    const title = `${profile.provider_name} · ${copy.metaSuffix}`;
    const description =
      profile.short_description?.trim() ||
      copy.defaultDescription.replace("{name}", profile.provider_name);
    const canonical = `${window.location.origin}/providers/${profile.slug}`;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("name", "robots", "index,follow");
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
    if (profile.logo_url) upsertMeta("property", "og:image", profile.logo_url);
    return () => {
      document.title = prevTitle;
    };
  }, [copy.defaultDescription, copy.metaSuffix, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        {copy.loading}
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <h1 className="text-xl font-display font-semibold">{copy.notFoundTitle}</h1>
        <p className="text-sm text-muted-foreground">{copy.notFoundDesc}</p>
        <Link to="/" className="text-primary text-sm hover:underline">
          {copy.backHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start gap-4">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold text-foreground">{profile.provider_name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {profile.verification_status === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  {copy.verified}
                </span>
              ) : null}
              {profile.is_featured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                  <Star className="w-3 h-3" />
                  {copy.featured}
                </span>
              ) : null}
              {profile.location ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {profile.location}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {profile.short_description ? (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {profile.short_description}
          </p>
        ) : null}

        {profile.categories?.length ? (
          <div className="flex flex-wrap gap-2">
            {profile.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {cat.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">{copy.ctaHint}</p>
      </main>
    </div>
  );
}

export default PublicProviderProfilePage;
