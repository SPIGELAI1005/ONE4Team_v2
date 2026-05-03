import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Mail, MapPin, Navigation, Phone, Share2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubSectionSearchBar } from "@/components/public-club/public-club-page-shared";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import type { PublicClubRecord } from "@/lib/public-club-models";
import { isMissingRelationError, matchesSectionFilter, normalizeSectionSearch } from "@/lib/public-club-models";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass } from "@/lib/public-club-cta-classes";

interface ContactPersonRow {
  id: string;
  display_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
}

function buildDirectionsUrl(club: PublicClubRecord): string | null {
  if (club.latitude != null && club.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}`;
  }
  const a = club.address?.trim();
  if (a) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
  return null;
}

function osmEmbedSrc(lat: number, lon: number): string {
  const pad = 0.02;
  const bbox = `${lon - pad},${lat - pad},${lon + pad},${lat + pad}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

export default function PublicClubContactPage() {
  const { t } = useLanguage();
  const { club } = usePublicClub();

  const [contactFilter, setContactFilter] = useState("");
  const [persons, setPersons] = useState<ContactPersonRow[]>([]);

  const personsForDisplay = useMemo(() => {
    if (!club) return persons;
    if (club.micrositePrivacy.youthProtectionMode) {
      return persons.map((p) => ({ ...p, email: null, phone: null }));
    }
    if (!club.micrositePrivacy.showCoachContactPublic) {
      return persons.map((p) => ({ ...p, phone: null }));
    }
    return persons;
  }, [club, persons]);

  const loadPersons = useCallback(async () => {
    if (!club?.id) return;
    const res = await supabase
      .from("club_public_contact_persons")
      .select("id, display_name, role_title, email, phone")
      .eq("club_id", club.id)
      .eq("show_on_public_website", true)
      .order("sort_order", { ascending: true });
    if (!res.error) setPersons((res.data as ContactPersonRow[]) || []);
    else if (!isMissingRelationError(res.error)) setPersons([]);
  }, [club?.id]);

  useEffect(() => {
    void loadPersons();
  }, [loadPersons]);

  const directionsUrl = useMemo(() => (club ? buildDirectionsUrl(club) : null), [club]);
  const showMapEmbed = Boolean(club?.latitude != null && club?.longitude != null);

  const contactBlocksVisible = useMemo(() => {
    if (!club) return { address: false, phone: false, email: false, website: false };
    const q = contactFilter;
    return {
      address: Boolean(club.address) && matchesSectionFilter(q, club.address, t.clubPage.address),
      phone:
        Boolean(club.phone) &&
        club.micrositePrivacy.showCoachContactPublic &&
        matchesSectionFilter(q, club.phone, t.clubPage.phone),
      email: Boolean(club.email) && matchesSectionFilter(q, club.email, t.clubPage.emailLabel),
      website: Boolean(club.website) && matchesSectionFilter(q, club.website, t.clubPage.website, t.clubPage.visitWebsite),
    };
  }, [club, contactFilter, t.clubPage]);

  const socialVisible = useMemo(() => {
    if (!club) return { facebook: false, instagram: false, twitter: false };
    const q = contactFilter;
    return {
      facebook: Boolean(club.facebook_url) && matchesSectionFilter(q, t.clubPage.followFacebook, club.facebook_url),
      instagram: Boolean(club.instagram_url) && matchesSectionFilter(q, t.clubPage.followInstagram, club.instagram_url),
      twitter: Boolean(club.twitter_url) && matchesSectionFilter(q, t.clubPage.followX, club.twitter_url),
    };
  }, [club, contactFilter, t.clubPage]);

  const personsVisible = useMemo(() => {
    const q = contactFilter;
    if (!club?.micrositePrivacy.showContactPersonsPublic) return [];
    return personsForDisplay.filter(
      (p) =>
        matchesSectionFilter(q, p.display_name, p.role_title, p.email ?? "", p.phone ?? "", t.clubPage.contactPersonsTitle)
    );
  }, [club?.micrositePrivacy.showContactPersonsPublic, contactFilter, personsForDisplay, t.clubPage.contactPersonsTitle]);

  const notesVisible = useMemo(() => {
    if (!club?.public_location_notes?.trim()) return false;
    return matchesSectionFilter(contactFilter, club.public_location_notes, t.clubPage.contactLocationNotes);
  }, [club?.public_location_notes, contactFilter, t.clubPage.contactLocationNotes]);

  const mapBlockVisible = useMemo(() => {
    if (!directionsUrl) return false;
    if (!normalizeSectionSearch(contactFilter)) return true;
    return (
      matchesSectionFilter(contactFilter, t.clubPage.contactMapTitle) ||
      (club?.address && matchesSectionFilter(contactFilter, club.address)) ||
      (club?.latitude != null && matchesSectionFilter(contactFilter, String(club.latitude)))
    );
  }, [club?.address, club?.latitude, contactFilter, directionsUrl, t.clubPage.contactMapTitle]);

  const hasAnyContactContent = useMemo(() => {
    if (!club) return false;
    return Boolean(
      club.address ||
        club.phone ||
        club.email ||
        club.website ||
        club.facebook_url ||
        club.instagram_url ||
        club.twitter_url ||
        club.public_location_notes?.trim() ||
        (club.micrositePrivacy.showContactPersonsPublic && persons.length > 0) ||
        directionsUrl
    );
  }, [club, directionsUrl, persons.length]);

  const hasVisibleContactAfterFilter = useMemo(
    () =>
      contactBlocksVisible.address ||
      contactBlocksVisible.phone ||
      contactBlocksVisible.email ||
      contactBlocksVisible.website ||
      socialVisible.facebook ||
      socialVisible.instagram ||
      socialVisible.twitter ||
      personsVisible.length > 0 ||
      notesVisible ||
      mapBlockVisible,
    [contactBlocksVisible, mapBlockVisible, notesVisible, personsVisible.length, socialVisible]
  );

  const contactSearchNoResults = useMemo(
    () => Boolean(normalizeSectionSearch(contactFilter) && hasAnyContactContent && !hasVisibleContactAfterFilter),
    [contactFilter, hasAnyContactContent, hasVisibleContactAfterFilter]
  );

  return (
    <PublicClubPageGate section="contact">
      <PublicClubSection
        title={
          <>
            {t.clubPage.getInTouch}{" "}
            <span className="text-[color:var(--club-primary)]">{t.clubPage.touchHighlight}</span>
          </>
        }
      >
        {hasAnyContactContent ? (
          <PublicClubSectionSearchBar
            id="public-club-contact-search"
            value={contactFilter}
            onChange={setContactFilter}
            placeholder={t.clubPage.sectionSearchContact}
          />
        ) : null}
        {contactSearchNoResults ? (
          <div className="mb-4 rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-center text-sm text-[color:var(--club-muted)]">
            {t.clubPage.noSearchResults}
          </div>
        ) : null}

        {mapBlockVisible && directionsUrl ? (
          <div className="mx-auto mb-8 max-w-5xl text-left">
            <h3 className="mb-3 font-display text-lg font-semibold text-[color:var(--club-foreground)]">{t.clubPage.contactMapTitle}</h3>
            {showMapEmbed && club?.latitude != null && club.longitude != null ? (
              <div className="overflow-hidden rounded-2xl border border-[color:var(--club-border)] bg-black/20">
                <iframe
                  title={t.clubPage.contactMapTitle}
                  className="aspect-[16/10] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={osmEmbedSrc(club.latitude, club.longitude)}
                />
              </div>
            ) : (
              <PublicClubCard className="flex flex-col items-center gap-3 py-10 text-center">
                <MapPin className="h-10 w-10 text-[color:var(--club-primary)]" />
                <p className="max-w-md text-sm text-[color:var(--club-muted)]">{t.clubPage.address}</p>
                {club?.address ? (
                  <p className="max-w-lg whitespace-pre-line text-[color:var(--club-foreground)]">{club.address}</p>
                ) : null}
              </PublicClubCard>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                className={`font-semibold ${clubCtaFillHoverClass}`}
                style={{
                  backgroundColor: "var(--club-primary)",
                  color: readableTextOnSolid(club?.primary_color || "#C4A052"),
                }}
                onClick={() => window.open(directionsUrl, "_blank")}
              >
                <Navigation className="mr-2 h-4 w-4" />
                {t.clubPage.contactDirectionsCta}
              </Button>
            </div>
          </div>
        ) : null}

        {notesVisible && club?.public_location_notes ? (
          <div className="mx-auto mb-8 max-w-3xl text-left">
            <h3 className="mb-2 font-display text-lg font-semibold text-[color:var(--club-foreground)]">{t.clubPage.contactLocationNotes}</h3>
            <PublicClubCard className="whitespace-pre-line text-sm text-[color:var(--club-muted)]">{club.public_location_notes}</PublicClubCard>
          </div>
        ) : null}

        {club?.address || club?.phone || club?.email || club?.website ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {contactBlocksVisible.address && club.address ? (
              <div className="rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center sm:p-5">
                <MapPin className="mx-auto mb-2 h-6 w-6 text-[color:var(--club-primary)]" />
                <div className="mb-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.address}</div>
                <div className="break-words text-sm whitespace-pre-line text-[color:var(--club-foreground)]">{club.address}</div>
              </div>
            ) : null}
            {contactBlocksVisible.phone && club.phone ? (
              <div className="rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center sm:p-5">
                <Phone className="mx-auto mb-2 h-6 w-6 text-[color:var(--club-primary)]" />
                <div className="mb-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.phone}</div>
                <div className="break-all text-sm text-[color:var(--club-foreground)]">{club.phone}</div>
              </div>
            ) : null}
            {contactBlocksVisible.email && club.email ? (
              <div className="rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center sm:p-5">
                <Mail className="mx-auto mb-2 h-6 w-6 text-[color:var(--club-primary)]" />
                <div className="mb-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.emailLabel}</div>
                <div className="break-all text-sm text-[color:var(--club-foreground)]">{club.email}</div>
              </div>
            ) : null}
            {contactBlocksVisible.website && club.website ? (
              <div className="flex flex-col items-center rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center sm:p-5">
                <ExternalLink className="mx-auto mb-2 h-6 w-6 text-[color:var(--club-primary)]" />
                <div className="mb-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.website}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 border-[color:var(--club-border)] text-[color:var(--club-foreground)]"
                  onClick={() => window.open(club.website || "", "_blank")}
                >
                  {t.clubPage.visitWebsite}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {personsVisible.length > 0 ? (
          <div className="mx-auto mt-10 max-w-5xl text-left">
            <h3 className="mb-4 font-display text-lg font-semibold text-[color:var(--club-foreground)]">{t.clubPage.contactPersonsTitle}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {personsVisible.map((p) => (
                <li key={p.id}>
                  <PublicClubCard className="flex gap-3 text-left">
                    <UserCircle className="mt-0.5 h-10 w-10 shrink-0 text-[color:var(--club-primary)]" />
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-[color:var(--club-foreground)]">{p.display_name}</div>
                      {p.role_title ? (
                        <div className="text-xs text-[color:var(--club-muted)]">
                          {t.clubPage.contactPersonRole}: {p.role_title}
                        </div>
                      ) : null}
                      {p.email ? <div className="mt-1 break-all text-sm text-[color:var(--club-muted)]">{p.email}</div> : null}
                      {p.phone ? <div className="break-all text-sm text-[color:var(--club-muted)]">{p.phone}</div> : null}
                    </div>
                  </PublicClubCard>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {club?.facebook_url || club?.instagram_url || club?.twitter_url ? (
          <div className="mt-8 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">{t.clubPage.socialLinksHeading}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {socialVisible.facebook && club.facebook_url ? (
                <Button variant="outline" size="sm" className="border-[color:var(--club-border)]" onClick={() => window.open(club.facebook_url || "", "_blank")}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> {t.clubPage.followFacebook}
                </Button>
              ) : null}
              {socialVisible.instagram && club.instagram_url ? (
                <Button variant="outline" size="sm" className="border-[color:var(--club-border)]" onClick={() => window.open(club.instagram_url || "", "_blank")}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> {t.clubPage.followInstagram}
                </Button>
              ) : null}
              {socialVisible.twitter && club.twitter_url ? (
                <Button variant="outline" size="sm" className="border-[color:var(--club-border)]" onClick={() => window.open(club.twitter_url || "", "_blank")}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> {t.clubPage.followX}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {!club?.address &&
        !club?.phone &&
        !club?.email &&
        !club?.website &&
        !club?.facebook_url &&
        !club?.instagram_url &&
        !club?.twitter_url &&
        !club?.public_location_notes?.trim() &&
        persons.length === 0 &&
        !directionsUrl ? (
          <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-8 text-center text-sm text-[color:var(--club-muted)]">
            {t.clubPage.noContactDetails}
          </div>
        ) : null}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
