import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import type { LucideIcon } from "lucide-react";
import { Users, Calendar, Trophy, MapPin, Phone, Mail, Clock, ArrowRight, Search, Send, Loader2, X, ShieldQuestion, Newspaper, ShoppingBag, ExternalLink, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { parseProductImageUrls } from "@/lib/shop-product-images";
import { trackEvent } from "@/lib/telemetry";
import {
  parsePublicPageSections,
  type PublicPageSectionId,
  type PublicPageSectionsState,
} from "@/lib/club-public-page-sections";
import logo from "@/assets/one4team-logo.png";

const CLUB_PUBLIC_SELECT =
  "id, name, slug, description, is_public, logo_url, cover_image_url, favicon_url, primary_color, secondary_color, tertiary_color, support_color, reference_images, address, phone, email, website, meta_title, meta_description, facebook_url, instagram_url, twitter_url, join_approval_mode, join_default_role, join_default_team, public_page_sections";

function mapClubRow(record: Record<string, unknown>): Club {
  return {
    id: String(record.id),
    name: String(record.name),
    slug: String(record.slug),
    description: (record.description as string | null) ?? null,
    is_public: record.is_public !== false,
    logo_url: (record.logo_url as string | null) ?? null,
    cover_image_url: (record.cover_image_url as string | null) ?? null,
    favicon_url: (record.favicon_url as string | null) ?? null,
    primary_color: (record.primary_color as string | null) ?? null,
    secondary_color: (record.secondary_color as string | null) ?? null,
    tertiary_color: (record.tertiary_color as string | null) ?? null,
    support_color: (record.support_color as string | null) ?? null,
    reference_images: Array.isArray(record.reference_images) ? record.reference_images.map(String) : [],
    address: (record.address as string | null) ?? null,
    phone: (record.phone as string | null) ?? null,
    email: (record.email as string | null) ?? null,
    website: (record.website as string | null) ?? null,
    meta_title: (record.meta_title as string | null) ?? null,
    meta_description: (record.meta_description as string | null) ?? null,
    facebook_url: (record.facebook_url as string | null) ?? null,
    instagram_url: (record.instagram_url as string | null) ?? null,
    twitter_url: (record.twitter_url as string | null) ?? null,
    join_approval_mode: (record.join_approval_mode as "manual" | "auto") || "manual",
    join_default_role: (record.join_default_role as string | null) ?? "member",
    join_default_team: (record.join_default_team as string | null) ?? null,
    sectionVisibility: parsePublicPageSections(record.public_page_sections),
  };
}

type Club = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  support_color: string | null;
  reference_images: string[] | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  meta_title: string | null;
  meta_description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  join_approval_mode: "manual" | "auto";
  join_default_role: string | null;
  join_default_team: string | null;
  sectionVisibility: PublicPageSectionsState;
};

type TeamRowLite = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
};

type TrainingSessionRowLite = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  team_id: string | null;
  teams?: { name: string } | null;
};

type EventRowLite = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
};

type NewsRowLite = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  priority: string | null;
};

type ShopProductLite = {
  id: string;
  name: string;
  description: string | null;
  price_eur: number;
  image_url: string | null;
  image_urls?: unknown;
  stock: number;
  is_active: boolean;
};

function normalizeSectionSearch(q: string) {
  return q.trim().toLowerCase();
}

function matchesSectionFilter(query: string, ...parts: (string | null | undefined)[]) {
  const n = normalizeSectionSearch(query);
  if (!n) return true;
  return parts.some((p) => p && String(p).toLowerCase().includes(n));
}

interface SectionSearchBarProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function SectionSearchBar({ id, value, onChange, placeholder }: SectionSearchBarProps) {
  return (
    <div className="relative max-w-md mx-auto mb-5 sm:mb-7">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
      <Input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-11 min-h-[44px] rounded-full border-border/80 bg-card/80 text-base shadow-sm"
      />
    </div>
  );
}

const clubScrollRowClass =
  "flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden";

/** Centered readable column on phones; left-aligned from md up */
const clubSectionContainer =
  "w-full max-w-lg sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 text-center md:text-left";

const clubFooterInner =
  "w-full max-w-lg sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 text-center";

const ClubPage = () => {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeClubId, activeClub } = useActiveClub();
  const { t } = useLanguage();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRowLite[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRowLite[]>([]);
  const [events, setEvents] = useState<EventRowLite[]>([]);
  const [news, setNews] = useState<NewsRowLite[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProductLite[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [showRequestInvite, setShowRequestInvite] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isPreviewMode = searchParams.get("preview") === "1";

  const [newsFilter, setNewsFilter] = useState("");
  const [teamsFilter, setTeamsFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [sessionsFilter, setSessionsFilter] = useState("");
  const [eventsFilter, setEventsFilter] = useState("");
  const [mediaFilter, setMediaFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");

  const canRequestInvite = useMemo(() => Boolean(club?.is_public), [club?.is_public]);
  const referenceImages = useMemo(
    () => (club?.reference_images || []).filter(Boolean).slice(0, 8),
    [club?.reference_images]
  );

  const navSections = useMemo(() => {
    if (!club) return [];
    const vis = club.sectionVisibility;
    const items: { id: PublicPageSectionId; label: string }[] = [
      { id: "about", label: t.clubPage.aboutSection },
      { id: "news", label: t.clubPage.newsSection },
      { id: "teams", label: t.clubPage.teamsSection },
      { id: "shop", label: t.clubPage.shopSection },
      { id: "media", label: t.clubPage.mediaSection },
      { id: "schedule", label: t.clubPage.scheduleSection },
      { id: "events", label: t.clubPage.eventsSection },
      { id: "contact", label: t.clubPage.contactSection },
    ];
    return items.filter((s) => vis[s.id]);
  }, [club, t.clubPage]);

  const heroQuickLinks = useMemo(() => {
    if (!club) return [];
    const vis = club.sectionVisibility;
    const links: { id: PublicPageSectionId; label: string; icon: LucideIcon }[] = [];
    if (vis.teams) links.push({ id: "teams", label: t.clubPage.teamsSection, icon: Trophy });
    if (vis.schedule) links.push({ id: "schedule", label: t.clubPage.trainingSchedule, icon: Clock });
    if (vis.events) links.push({ id: "events", label: t.clubPage.eventsSection, icon: Calendar });
    return links;
  }, [club, t.clubPage]);

  const handleAddToPhoneClick = () => {
    toast({
      title: t.clubPage.addToHomeTitle,
      description: t.clubPage.addToHomeBody,
      duration: 14_000,
    });
  };

  const filteredNews = useMemo(
    () =>
      news.filter((item) =>
        matchesSectionFilter(newsFilter, item.title, item.content, item.priority ?? undefined)
      ),
    [news, newsFilter]
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) =>
        matchesSectionFilter(teamsFilter, team.name, team.sport, team.age_group ?? undefined, team.coach_name ?? undefined)
      ),
    [teams, teamsFilter]
  );

  const filteredShopProducts = useMemo(
    () =>
      shopProducts.filter((p) => matchesSectionFilter(shopFilter, p.name, p.description ?? undefined)),
    [shopProducts, shopFilter]
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) =>
        matchesSectionFilter(
          sessionsFilter,
          s.title,
          s.location ?? undefined,
          s.teams?.name ?? undefined
        )
      ),
    [sessions, sessionsFilter]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((e) =>
        matchesSectionFilter(
          eventsFilter,
          e.title,
          e.description ?? undefined,
          e.event_type,
          e.location ?? undefined
        )
      ),
    [events, eventsFilter]
  );

  const filteredReferenceImages = useMemo(
    () => referenceImages.filter((url) => matchesSectionFilter(mediaFilter, url)),
    [referenceImages, mediaFilter]
  );

  const contactBlocksVisible = useMemo(() => {
    if (!club) return { address: false, phone: false, email: false, website: false };
    const q = contactFilter;
    return {
      address: Boolean(club.address) && matchesSectionFilter(q, club.address, t.clubPage.address),
      phone: Boolean(club.phone) && matchesSectionFilter(q, club.phone, t.clubPage.phone),
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

  const hasAnyContactContent = useMemo(() => {
    if (!club) return false;
    return Boolean(
      club.address ||
        club.phone ||
        club.email ||
        club.website ||
        club.facebook_url ||
        club.instagram_url ||
        club.twitter_url
    );
  }, [club]);

  const hasVisibleContactAfterFilter = useMemo(
    () =>
      contactBlocksVisible.address ||
      contactBlocksVisible.phone ||
      contactBlocksVisible.email ||
      contactBlocksVisible.website ||
      socialVisible.facebook ||
      socialVisible.instagram ||
      socialVisible.twitter,
    [contactBlocksVisible, socialVisible]
  );

  const contactSearchNoResults = useMemo(
    () => Boolean(normalizeSectionSearch(contactFilter) && hasAnyContactContent && !hasVisibleContactAfterFilter),
    [contactFilter, hasAnyContactContent, hasVisibleContactAfterFilter]
  );

  const loadClub = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!clubSlug) return;
      setLoading(true);
      const first = await supabase.from("clubs").select(CLUB_PUBLIC_SELECT).eq("slug", clubSlug).maybeSingle();

      let record = (first.data as Record<string, unknown> | null) ?? null;
      let loadError = first.error;

      if (!loadError && !record && isPreviewMode && user && activeClubId && activeClub?.slug === clubSlug) {
        const second = await supabase.from("clubs").select(CLUB_PUBLIC_SELECT).eq("id", activeClubId).maybeSingle();
        loadError = second.error;
        record = (second.data as Record<string, unknown> | null) ?? null;
      }

      if (loadError) {
        if (!options?.quiet) toast({ title: t.common.error, description: loadError.message, variant: "destructive" });
        setClub(null);
      } else if (record) {
        setClub(mapClubRow(record));
      } else {
        setClub(null);
      }
      setLoading(false);
    },
    [activeClub?.slug, activeClubId, clubSlug, isPreviewMode, t.common.error, toast, user]
  );

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (!isPreviewMode || !clubSlug) return;
    const refresh = () => void loadClub({ quiet: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [isPreviewMode, clubSlug, loadClub]);

  useEffect(() => {
    if (!club) return;
    const previousTitle = document.title;
    document.title = club.meta_title?.trim() || club.name;

    const existingMeta = document.querySelector('meta[name="description"]');
    const createdMeta = !existingMeta;
    const meta = existingMeta ?? document.createElement("meta");
    if (createdMeta) {
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    const previousMetaContent = meta.getAttribute("content") ?? "";
    const desc = club.meta_description?.trim() || club.description?.trim() || "";
    meta.setAttribute("content", desc);

    return () => {
      document.title = previousTitle;
      if (createdMeta) meta.remove();
      else meta.setAttribute("content", previousMetaContent);
    };
  }, [club]);

  useEffect(() => {
    if (!club) return;

    const head = document.head;
    const iconUrl = club.favicon_url || club.logo_url;
    const iconHref = iconUrl || `${window.location.origin}/favicon.png`;
    const themeColor = club.primary_color?.trim() || "#0f172a";

    const shortcut = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    const previousIconHref = shortcut?.getAttribute("href");
    if (shortcut) shortcut.setAttribute("href", iconHref);

    let themeMeta = head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const themeMetaCreated = !themeMeta;
    const previousThemeContent = themeMeta?.getAttribute("content");
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", themeColor);

    let apple = head.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    const appleCreated = !apple;
    const previousAppleHref = apple?.getAttribute("href");
    if (!apple) {
      apple = document.createElement("link");
      apple.setAttribute("rel", "apple-touch-icon");
      head.appendChild(apple);
    }
    apple.setAttribute("href", iconHref);

    const metaPatches: { el: HTMLMetaElement; prev: string | null; created: boolean }[] = [];
    const ensureMeta = (name: string, content: string) => {
      let el = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      metaPatches.push({ el, prev, created });
    };

    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-title", club.name.slice(0, 40));

    const startUrl = `${window.location.origin}/club/${club.slug}${window.location.search}`;
    const manifest = {
      name: club.name,
      short_name: club.name.length > 12 ? `${club.name.slice(0, 11)}…` : club.name,
      description: (club.description || club.meta_description || "").slice(0, 400),
      start_url: startUrl,
      scope: `${window.location.origin}/`,
      display: "standalone" as const,
      orientation: "portrait-primary" as const,
      background_color: club.tertiary_color?.trim() || "#0f172a",
      theme_color: themeColor,
      icons: [
        { src: iconHref, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: iconHref, sizes: "192x192", type: "image/png", purpose: "any" },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const manifestUrl = URL.createObjectURL(blob);

    let manLink = head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const manifestCreated = !manLink;
    if (!manLink) {
      manLink = document.createElement("link");
      manLink.setAttribute("rel", "manifest");
      head.appendChild(manLink);
    }
    const previousManifestHref = manLink.getAttribute("href");
    manLink.setAttribute("href", manifestUrl);

    return () => {
      URL.revokeObjectURL(manifestUrl);
      if (manifestCreated && manLink.parentNode) manLink.remove();
      else if (previousManifestHref !== null) manLink.setAttribute("href", previousManifestHref);
      else manLink.removeAttribute("href");

      metaPatches.forEach(({ el, prev, created }) => {
        if (created && el.parentNode) el.remove();
        else if (prev !== null) el.setAttribute("content", prev);
        else el.removeAttribute("content");
      });

      if (themeMetaCreated && themeMeta.parentNode) themeMeta.remove();
      else if (!themeMetaCreated && themeMeta) {
        if (previousThemeContent !== null && previousThemeContent !== undefined)
          themeMeta.setAttribute("content", previousThemeContent);
        else themeMeta.removeAttribute("content");
      }

      if (appleCreated && apple.parentNode) apple.remove();
      else if (!appleCreated && apple && previousAppleHref !== null) apple.setAttribute("href", previousAppleHref);
      else if (!appleCreated && apple && previousAppleHref === null) apple.removeAttribute("href");

      if (shortcut) {
        if (previousIconHref) shortcut.setAttribute("href", previousIconHref);
        else shortcut.setAttribute("href", `${window.location.origin}/favicon.png`);
      }
    };
  }, [club]);

  useEffect(() => {
    const run = async () => {
      if (!club?.id) return;
      if (user) {
        setCheckingMembership(true);
        const { data: membership, error: membershipError } = await supabase
          .from("club_memberships")
          .select("id")
          .eq("club_id", club.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setIsMember(!membershipError && Boolean(membership?.id));
        setCheckingMembership(false);
      } else {
        setIsMember(false);
      }

      setLoadingData(true);
      const nowIso = new Date().toISOString();
      const [teamsRes, sessionsRes, eventsRes, newsRes, membersCountRes, shopRes] = await Promise.all([
        supabase.from("teams").select("id, name, sport, age_group, coach_name").eq("club_id", club.id).order("name"),
        supabase
          .from("training_sessions")
          .select("id, title, location, starts_at, team_id, teams(name)")
          .eq("club_id", club.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, description, event_type, starts_at, location")
          .eq("club_id", club.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(6),
        supabase
          .from("announcements")
          .select("id, title, content, created_at, priority")
          .eq("club_id", club.id)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("club_memberships")
          .select("id", { count: "exact", head: true })
          .eq("club_id", club.id)
          .eq("status", "active"),
        supabaseDynamic
          .from("shop_products")
          .select("id, name, description, price_eur, image_url, image_urls, stock, is_active")
          .eq("club_id", club.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (teamsRes.error) toast({ title: t.common.error, description: teamsRes.error.message, variant: "destructive" });
      if (sessionsRes.error) toast({ title: t.common.error, description: sessionsRes.error.message, variant: "destructive" });
      if (eventsRes.error) toast({ title: t.common.error, description: eventsRes.error.message, variant: "destructive" });
      if (newsRes.error) toast({ title: t.common.error, description: newsRes.error.message, variant: "destructive" });

      setTeams((teamsRes.data as TeamRowLite[]) || []);
      setSessions((sessionsRes.data as TrainingSessionRowLite[]) || []);
      setEvents((eventsRes.data as EventRowLite[]) || []);
      setNews((newsRes.data as NewsRowLite[]) || []);
      setMemberCount((membersCountRes as unknown as { count: number | null }).count ?? 0);
      setShopProducts((shopRes.data as unknown as ShopProductLite[]) || []);
      setLoadingData(false);
    };
    void run();
  }, [club?.id, t.common.error, toast, user]);

  useEffect(() => {
    if (!user) return;
    const displayName = (user.user_metadata?.display_name as string | undefined) || "";
    if (displayName && !reqName) setReqName(displayName);
    if (user.email && !reqEmail) setReqEmail(user.email);
  }, [reqEmail, reqName, user]);

  const handleOpenDashboard = useCallback(() => {
    if (!club?.id) return;
    if (user) localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
    const role = localStorage.getItem("one4team.activeRole") || "player";
    navigate(`/dashboard/${role}`);
  }, [club?.id, navigate, user]);

  const clubPublicMenuTop = useCallback(
    (close: () => void) => (
      <div className="grid gap-3">
        {navSections.length > 0 ? (
          <div className="grid gap-1">
            <div className="text-[11px] text-muted-foreground px-1">{t.clubPage.sections}</div>
            {navSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  close();
                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm border border-border/60 bg-card/40 hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-foreground">{section.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
        <div className={navSections.length > 0 ? "pt-1 border-t border-border/60" : ""}>
          {isMember ? (
            <Button
              className="w-full font-semibold text-white hover:brightness-110"
              style={{ backgroundColor: "var(--club-primary)" }}
              onClick={() => {
                close();
                handleOpenDashboard();
              }}
              disabled={checkingMembership}
            >
              {t.clubPage.openDashboard}
            </Button>
          ) : (
            <Button
              className="w-full font-semibold text-white hover:brightness-110"
              style={{ backgroundColor: "var(--club-primary)" }}
              onClick={() => {
                close();
                setShowRequestInvite(true);
              }}
            >
              {t.clubPage.requestInvite}
            </Button>
          )}
        </div>
      </div>
    ),
    [checkingMembership, handleOpenDashboard, isMember, navSections, t.clubPage]
  );

  const handleSubmitInviteRequest = async () => {
    if (!club) return;
    if (!user) {
      toast({ title: t.clubPage.signInRequired, description: t.clubPage.signInBeforeJoin });
      trackEvent("club_join_auth_redirect", { clubSlug: club.slug });
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!canRequestInvite) {
      toast({ title: t.clubPage.inviteRequestsDisabled, description: t.clubPage.notAcceptingRequests });
      return;
    }
    if (!reqName.trim() || !reqEmail.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("register_club_join_request", {
        _club_id: club.id,
        _name: reqName.trim(),
        _message: reqMessage.trim() || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      const outcome = (row?.outcome as string | undefined) || "pending";
      const role = (row?.role as string | undefined) || "member";

      if (outcome === "joined") {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "joined", role });
        if (user) localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
        localStorage.setItem("one4team.activeRole", role);
        toast({ title: t.clubPage.joinApproved, description: t.clubPage.joinApprovedDesc });
        navigate(`/dashboard/${role}`);
        return;
      }
      if (outcome === "already_member") {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "already_member" });
        if (user) localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
        toast({ title: t.clubPage.alreadyMember, description: t.clubPage.alreadyMemberDesc });
        navigate(`/dashboard/${localStorage.getItem("one4team.activeRole") || "player"}`);
        return;
      }

      trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "pending_review" });
      toast({ title: t.clubPage.requestSent, description: t.clubPage.requestSentDesc });
      setReqName("");
      setReqEmail(user.email || "");
      setReqMessage("");
      setShowRequestInvite(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.toLowerCase().includes("too many requests")) {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "rate_limited" });
        toast({
          title: t.clubPage.rateLimitReachedTitle,
          description: t.clubPage.rateLimitReachedDesc,
          variant: "destructive",
        });
      } else {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "error" });
        toast({ title: t.common.error, description: message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const themeStyle = {
    "--club-primary": club?.primary_color || "#C4A052",
    "--club-secondary": club?.secondary_color || "#1E293B",
    "--club-tertiary": club?.tertiary_color || "#0F172A",
    "--club-support": club?.support_color || "#22C55E",
  } as React.CSSProperties;

  const hasRealProducts = shopProducts.length > 0;

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]" style={themeStyle}>
      <AppHeader
        variant="clubPublic"
        title={club?.name || t.common.club}
        subtitle={club?.description || t.clubPage.inviteOnlyOnboarding}
        back={false}
        titleLeading={
          club ? (
            <img src={club.logo_url || logo} alt="" className="w-7 h-7 shrink-0 rounded-md object-cover" />
          ) : undefined
        }
        clubPublicMenuTop={clubPublicMenuTop}
        rightSlot={
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {isMember ? (
              <Button
                size="sm"
                className="font-semibold text-white hover:brightness-110"
                style={{ backgroundColor: "var(--club-primary)" }}
                onClick={handleOpenDashboard}
                disabled={checkingMembership}
              >
                {t.clubPage.openDashboard}
              </Button>
            ) : (
              <Button
                size="sm"
                className="font-semibold text-white hover:brightness-110"
                style={{ backgroundColor: "var(--club-primary)" }}
                onClick={() => setShowRequestInvite(true)}
              >
                {t.clubPage.requestInvite}
              </Button>
            )}
          </div>
        }
      />

      {isPreviewMode ? (
        <div className="border-b border-primary/20 bg-primary/10">
          <div className={`${clubSectionContainer} py-2 text-xs text-primary font-medium`}>
            {t.clubPage.previewMode} · {t.clubPage.previewModeDesc}
          </div>
        </div>
      ) : null}

      {navSections.length > 0 ? (
        <div className="hidden md:block border-b border-border bg-background/40 backdrop-blur-xl">
          <div className={`${clubSectionContainer} py-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground`}>
            {navSections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-foreground transition-colors">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <section className="relative py-12 sm:py-16 md:py-24 lg:py-28 overflow-hidden">
        {club?.cover_image_url ? <img src={club.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,var(--club-tertiary)_0%,var(--club-secondary)_45%,transparent_100%)] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-background" />
        <div className={`${clubSectionContainer} relative`}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              !loading && club
                ? "text-center max-w-4xl mx-auto max-md:flex max-md:flex-col max-md:min-h-[min(56dvh,26rem)] md:block"
                : "text-center max-w-4xl mx-auto"
            }
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.clubPage.loadingClub}
              </div>
            ) : !club ? (
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <ShieldQuestion className="w-5 h-5" /> {t.clubPage.clubNotFound}
                </div>
                {isPreviewMode && !user ? (
                  <p className="text-xs text-muted-foreground text-center max-w-md mx-auto mb-3">{t.clubPage.previewSignInHint}</p>
                ) : null}
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => navigate("/")}>{t.clubPage.goHome}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mx-auto mb-5 sm:mb-6 border border-white/20 bg-white/10 backdrop-blur overflow-hidden flex items-center justify-center">
                  <img src={club.logo_url || logo} alt={club.name} className="w-full h-full object-cover" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-white px-1">{club.name}</h1>
                {club.description?.trim() ? (
                  <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-5 sm:mb-6 leading-relaxed whitespace-pre-line px-1">{club.description}</p>
                ) : (
                  <>
                    <p className="text-base sm:text-lg text-white/85 mb-2 px-2">{t.clubPage.clubOnboardingSubtitle}</p>
                    <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto mb-5 sm:mb-6 px-2">{t.clubPage.joinCommunity}</p>
                  </>
                )}
                <div className="mb-5 sm:mb-6 w-full max-w-md mx-auto px-1 flex flex-col gap-2 sm:gap-3 md:max-w-none md:px-0 md:items-center">
                  {heroQuickLinks.length > 0 ? (
                    <div
                      className={[
                        "w-full gap-1",
                        "max-md:grid",
                        heroQuickLinks.length === 1
                          ? "max-md:grid-cols-1"
                          : heroQuickLinks.length === 2
                            ? "max-md:grid-cols-2"
                            : "max-md:grid-cols-3",
                        "md:flex md:flex-wrap md:justify-center md:gap-2 md:w-auto md:mx-auto",
                      ].join(" ")}
                    >
                      {heroQuickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={link.id}
                            href={`#${link.id}`}
                            className="inline-flex w-full min-w-0 justify-center items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-2 sm:px-3 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors md:w-auto md:flex-none md:px-4"
                          >
                            <Icon className="w-4 h-4 opacity-90 shrink-0" aria-hidden />
                            <span className="truncate">{link.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 flex-wrap md:w-auto">
                  {isMember ? (
                    <Button
                      size="lg"
                      className="rounded-full font-semibold text-white hover:brightness-110 w-full sm:w-auto"
                      style={{ backgroundColor: "var(--club-primary)" }}
                      onClick={handleOpenDashboard}
                    >
                      {t.clubPage.openDashboard} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="rounded-full font-semibold text-white hover:brightness-110 w-full sm:w-auto"
                      style={{ backgroundColor: "var(--club-primary)" }}
                      onClick={() => setShowRequestInvite(true)}
                    >
                      {t.clubPage.requestInvite} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto"
                    onClick={handleAddToPhoneClick}
                  >
                    <Smartphone className="w-4 h-4 sm:mr-2" />
                    {t.clubPage.addToHomeTitle}
                  </Button>
                  </div>
                </div>
                {!canRequestInvite ? <div className="mt-6 text-xs text-white/70 text-center md:text-center">{t.clubPage.privateClub}</div> : null}
                {club?.join_approval_mode === "auto" ? (
                  <div className="mt-2 text-xs text-white/70 text-center">{t.clubPage.autoJoinEnabled}</div>
                ) : null}
                <Link
                  to="/"
                  className="group mt-8 sm:mt-10 max-md:mt-auto max-md:pt-6 flex flex-col items-center gap-[0.5625rem] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm"
                >
                  <span className="text-[0.625rem] sm:text-[0.6875rem] text-white/60 tracking-wide leading-snug underline-offset-2 group-hover:text-white/80 group-hover:underline">
                    {t.clubPage.heroPoweredBy}
                  </span>
                  <img
                    src={logo}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain opacity-70 group-hover:opacity-90 transition-opacity"
                  />
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {club?.sectionVisibility.about ? (
      <section id="about" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Users, value: memberCount, label: t.clubPage.membersCount, desc: t.clubPage.membersCountDesc },
              { icon: Trophy, value: teams.length, label: t.clubPage.teamsCount, desc: t.clubPage.teamsCountDesc },
              { icon: Calendar, value: events.length, label: t.clubPage.leaguesCount, desc: t.clubPage.leaguesCountDesc },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-5 sm:p-6 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl">
                <stat.icon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3" style={{ color: "var(--club-primary)" }} />
                <div className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <h3 className="font-display text-sm font-semibold text-foreground mb-1">{stat.label}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.news ? (
      <section id="news" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.topNews} <span className="text-gradient-gold">{t.clubPage.newsSection}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : !news.length ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noNewsYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.newsWillAppear}</div>
            </div>
          ) : (
            <>
              <SectionSearchBar id="club-news-search" value={newsFilter} onChange={setNewsFilter} placeholder={t.clubPage.sectionSearchNews} />
              {!filteredNews.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <>
                  <div className={clubScrollRowClass}>
                    {filteredNews.map((item) => (
                      <article
                        key={item.id}
                        className="min-w-[min(100%,320px)] max-w-[90vw] shrink-0 snap-start p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1 shrink-0">
                            <Newspaper className="w-3 h-3" /> {item.priority || t.clubPage.newsSection}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-base sm:text-lg leading-snug">{item.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-4">{item.content}</p>
                      </article>
                    ))}
                  </div>
                  <p className="md:hidden text-[10px] text-center text-muted-foreground mt-1 mb-4">{t.clubPage.swipeForMore}</p>
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNews.map((item) => (
                      <article key={item.id} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                            <Newspaper className="w-3 h-3" /> {item.priority || t.clubPage.newsSection}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-lg">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-4">{item.content}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.teams ? (
      <section id="teams" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.ourTeams} <span className="text-gradient-gold">{t.clubPage.teamsHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : teams.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noTeamsYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.teamsWillAppear}</div>
            </div>
          ) : (
            <>
              <SectionSearchBar id="club-teams-search" value={teamsFilter} onChange={setTeamsFilter} placeholder={t.clubPage.sectionSearchTeams} />
              {!filteredTeams.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <>
                  <div className={clubScrollRowClass}>
                    {filteredTeams.map((team) => (
                      <div
                        key={team.id}
                        className="min-w-[min(100%,280px)] max-w-[85vw] shrink-0 snap-start p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "var(--club-primary)" }}>
                          <Trophy className="w-5 h-5" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight line-clamp-2">{team.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {team.sport}
                          {team.age_group ? ` · ${team.age_group}` : ""}
                        </p>
                        {team.coach_name ? (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {t.clubPage.coach}: {team.coach_name}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="md:hidden text-[10px] text-center text-muted-foreground mt-1 mb-4">{t.clubPage.swipeForMore}</p>
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredTeams.map((team) => (
                      <div key={team.id} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)] hover:border-primary/30 transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "var(--club-primary)" }}>
                          <Trophy className="w-5 h-5" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight truncate">{team.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {team.sport}
                          {team.age_group ? ` · ${team.age_group}` : ""}
                        </p>
                        {team.coach_name ? <div className="text-xs text-muted-foreground truncate">{t.clubPage.coach}: {team.coach_name}</div> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.shop ? (
      <section id="shop" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2">
            {t.clubPage.featuredShop} <span className="text-gradient-gold">{t.clubPage.shopSection}</span>
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-2xl mx-auto mb-6 sm:mb-8">{t.clubPage.shopDesc}</p>
          {hasRealProducts ? (
            <>
              <SectionSearchBar id="club-shop-search" value={shopFilter} onChange={setShopFilter} placeholder={t.clubPage.sectionSearchShop} />
              {!filteredShopProducts.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <>
                  <div className={clubScrollRowClass}>
                    {filteredShopProducts.map((product) => {
                      const shopImg = product.image_url || parseProductImageUrls(product)[0];
                      return (
                        <div
                          key={product.id}
                          className="min-w-[min(100%,300px)] max-w-[88vw] shrink-0 snap-start rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                        >
                          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/5 to-muted/25 flex items-center justify-center">
                            {shopImg ? (
                              <img
                                src={shopImg}
                                alt={product.name}
                                className="h-full w-full object-contain object-center p-2 sm:p-3"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <ShoppingBag className="w-10 h-10 text-primary/30" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">{product.name}</h3>
                            {product.description ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p> : null}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                              <span className="font-display font-bold text-foreground text-base sm:text-lg">EUR {Number(product.price_eur).toFixed(2)}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${product.stock > 0 ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}
                              >
                                {product.stock > 0 ? `${t.shopPage.inStock} (${product.stock})` : t.shopPage.outOfStock}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="md:hidden text-[10px] text-center text-muted-foreground mt-1 mb-4">{t.clubPage.swipeForMore}</p>
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredShopProducts.map((product) => {
                      const shopImg = product.image_url || parseProductImageUrls(product)[0];
                      return (
                        <div key={product.id} className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/5 to-muted/25 flex items-center justify-center">
                            {shopImg ? (
                              <img
                                src={shopImg}
                                alt={product.name}
                                className="h-full w-full object-contain object-center p-2 sm:p-3"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <ShoppingBag className="w-10 h-10 text-primary/30" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-display font-semibold text-foreground text-sm">{product.name}</h3>
                            {product.description ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p> : null}
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-display font-bold text-foreground text-lg">EUR {Number(product.price_eur).toFixed(2)}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${product.stock > 0 ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}
                              >
                                {product.stock > 0 ? `${t.shopPage.inStock} (${product.stock})` : t.shopPage.outOfStock}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: t.clubPage.shopJerseysTitle, description: t.clubPage.shopJerseysDesc },
                { title: t.clubPage.shopTrainingTitle, description: t.clubPage.shopTrainingDesc },
                { title: t.clubPage.shopFanTitle, description: t.clubPage.shopFanDesc },
              ].map((card) => (
                <div key={card.title} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">{card.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
              ))}
            </div>
          )}
          {club?.website ? (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => window.open(club.website || "", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1" /> {t.clubPage.openShop}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.media ? (
      <section id="media" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.mediaSection} <span className="text-gradient-gold">{t.clubPage.galleryHighlight}</span>
          </h2>
          {!referenceImages.length ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noGalleryYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.galleryWillAppear}</div>
            </div>
          ) : (
            <>
              <SectionSearchBar id="club-media-search" value={mediaFilter} onChange={setMediaFilter} placeholder={t.clubPage.sectionSearchMedia} />
              {!filteredReferenceImages.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <>
                  <div className={clubScrollRowClass}>
                    {filteredReferenceImages.map((image) => (
                      <div key={image} className="min-w-[min(100%,260px)] max-w-[80vw] shrink-0 snap-start aspect-[4/3] rounded-2xl border border-border/70 overflow-hidden bg-card/40">
                        <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                  <p className="md:hidden text-[10px] text-center text-muted-foreground mt-1 mb-4">{t.clubPage.swipeForMore}</p>
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredReferenceImages.map((image) => (
                      <div key={`grid-${image}`} className="aspect-[4/3] rounded-2xl border border-border/70 overflow-hidden bg-card/40">
                        <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.schedule ? (
      <section id="schedule" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.trainingSchedule} <span className="text-gradient-gold">{t.clubPage.scheduleHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : sessions.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noUpcomingSessions}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.sessionsWillShow}</div>
            </div>
          ) : (
            <>
              <SectionSearchBar id="club-schedule-search" value={sessionsFilter} onChange={setSessionsFilter} placeholder={t.clubPage.sectionSearchSchedule} />
              {!filteredSessions.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <div className="max-w-2xl mx-auto rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                  {filteredSessions.map((session, index) => (
                    <div key={session.id} className={`px-4 sm:px-5 py-3.5 sm:py-4 ${index < filteredSessions.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-medium text-foreground break-words">{session.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-3 sm:gap-y-1">
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 shrink-0" />{" "}
                            {new Date(session.starts_at).toLocaleString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {session.location ? (
                            <span className="inline-flex items-start gap-1 break-words">
                              <MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {session.location}
                            </span>
                          ) : null}
                          {session.teams?.name ? (
                            <span className="inline-flex items-center gap-1">
                              <Trophy className="w-3 h-3 shrink-0" /> {session.teams.name}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.events ? (
      <section id="events" className="py-10 sm:py-14 border-t border-border">
        <div className={clubSectionContainer}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.upcomingEvents} <span className="text-gradient-gold">{t.clubPage.eventsHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : events.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noUpcomingEvents}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.eventsWillAppear}</div>
            </div>
          ) : (
            <>
              <SectionSearchBar id="club-events-search" value={eventsFilter} onChange={setEventsFilter} placeholder={t.clubPage.sectionSearchEvents} />
              {!filteredEvents.length ? (
                <div className="max-w-2xl mx-auto rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">{t.clubPage.noSearchResults}</div>
              ) : (
                <>
                  <div className={clubScrollRowClass}>
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="min-w-[min(100%,300px)] max-w-[90vw] shrink-0 snap-start p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize shrink-0">{event.event_type}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />{" "}
                            {new Date(event.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight text-base">{event.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{event.description || ""}</p>
                        {event.location ? (
                          <div className="mt-3 text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span className="break-words">{event.location}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="md:hidden text-[10px] text-center text-muted-foreground mt-1 mb-4">{t.clubPage.swipeForMore}</p>
                  <div className="hidden md:grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {filteredEvents.map((event) => (
                      <div key={`ev-${event.id}`} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">{event.event_type}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {new Date(event.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight">{event.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{event.description || ""}</p>
                        {event.location ? <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</div> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
      ) : null}

      {club?.sectionVisibility.contact ? (
      <section id="contact" className="py-10 sm:py-14 border-t border-border">
        <div className={`${clubSectionContainer} max-w-3xl`}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
            {t.clubPage.getInTouch} <span className="text-gradient-gold">{t.clubPage.touchHighlight}</span>
          </h2>
          {hasAnyContactContent ? (
            <SectionSearchBar id="club-contact-search" value={contactFilter} onChange={setContactFilter} placeholder={t.clubPage.sectionSearchContact} />
          ) : null}
          {contactSearchNoResults ? (
            <div className="rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground mb-4">{t.clubPage.noSearchResults}</div>
          ) : null}
          {club?.address || club?.phone || club?.email || club?.website ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {contactBlocksVisible.address && club.address ? (
                <div className="p-4 sm:p-5 rounded-xl bg-card border border-border text-center">
                  <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{t.clubPage.address}</div>
                  <div className="text-sm text-foreground whitespace-pre-line break-words">{club.address}</div>
                </div>
              ) : null}
              {contactBlocksVisible.phone && club.phone ? (
                <div className="p-4 sm:p-5 rounded-xl bg-card border border-border text-center">
                  <Phone className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{t.clubPage.phone}</div>
                  <div className="text-sm text-foreground break-all">{club.phone}</div>
                </div>
              ) : null}
              {contactBlocksVisible.email && club.email ? (
                <div className="p-4 sm:p-5 rounded-xl bg-card border border-border text-center">
                  <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{t.clubPage.emailLabel}</div>
                  <div className="text-sm text-foreground break-all">{club.email}</div>
                </div>
              ) : null}
              {contactBlocksVisible.website && club.website ? (
                <div className="p-4 sm:p-5 rounded-xl bg-card border border-border text-center flex flex-col items-center">
                  <ExternalLink className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{t.clubPage.website}</div>
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => window.open(club.website || "", "_blank")}>
                    {t.clubPage.visitWebsite}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {club?.facebook_url || club?.instagram_url || club?.twitter_url ? (
            <div className="mt-8 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t.clubPage.socialLinksHeading}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {socialVisible.facebook && club.facebook_url ? (
                  <Button variant="outline" size="sm" onClick={() => window.open(club.facebook_url || "", "_blank")}>
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> {t.clubPage.followFacebook}
                  </Button>
                ) : null}
                {socialVisible.instagram && club.instagram_url ? (
                  <Button variant="outline" size="sm" onClick={() => window.open(club.instagram_url || "", "_blank")}>
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> {t.clubPage.followInstagram}
                  </Button>
                ) : null}
                {socialVisible.twitter && club.twitter_url ? (
                  <Button variant="outline" size="sm" onClick={() => window.open(club.twitter_url || "", "_blank")}>
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> {t.clubPage.followX}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {!club?.address && !club?.phone && !club?.email && !club?.website && !club?.facebook_url && !club?.instagram_url && !club?.twitter_url ? (
            <div className="rounded-2xl glass-card p-8 text-center text-sm text-muted-foreground">{t.clubPage.noContactDetails}</div>
          ) : null}
        </div>
      </section>
      ) : null}

      {showRequestInvite ? (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRequestInvite(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight">{t.clubPage.requestAnInvite}</h3>
                <p className="text-xs text-muted-foreground">{t.clubPage.weWillNotify}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRequestInvite(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!club ? (
              <div className="text-sm text-muted-foreground">{t.clubPage.clubNotAvailable}</div>
            ) : !canRequestInvite ? (
              <div className="text-sm text-muted-foreground">{t.clubPage.notAcceptingRequests}</div>
            ) : (
              <div className="space-y-3">
                <Input placeholder={t.clubPage.yourNameRequired} value={reqName} onChange={(event) => setReqName(event.target.value)} className="bg-background/60" maxLength={120} />
                <Input placeholder={t.clubPage.emailRequired} type="email" value={reqEmail} onChange={(event) => setReqEmail(event.target.value)} className="bg-background/60" maxLength={254} />
                <textarea
                  placeholder={t.clubPage.optionalMessage}
                  value={reqMessage}
                  onChange={(event) => setReqMessage(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  rows={4}
                  maxLength={800}
                />
                <Button onClick={handleSubmitInviteRequest} disabled={submitting || !reqName.trim() || !reqEmail.trim()} className="w-full text-white hover:brightness-110 disabled:opacity-40" style={{ backgroundColor: "var(--club-primary)" }}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.clubPage.sending}</> : <><Send className="w-4 h-4 mr-2" /> {t.clubPage.sendRequest}</>}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}

      <footer className="border-t border-border py-8">
        <div className={clubFooterInner}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={club?.logo_url || logo} alt="" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-display font-bold text-sm text-foreground">{club?.name || t.common.club}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t.clubPage.poweredBy}</p>
        </div>
      </footer>
    </div>
  );
};

export default ClubPage;
