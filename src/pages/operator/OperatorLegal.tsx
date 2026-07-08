import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileText, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { OperatorLegalDocumentPanel } from "@/components/operator/OperatorLegalDocumentPanel";
import { OperatorLegalLogoField } from "@/components/operator/OperatorLegalLogoField";
import {
  OperatorInternalBanner,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import {
  DEFAULT_ONE4TEAM_LOGO_SRC,
  loadImageAsDataUrl,
  type LegalBrandingAssets,
} from "@/lib/operator-legal-brand";
import {
  buildDefaultLegalValues,
  fillLegalTemplate,
  getLegalCategoryLabel,
  getLegalDealFields,
  getLegalPartyFields,
  getLegalPlaceholderFields,
  getLegalTemplates,
} from "@/lib/operator-legal-templates";

const CATEGORY_TONE: Record<string, "default" | "secondary" | "outline"> = {
  Club: "default",
  Partner: "secondary",
  Compliance: "outline",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OperatorLegal() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const legal = t.operator.legal;
  const parties = legal.parties;
  const shell = t.operator.shell;

  const templates = useMemo(() => getLegalTemplates(language, t), [language, t]);
  const placeholderFields = useMemo(() => getLegalPlaceholderFields(t), [t]);
  const partyFields = useMemo(() => getLegalPartyFields(t), [t]);

  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "club-msa");
  const [values, setValues] = useState<Record<string, string>>(() => buildDefaultLegalValues(t));
  const [bodyDraft, setBodyDraft] = useState("");
  const [isBodyCustomized, setIsBodyCustomized] = useState(false);
  const [branding, setBranding] = useState<LegalBrandingAssets>({
    providerLogoDataUrl: null,
    counterpartyLogoDataUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    void loadImageAsDataUrl(DEFAULT_ONE4TEAM_LOGO_SRC)
      .then((dataUrl) => {
        if (!cancelled) {
          setBranding((prev) => ({ ...prev, providerLogoDataUrl: dataUrl }));
        }
      })
      .catch(() => {
        // Preview and PDF still work without a default logo.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextTemplates = getLegalTemplates(language, t);
    setSelectedId(nextTemplates[0]?.id ?? "club-msa");
    setValues(buildDefaultLegalValues(t));
    setIsBodyCustomized(false);
  }, [language, t]);

  const template = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const dealFields = useMemo(
    () => getLegalDealFields(template.body, t),
    [template.body, t],
  );

  const rendered = useMemo(
    () => fillLegalTemplate(template.body, values, placeholderFields),
    [template, values, placeholderFields],
  );

  useEffect(() => {
    if (!isBodyCustomized) {
      setBodyDraft(rendered);
    }
  }, [rendered, isBodyCustomized]);

  function handleTemplateSelect(id: string) {
    setSelectedId(id);
    setIsBodyCustomized(false);
  }

  function handleBodyChange(next: string) {
    setBodyDraft(next);
    setIsBodyCustomized(true);
  }

  function handleResetBody() {
    setIsBodyCustomized(false);
    setBodyDraft(rendered);
  }

  const documentBody = bodyDraft || rendered;

  const providerName = values.providerLegalName?.trim() || legal.defaults.providerLegalName;
  const counterpartyName = values.counterpartyName?.trim() ?? "";
  const baseName = `${slugify(template.title)}${counterpartyName ? `-${slugify(counterpartyName)}` : ""}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(documentBody);
      toast({ title: shell.copied, description: shell.copiedDesc });
    } catch {
      toast({ title: shell.copyFailed, description: shell.copyFailedDesc, variant: "destructive" });
    }
  }

  function handleDownloadText() {
    const blob = new Blob([documentBody], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    try {
      const { downloadLegalDocumentPdf } = await import("@/lib/operator-legal-pdf");
      downloadLegalDocumentPdf({
        title: template.title,
        body: documentBody,
        providerName,
        counterpartyName,
        providerLogoDataUrl: branding.providerLogoDataUrl,
        counterpartyLogoDataUrl: branding.counterpartyLogoDataUrl,
        language,
        fileName: `${baseName}.pdf`,
      });
    } catch {
      toast({ title: legal.pdfFailed, variant: "destructive" });
    }
  }

  function handleLogoError(message: string) {
    toast({ title: t.common.error, description: message, variant: "destructive" });
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Scale}
        title={legal.title}
        description={legal.description}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {shell.copy}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadText}>
              <Download className="mr-2 h-4 w-4" />
              {legal.downloadTxt}
            </Button>
            <Button size="sm" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              {legal.downloadPdf}
            </Button>
          </>
        }
      />

      <OperatorInternalBanner>{shell.notLegalAdvice}</OperatorInternalBanner>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">{legal.templates}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTemplateSelect(item.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                    item.id === selectedId
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-card/70",
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="flex min-w-0 items-start gap-2 text-sm font-medium text-foreground">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 break-words">{item.title}</span>
                    </span>
                    <Badge variant={CATEGORY_TONE[item.category]} className="shrink-0 whitespace-nowrap">
                      {getLegalCategoryLabel(item.category, t)}
                    </Badge>
                  </div>
                  <span className="text-xs leading-4 text-muted-foreground">{item.summary}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">{parties.title}</CardTitle>
              <CardDescription>{parties.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {partyFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`legal-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`legal-${field.key}`}
                    type="text"
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  />
                </div>
              ))}

              <OperatorLegalLogoField
                id="legal-provider-logo"
                label={parties.providerLogo}
                hint={parties.logoHint}
                value={branding.providerLogoDataUrl}
                onChange={(dataUrl) => setBranding((prev) => ({ ...prev, providerLogoDataUrl: dataUrl }))}
                uploadLabel={parties.uploadLogo}
                changeLabel={parties.changeLogo}
                removeLabel={parties.removeLogo}
                invalidTypeMessage={parties.logoInvalidType}
                tooLargeMessage={parties.logoTooLarge}
                onError={handleLogoError}
              />

              <OperatorLegalLogoField
                id="legal-counterparty-logo"
                label={parties.counterpartyLogo}
                hint={parties.logoHint}
                value={branding.counterpartyLogoDataUrl}
                onChange={(dataUrl) => setBranding((prev) => ({ ...prev, counterpartyLogoDataUrl: dataUrl }))}
                uploadLabel={parties.uploadLogo}
                changeLabel={parties.changeLogo}
                removeLabel={parties.removeLogo}
                invalidTypeMessage={parties.logoInvalidType}
                tooLargeMessage={parties.logoTooLarge}
                onError={handleLogoError}
              />
            </CardContent>
          </Card>

          {dealFields.length > 0 ? (
            <Card className={OPERATOR_CARD_CLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">{legal.dealDetails}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dealFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`legal-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`legal-${field.key}`}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={values[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <OperatorLegalDocumentPanel
          editTabLabel={legal.document.editTab}
          previewTabLabel={legal.document.previewTab}
          editTitle={legal.document.editTitle}
          editDescription={legal.document.editDescription}
          customizedHint={legal.document.customizedHint}
          resetLabel={legal.document.resetToTemplate}
          body={documentBody}
          onBodyChange={handleBodyChange}
          isCustomized={isBodyCustomized}
          onReset={handleResetBody}
          title={template.title}
          categoryLabel={getLegalCategoryLabel(template.category, t)}
          providerName={providerName}
          counterpartyName={counterpartyName}
          providerLogoDataUrl={branding.providerLogoDataUrl}
          counterpartyLogoDataUrl={branding.counterpartyLogoDataUrl}
          draftLabel={parties.draftFooter}
        />
      </div>
    </OperatorPageShell>
  );
}
