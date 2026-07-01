import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { SupplierPublicPageBody } from "@/components/supplier-page-admin/supplier-public-page-body";

function mapProfile(row: Record<string, unknown>): MarketplaceProviderProfileRow {
  return {
    id: String(row.id),
    owner_user_id: String(row.owner_user_id),
    provider_type: row.provider_type as MarketplaceProviderProfileRow["provider_type"],
    partner_id: row.partner_id ? String(row.partner_id) : null,
    provider_name: String(row.provider_name ?? ""),
    slug: row.slug ? String(row.slug) : null,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    short_description: row.short_description ? String(row.short_description) : null,
    detailed_description: row.detailed_description ? String(row.detailed_description) : null,
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
    location: row.location ? String(row.location) : null,
    service_area_km: typeof row.service_area_km === "number" ? row.service_area_km : null,
    availability_mode: row.availability_mode as MarketplaceProviderProfileRow["availability_mode"],
    contact_person: row.contact_person ? String(row.contact_person) : null,
    contact_email: row.contact_email ? String(row.contact_email) : null,
    phone: row.phone ? String(row.phone) : null,
    website: row.website ? String(row.website) : null,
    packages: Array.isArray(row.packages) ? (row.packages as MarketplaceProviderProfileRow["packages"]) : [],
    price_indication: row.price_indication ? String(row.price_indication) : null,
    availability_notes: row.availability_notes ? String(row.availability_notes) : null,
    references: Array.isArray(row.reference_notes) ? (row.reference_notes as string[]) : [],
    visibility: row.visibility as MarketplaceProviderProfileRow["visibility"],
    listing_status: row.listing_status as MarketplaceProviderProfileRow["listing_status"],
    verification_status: row.verification_status as MarketplaceProviderProfileRow["verification_status"],
    is_featured: Boolean(row.is_featured),
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
    profile_completeness: Number(row.profile_completeness ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export default function PublicSupplierPage() {
  const { supplierSlug } = useParams();
  const [profile, setProfile] = useState<MarketplaceProviderProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!supplierSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("marketplace_provider_profiles")
        .select("*")
        .eq("slug", supplierSlug)
        .eq("listing_status", "active")
        .eq("visibility", "public")
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setProfile(null);
      } else {
        setProfile(mapProfile(data as Record<string, unknown>));
        setNotFound(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Store className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Supplier page not found</h1>
        <Link to="/" className="text-primary hover:underline text-sm">
          Back to ONE4Team
        </Link>
      </div>
    );
  }

  return <SupplierPublicPageBody profile={profile} />;
}
