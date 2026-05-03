import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, MapPin } from "lucide-react";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import type { EventRowLite } from "@/lib/public-club-models";

export default function PublicClubEventDetailPage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { eventId = "" } = useParams();
  const { club, basePath, searchSuffix } = usePublicClub();
  const { setExtras } = usePublicClubRouteSeo();
  const [row, setRow] = useState<EventRowLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!club?.id || !eventId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("events")
        .select(
          "id, title, event_type, starts_at, ends_at, location, publish_to_public_schedule, image_url, public_summary, public_registration_enabled, registration_external_url, public_event_detail_enabled"
        )
        .eq("club_id", club.id)
        .eq("id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setRow(null);
      } else {
        setRow((data as EventRowLite) || null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, eventId]);

  useEffect(() => {
    if (!club || !row || !enabled) {
      setExtras(null);
      return;
    }
    const summary = (row.public_summary ?? "").trim();
    const desc =
      summary ||
      [
        new Date(row.starts_at).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }),
        row.location?.trim(),
      ]
        .filter(Boolean)
        .join(" · ");
    setExtras({
      title: row.title,
      description: desc.slice(0, 320),
      ogImageUrl: row.image_url?.trim() || null,
    });
    return () => setExtras(null);
  }, [club, enabled, locale, row, setExtras]);

  const listHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.events}${searchSuffix}`;
  const joinHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.join}${searchSuffix}`;
  const enabled = row?.public_event_detail_enabled === true;
  const regOpen = row?.public_registration_enabled === true && new Date(row.starts_at).getTime() > Date.now();
  const summary = (row?.public_summary ?? "").trim();

  return (
    <PublicClubPageGate section="events">
      <PublicClubSection>
        <div className="mx-auto max-w-lg text-left">
          <Link
            to={listHref}
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--club-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.clubPage.eventDetailBack}
          </Link>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {error}
            </div>
          ) : !row ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {t.clubPage.eventDetailNotFound}
            </div>
          ) : !enabled ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {t.clubPage.eventDetailPrivate}
            </div>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] shadow-sm">
              {row.image_url?.trim() ? (
                <div className="border-b border-[color:var(--club-border)]">
                  <img src={row.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                </div>
              ) : null}
              <div className="p-6">
                <div className="mb-2 inline-flex rounded-full bg-[color:var(--club-primary)]/15 px-2.5 py-1 text-xs font-medium capitalize text-[color:var(--club-primary)]">
                  {row.event_type}
                </div>
                <h1 className="font-display text-xl font-bold text-[color:var(--club-foreground)]">{row.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--club-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {new Date(row.starts_at).toLocaleString(locale, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {row.location ? (
                    <span className="inline-flex min-w-0 items-start gap-1">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="break-words">{row.location}</span>
                    </span>
                  ) : null}
                </div>
                {summary ? (
                  <p className="mt-4 text-sm leading-relaxed text-[color:var(--club-foreground)]">{summary}</p>
                ) : null}
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  {regOpen && row.registration_external_url?.trim() ? (
                    <a
                      href={row.registration_external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
                      style={{ backgroundColor: "var(--club-primary)" }}
                    >
                      {t.clubPage.eventDetailRegister}
                    </a>
                  ) : null}
                  {regOpen && !row.registration_external_url?.trim() ? (
                    <Link
                      to={joinHref}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[color:var(--club-border)] px-5 text-sm font-semibold text-[color:var(--club-foreground)] hover:bg-[color:var(--club-tertiary)]"
                    >
                      {t.clubPage.eventDetailRegisterViaClub}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-6 text-xs text-[color:var(--club-muted)]">{t.clubPage.eventDetailSafeOnly}</p>
              </div>
            </article>
          )}
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
