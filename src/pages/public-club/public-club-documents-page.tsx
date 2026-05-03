import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, HelpCircle, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRelationError, normalizeSectionSearch } from "@/lib/public-club-models";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass, clubCtaOutlineHoverClass } from "@/lib/public-club-cta-classes";

type DocumentCategory = "membership" | "policies" | "training" | "events" | "forms";

interface PublicDocumentRow {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string;
  sort_order: number;
}

interface PublicFaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = ["membership", "policies", "training", "events", "forms"];

function categoryLabel(
  cat: DocumentCategory,
  p: {
    documentsCategoryMembership: string;
    documentsCategoryPolicies: string;
    documentsCategoryTraining: string;
    documentsCategoryEvents: string;
    documentsCategoryForms: string;
  }
) {
  switch (cat) {
    case "membership":
      return p.documentsCategoryMembership;
    case "policies":
      return p.documentsCategoryPolicies;
    case "training":
      return p.documentsCategoryTraining;
    case "events":
      return p.documentsCategoryEvents;
    case "forms":
      return p.documentsCategoryForms;
    default:
      return cat;
  }
}

export default function PublicClubDocumentsPage() {
  const { t } = useLanguage();
  const { club, basePath, searchSuffix, user, documentsCta, showAdminDraftEmptyHints } = usePublicClub();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [docs, setDocs] = useState<PublicDocumentRow[]>([]);
  const [faq, setFaq] = useState<PublicFaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  const load = useCallback(async () => {
    if (!club?.id) return;
    if (!club.micrositePrivacy.showDocumentsPublic) {
      setDocs([]);
      setFaq([]);
      setTablesMissing(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setTablesMissing(false);
    const docRes = await supabase
      .from("club_public_documents")
      .select("id, title, description, category, file_url, sort_order")
      .eq("club_id", club.id)
      .eq("is_public", true)
      .eq("contains_personal_data", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (docRes.error) {
      if (isMissingRelationError(docRes.error)) {
        setTablesMissing(true);
        setDocs([]);
      } else {
        setTablesMissing(false);
        setDocs([]);
      }
    } else {
      setTablesMissing(false);
      setDocs(((docRes.data as PublicDocumentRow[]) || []).filter((r) => DOCUMENT_CATEGORIES.includes(r.category)));
    }

    const faqRes = await supabase
      .from("club_public_faq_items")
      .select("id, question, answer, sort_order")
      .eq("club_id", club.id)
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .limit(24);

    if (!faqRes.error) setFaq((faqRes.data as PublicFaqRow[]) || []);
    else if (isMissingRelationError(faqRes.error)) setFaq([]);
    setLoading(false);
  }, [club?.id, club?.micrositePrivacy.showDocumentsPublic]);

  useEffect(() => {
    void load();
  }, [load]);

  const nq = normalizeSectionSearch(query);

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (!nq) return true;
      const catLabel = categoryLabel(d.category, t.clubPage).toLowerCase();
      const blob = `${d.title} ${d.description ?? ""} ${d.category} ${catLabel}`.toLowerCase();
      return blob.includes(nq);
    });
  }, [docs, category, nq]);

  const faqPreview = useMemo(() => faq.slice(0, 3), [faq]);
  const joinFaqHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.join}${searchSuffix}#faq`;

  return (
    <PublicClubPageGate section="documents">
      <PublicClubSection
        title={<span className="text-[color:var(--club-primary)]">{t.clubPage.documentsPageTitle}</span>}
        subtitle={t.clubPage.documentsPageSubtitle}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--club-muted)]" />
            <Input
              id="public-club-documents-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.clubPage.documentsSearchPlaceholder}
              className="border-[color:var(--club-border)] bg-[color:var(--club-card)] pl-9 text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className={`shrink-0 border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)] ${clubCtaOutlineHoverClass}`}
            onClick={documentsCta}
          >
            {user ? t.clubPage.documentsSignedInCta : t.clubPage.documentsSignedOutCta}
          </Button>
        </div>

        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-2 md:justify-start">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={[
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm",
              category === "all" ? clubCtaFillHoverClass : `border border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)]/85 hover:text-[color:var(--club-foreground)] ${clubCtaOutlineHoverClass}`,
            ].join(" ")}
            style={
              category === "all"
                ? {
                    backgroundColor: "var(--club-primary)",
                    color: readableTextOnSolid(club.primary_color || "#C4A052"),
                  }
                : undefined
            }
          >
            {t.clubPage.documentsCategoryAll}
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm",
                category === cat
                  ? clubCtaFillHoverClass
                  : `border border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)]/85 hover:text-[color:var(--club-foreground)] ${clubCtaOutlineHoverClass}`,
              ].join(" ")}
              style={
                category === cat
                  ? {
                      backgroundColor: "var(--club-primary)",
                      color: readableTextOnSolid(club.primary_color || "#C4A052"),
                    }
                  : undefined
              }
            >
              {categoryLabel(cat, t.clubPage)}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-5xl text-left">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-[color:var(--club-foreground)]">
            <FileText className="h-5 w-5 text-[color:var(--club-primary)]" />
            {t.clubPage.documentsUsefulDownloads}
          </h3>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : tablesMissing ? (
            <PublicClubCard className="text-center text-sm text-[color:var(--club-muted)]">
              {t.clubPage.documentsEmptySchema}
            </PublicClubCard>
          ) : filteredDocs.length === 0 ? (
            <PublicClubCard className="text-center text-sm text-[color:var(--club-muted)]">
              {docs.length === 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-medium text-[color:var(--club-foreground)]">
                    {!club.micrositePrivacy.showDocumentsPublic
                      ? t.clubPage.documentsSectionDisabledByClub
                      : t.clubPage.documentsEmptyDedicated}
                  </p>
                  {showAdminDraftEmptyHints && club.micrositePrivacy.showDocumentsPublic ? (
                    <div className="w-full max-w-lg text-left">
                      <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintDocuments}</PublicClubDraftEmptyHint>
                    </div>
                  ) : null}
                </div>
              ) : (
                t.clubPage.documentsNoResults
              )}
            </PublicClubCard>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filteredDocs.map((d) => (
                <li key={d.id}>
                  <PublicClubCard className="h-full text-left">
                    <div className="mb-2 inline-block rounded-full border border-[color:var(--club-border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                      {categoryLabel(d.category, t.clubPage)}
                    </div>
                    <div className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{d.title}</div>
                    {d.description ? (
                      <p className="mt-1 line-clamp-3 text-sm text-[color:var(--club-muted)]">{d.description}</p>
                    ) : null}
                    <Button
                      asChild
                      size="sm"
                      className={`mt-4 w-full font-semibold sm:w-auto ${clubCtaFillHoverClass}`}
                      style={{
                        backgroundColor: "var(--club-primary)",
                        color: readableTextOnSolid(club.primary_color || "#C4A052"),
                      }}
                    >
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="mr-2 h-4 w-4" />
                        {t.clubPage.documentsOpenFile}
                      </a>
                    </Button>
                  </PublicClubCard>
                </li>
              ))}
            </ul>
          )}
        </div>

        {faqPreview.length > 0 ? (
          <div className="mx-auto mt-14 max-w-3xl text-left">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-[color:var(--club-foreground)]">
              <HelpCircle className="h-5 w-5 text-[color:var(--club-primary)]" />
              {t.clubPage.documentsFaqPreviewTitle}
            </h3>
            <Accordion type="single" collapsible className="w-full rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-2">
              {faqPreview.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-[color:var(--club-border)]">
                  <AccordionTrigger className="text-left text-[color:var(--club-foreground)] hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[color:var(--club-muted)]">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {faq.length > 3 ? (
              <div className="mt-4 text-center sm:text-left">
                <Button
                  asChild
                  variant="outline"
                  className="border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)] hover:bg-[color:color-mix(in_srgb,var(--club-card)_82%,var(--club-foreground))]"
                >
                  <Link to={joinFaqHref}>{t.clubPage.documentsFaqSeeAll}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
