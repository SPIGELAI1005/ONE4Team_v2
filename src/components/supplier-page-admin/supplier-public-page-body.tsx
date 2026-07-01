import { ExternalLink, FileText, Globe, Mail, MapPin, Package, Phone, Store } from "lucide-react";

import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";

import logo from "@/assets/one4team-logo.png";

import { useLanguage } from "@/hooks/use-language";



export interface SupplierPublicPageBodyProps {

  profile: MarketplaceProviderProfileRow;

  categoryLabel?: (key: string) => string;

  compact?: boolean;

  pageLabel?: string;

}



/** Public supplier page body - used on `/supplier/:slug` and the admin live preview. */

export function SupplierPublicPageBody({

  profile,

  categoryLabel: categoryLabelProp,

  compact = false,

  pageLabel: pageLabelProp,
}: SupplierPublicPageBodyProps) {

  const { t } = useLanguage();

  const sp = t.supplierPortal.publicPage;

  const mp = t.marketplacePage;

  const categoryLabel =

    categoryLabelProp ?? ((key: string) => (mp.categories as Record<string, string>)[key] ?? key.replace(/_/g, " "));

  const pageLabel = pageLabelProp ?? t.supplierPortal.publicPageBadge;



  const maxW = compact ? "max-w-full" : "max-w-4xl";

  const headerPad = compact ? "px-3 py-2" : "px-4 py-4";

  const mainPad = compact ? "px-3 py-4" : "px-4 py-8";



  const servicePackages = profile.packages.filter((p) => p.kind !== "document");

  const documentPackages = profile.packages.filter((p) => p.kind === "document" && p.url);



  const serviceAreaLabel = (() => {

    if (profile.availability_mode === "remote") return mp.provider.listing.availabilityModes.remote;

    if (profile.availability_mode === "local") {

      return profile.service_area_km

        ? `${mp.provider.listing.availabilityModes.local} · ${profile.service_area_km} km`

        : mp.provider.listing.availabilityModes.local;

    }

    if (profile.availability_mode === "hybrid") {

      return profile.service_area_km

        ? `${mp.provider.listing.availabilityModes.hybrid} · ${profile.service_area_km} km`

        : mp.provider.listing.availabilityModes.hybrid;

    }

    if (profile.service_area_km) return `${profile.service_area_km} km`;

    return null;

  })();



  return (

    <div className="min-h-full bg-background">

      <header className="border-b border-border/60 bg-card/40">

        <div className={`${maxW} mx-auto ${headerPad} flex items-center justify-between gap-4`}>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">

            <img src={logo} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />

            <span className={compact ? "text-xs" : ""}>ONE4Team</span>

          </div>

          <span className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{pageLabel}</span>

        </div>

      </header>



      {profile.cover_image_url ? (

        <div

          className={compact ? "h-24 bg-cover bg-center sm:h-28" : "h-40 bg-cover bg-center sm:h-52"}

          style={{ backgroundImage: `url(${profile.cover_image_url})` }}

        />

      ) : (

        <div className={compact ? "h-20 bg-gradient-to-r from-primary/20 to-primary/5" : "h-32 bg-gradient-to-r from-primary/20 to-primary/5"} />

      )}



      <main className={`${maxW} mx-auto ${mainPad} space-y-4 sm:space-y-6`}>

        <div className="flex items-start gap-3 sm:gap-4">

          {profile.logo_url ? (

            <img

              src={profile.logo_url}

              alt=""

              className={

                compact

                  ? "h-12 w-12 rounded-xl border border-border/60 object-cover sm:h-14 sm:w-14"

                  : "h-16 w-16 rounded-2xl border border-border/60 object-cover"

              }

            />

          ) : (

            <div

              className={

                compact

                  ? "flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-14 sm:w-14"

                  : "flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"

              }

            >

              <Store className={compact ? "h-5 w-5 text-primary" : "h-7 w-7 text-primary"} />

            </div>

          )}

          <div className="min-w-0">

            <h1

              className={

                compact

                  ? "truncate font-display text-lg font-bold text-foreground sm:text-xl"

                  : "text-2xl font-display font-bold text-foreground"

              }

            >

              {profile.provider_name || "-"}

            </h1>

            {profile.short_description ? (

              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{profile.short_description}</p>

            ) : null}

            {profile.price_indication ? (

              <p className="mt-1 text-xs font-medium text-primary sm:text-sm">{profile.price_indication}</p>

            ) : null}

          </div>

        </div>



        {profile.detailed_description ? (

          <section className="rounded-2xl border border-border/60 bg-card/40 p-4 prose prose-sm dark:prose-invert max-w-none sm:p-5">

            <p className="whitespace-pre-wrap text-sm text-foreground/90">{profile.detailed_description}</p>

          </section>

        ) : null}



        {serviceAreaLabel || profile.availability_notes ? (

          <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">

            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">

              {sp.availability}

            </h2>

            {serviceAreaLabel ? <p className="text-sm text-foreground">{serviceAreaLabel}</p> : null}

            {profile.availability_notes ? (

              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{profile.availability_notes}</p>

            ) : null}

          </section>

        ) : null}



        {servicePackages.length > 0 ? (

          <section>

            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">

              {sp.packages}

            </h2>

            <div className="grid gap-2 sm:grid-cols-2">

              {servicePackages.map((pkg) => (

                <div key={pkg.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">

                  <div className="flex items-start gap-2">

                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                    <div className="min-w-0">

                      <div className="font-medium text-foreground">{pkg.name}</div>

                      {pkg.description ? (

                        <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>

                      ) : null}

                      {pkg.priceIndication ? (

                        <p className="mt-1 text-xs font-medium text-primary">{pkg.priceIndication}</p>

                      ) : null}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

        ) : null}



        <section className="grid gap-2 text-xs sm:grid-cols-2 sm:gap-3 sm:text-sm">

          {profile.location ? (

            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">

              <MapPin className="h-4 w-4 shrink-0 text-primary" />

              <span className="truncate">{profile.location}</span>

            </div>

          ) : null}

          {profile.contact_person ? (

            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">

              <span className="truncate font-medium">{profile.contact_person}</span>

            </div>

          ) : null}

          {profile.contact_email ? (

            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">

              <Mail className="h-4 w-4 shrink-0 text-primary" />

              <a href={`mailto:${profile.contact_email}`} className="truncate hover:underline">

                {profile.contact_email}

              </a>

            </div>

          ) : null}

          {profile.phone ? (

            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">

              <Phone className="h-4 w-4 shrink-0 text-primary" />

              <span className="truncate">{profile.phone}</span>

            </div>

          ) : null}

          {profile.website ? (

            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">

              <Globe className="h-4 w-4 shrink-0 text-primary" />

              <a

                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}

                target="_blank"

                rel="noopener noreferrer"

                className="truncate hover:underline"

              >

                {profile.website}

              </a>

            </div>

          ) : null}

        </section>



        {profile.categories.length > 0 ? (

          <section>

            <h2 className="mb-2 text-xs font-semibold sm:text-sm">{sp.categories}</h2>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">

              {profile.categories.map((cat) => (

                <span key={cat} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary sm:px-2.5 sm:py-1 sm:text-xs">

                  {categoryLabel(cat)}

                </span>

              ))}

            </div>

          </section>

        ) : null}



        {profile.references.length > 0 ? (

          <section>

            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">

              {sp.references}

            </h2>

            <ul className="space-y-1.5 text-sm text-foreground/90">

              {profile.references.map((ref, index) => (

                <li key={`${ref}-${index}`} className="rounded-xl border border-border/60 px-3 py-2">

                  {ref}

                </li>

              ))}

            </ul>

          </section>

        ) : null}



        {documentPackages.length > 0 ? (

          <section>

            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">

              {sp.documents}

            </h2>

            <ul className="space-y-2">

              {documentPackages.map((doc) => (

                <li key={doc.id}>

                  <a

                    href={doc.url}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"

                  >

                    <FileText className="h-4 w-4 shrink-0 text-primary" />

                    <span className="truncate">{doc.name || doc.url}</span>

                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                  </a>

                </li>

              ))}

            </ul>

          </section>

        ) : null}

      </main>

    </div>

  );

}

