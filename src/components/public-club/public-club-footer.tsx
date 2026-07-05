import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube } from "lucide-react";
import type { PublicClubRecord } from "@/lib/public-club-models";
import logo from "@/assets/one4team-logo.png";
import { useLanguage } from "@/hooks/use-language";
import { usePublicClub } from "@/contexts/public-club-context";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { requestOpenCookieSettings } from "@/lib/cookie-consent";
import { publicClubSectionContainer } from "@/components/public-club/public-club-section";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface FooterLink {
  key: string;
  href: string;
  label: string;
  external?: boolean;
}

export function PublicClubFooter({ club }: { club: PublicClubRecord | null }) {
  const { t } = useLanguage();
  const { basePath, searchSuffix } = usePublicClub();
  const f = t.clubPage.publicFooter;
  const v = club?.sectionVisibility;
  const year = new Date().getFullYear();

  const joinHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.join}${searchSuffix}`;
  const contactHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.contact}${searchSuffix}`;
  const documentsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.documents}${searchSuffix}`;
  const faqHref = v?.documents
    ? `${documentsHref}#club-faq`
    : v?.faq
      ? `${joinHref}#club-faq`
      : joinHref;

  const generalLinks: FooterLink[] = [];
  if (v?.faq || v?.documents) {
    generalLinks.push({ key: "faq", href: faqHref, label: f.linkFaq });
  }
  if (v?.contact) {
    generalLinks.push({ key: "contact", href: contactHref, label: f.linkContact });
  }
  if (v?.nextsteps && club?.micrositePrivacy.allowJoinRequestsPublic) {
    generalLinks.push({ key: "join", href: joinHref, label: f.linkMembershipApplication });
  }

  const helpLinks: FooterLink[] = [
    { key: "impressum", href: "/impressum", label: f.linkImpressum },
    { key: "privacy", href: "/privacy", label: f.linkPrivacy },
  ];
  if (v?.documents) {
    helpLinks.push({ key: "statutes", href: `${documentsHref}#club-documents`, label: f.linkStatutes });
    helpLinks.push({ key: "youth", href: `${documentsHref}#club-documents`, label: f.linkYouthProtection });
  }
  if (v?.contact) {
    const cancelHref = club?.email
      ? `mailto:${club.email}?subject=${encodeURIComponent(f.membershipCancelEmailSubject)}`
      : contactHref;
    helpLinks.push({
      key: "cancel",
      href: cancelHref,
      label: f.linkMembershipCancel,
      external: Boolean(club?.email),
    });
  }

  const socials: { key: string; href: string; label: string; icon: ReactNode }[] = [];
  if (club?.instagram_url?.trim()) {
    socials.push({
      key: "instagram",
      href: club.instagram_url.trim(),
      label: "Instagram",
      icon: <Instagram className="h-4 w-4" />,
    });
  }
  if (club?.facebook_url?.trim()) {
    socials.push({
      key: "facebook",
      href: club.facebook_url.trim(),
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
    });
  }
  if (club?.youtube_url?.trim()) {
    socials.push({
      key: "youtube",
      href: club.youtube_url.trim(),
      label: "YouTube",
      icon: <Youtube className="h-4 w-4" />,
    });
  }
  const waUrl = club?.website?.includes("wa.me") || club?.website?.includes("whatsapp")
    ? club.website
    : null;
  if (waUrl) {
    socials.push({
      key: "whatsapp",
      href: waUrl,
      label: "WhatsApp",
      icon: <WhatsAppIcon className="h-4 w-4" />,
    });
  }

  function renderLink(item: FooterLink) {
    const className =
      "text-[11px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)] transition-colors";
    if (item.external || item.href.startsWith("http") || item.href.startsWith("mailto:")) {
      return (
        <a key={item.key} href={item.href} className={className} target="_blank" rel="noopener noreferrer">
          {item.label}
        </a>
      );
    }
    if (item.href.startsWith("/") && !item.href.startsWith(basePath)) {
      return (
        <Link key={item.key} to={item.href} className={className}>
          {item.label}
        </Link>
      );
    }
    return (
      <Link key={item.key} to={item.href} className={className}>
        {item.label}
      </Link>
    );
  }

  return (
    <footer className="mt-auto border-t border-[color:var(--club-border)] bg-[color:color-mix(in_srgb,var(--club-card)_40%,transparent)] py-10">
      <div className={publicClubSectionContainer}>
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr] md:gap-6">
          <div className="text-center md:text-left">
            <div className="mb-3 flex flex-col items-center gap-2 md:flex-row md:items-center">
              <img
                src={club?.logo_url || logo}
                alt=""
                className="h-14 w-14 rounded-full border border-[color:var(--club-border)] object-cover bg-white/10"
              />
              <div>
                <div className="font-display text-base font-bold uppercase tracking-wide text-[color:var(--club-foreground)]">
                  {club?.name || t.common.club}
                </div>
                {club?.club_category ? (
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--club-primary)]">
                    {club.club_category}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-[color:var(--club-muted)]">
              {f.copyright.replace("{year}", String(year)).replace("{clubName}", club?.name || t.common.club)}
            </p>
          </div>

          {generalLinks.length > 0 ? (
            <div className="text-center md:text-left">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--club-foreground)]">
                {f.columnGeneral}
              </div>
              <nav className="flex flex-col gap-2">{generalLinks.map(renderLink)}</nav>
            </div>
          ) : null}

          <div className="text-center md:text-left">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--club-foreground)]">
              {f.columnHelp}
            </div>
            <nav className="flex flex-col gap-2">{helpLinks.map(renderLink)}</nav>
          </div>
        </div>

        {socials.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--club-border)] text-[color:var(--club-muted)] transition-colors hover:border-[color:var(--club-primary)] hover:text-[color:var(--club-foreground)]"
              >
                {s.icon}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-[color:var(--club-border)] pt-6 text-center md:items-start md:text-left">
          <button
            type="button"
            onClick={() => requestOpenCookieSettings()}
            className="text-[11px] font-medium text-[color:var(--club-muted)] underline-offset-2 hover:text-[color:var(--club-foreground)] hover:underline"
          >
            {f.cookieSettings}
          </button>
          <p className="text-[10px] text-[color:var(--club-muted)]">{t.clubPage.poweredBy}</p>
        </div>
      </div>
    </footer>
  );
}
