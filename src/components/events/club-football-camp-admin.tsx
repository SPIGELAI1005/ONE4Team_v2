import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  publishAllClubCampTemplates,
  upsertClubCampFromTemplate,
  type ClubCampEventRow,
} from "@/lib/club-football-camp-api";
import { CLUB_FOOTBALL_CAMP_TEMPLATES } from "@/lib/club-football-camp-templates";

interface ClubFootballCampAdminProps {
  clubId: string;
  userId: string;
  publishedKeys: Set<string>;
  onPublished: (rows: ClubCampEventRow[]) => void;
}

export function ClubFootballCampAdmin({ clubId, userId, publishedKeys, onPublished }: ClubFootballCampAdminProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const copy = t.clubFootballCamps;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  async function publishOne(importKey: string) {
    const template = CLUB_FOOTBALL_CAMP_TEMPLATES.find((row) => row.importKey === importKey);
    if (!template) return;
    setBusyKey(importKey);
    try {
      const row = await upsertClubCampFromTemplate({
        clubId,
        createdBy: userId,
        template,
        language: language === "de" ? "de" : "en",
      });
      onPublished([row]);
      toast({ title: copy.toastPublished, description: row.title });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  }

  async function publishAll() {
    setBusyAll(true);
    try {
      const rows = await publishAllClubCampTemplates({
        clubId,
        createdBy: userId,
        language: language === "de" ? "de" : "en",
      });
      onPublished(rows);
      toast({ title: copy.toastPublishedAll, description: `${rows.length} ${copy.campsLabel}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#16a34a]">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.adminBadge}
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">{copy.adminTitle}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.adminLead}</p>
        </div>
        <Button
          size="sm"
          disabled={busyAll}
          className="shrink-0 bg-[#00E676] text-[#14532d] hover:brightness-105"
          onClick={() => void publishAll()}
        >
          {busyAll ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          {copy.publishAll}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {CLUB_FOOTBALL_CAMP_TEMPLATES.map((template) => {
          const isPublished = publishedKeys.has(template.importKey);
          const title = language === "de" ? template.titleDe : template.titleEn;
          const summary = language === "de" ? template.publicSummaryDe : template.publicSummaryEn;
          return (
            <div
              key={template.importKey}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4"
            >
              <div className="overflow-hidden rounded-xl ring-1 ring-border/60">
                <img src={template.imagePath} alt="" className="aspect-[4/3] w-full object-cover object-top" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
                {isPublished ? (
                  <p className="mt-2 text-[11px] font-medium text-[#16a34a]">{copy.alreadyPublished}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant={isPublished ? "outline" : "default"}
                disabled={busyKey === template.importKey || busyAll}
                className={!isPublished ? "bg-gradient-gold-static text-primary-foreground hover:brightness-110" : undefined}
                onClick={() => void publishOne(template.importKey)}
              >
                {busyKey === template.importKey ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {isPublished ? copy.republish : copy.publishOne}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">{copy.adminFootnote}</p>
    </section>
  );
}
