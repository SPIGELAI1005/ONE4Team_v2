import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy } from "lucide-react";

const DEFAULT_SUPPORT_EMAIL = "spigelai@gmail.com";
const MAILTO_SAFE_LEN = 1700;

const REPORT_TOPIC_ORDER = [
  "account",
  "members",
  "teams",
  "matches",
  "schedule",
  "communication",
  "billing",
  "partners",
  "one4ai",
  "clubPage",
  "shop",
  "settings",
  "other",
] as const;

type ReportTopicId = (typeof REPORT_TOPIC_ORDER)[number];

function supportEmail(): string {
  const v = import.meta.env.VITE_SUPPORT_EMAIL;
  return typeof v === "string" && v.trim() ? v.trim() : DEFAULT_SUPPORT_EMAIL;
}

function buildReportBody(params: {
  topicLabel: string;
  details: string;
  userEmail: string | null;
  clubName: string | null;
  language: string;
  origin: string;
  truncatedNote: string;
}): string {
  const lines = [
    `Topic: ${params.topicLabel}`,
    "",
    params.details.trim(),
    "",
    "---",
    `User: ${params.userEmail ?? "(not signed in)"}`,
    `Club: ${params.clubName ?? "(none selected)"}`,
    `Language: ${params.language}`,
    `App: ${params.origin}`,
  ];
  let body = lines.join("\n");
  if (body.length > MAILTO_SAFE_LEN) {
    body = body.slice(0, MAILTO_SAFE_LEN - params.truncatedNote.length) + params.truncatedNote;
  }
  return body;
}

export default function SupportFaq() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { activeClub } = useActiveClub();
  const { toast } = useToast();
  const p = t.supportPage;

  const [topic, setTopic] = useState<ReportTopicId | "">("");
  const [details, setDetails] = useState("");

  const topicLabels = p.report.topics as Record<string, string>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const mailtoHref = useMemo(() => {
    if (!topic) return "";
    const topicLabel = topicLabels[topic] ?? topic;
    const subject = encodeURIComponent(`[ONE4Team] ${topicLabel}`);
    const body = encodeURIComponent(
      buildReportBody({
        topicLabel,
        details: details.trim() || "(no details)",
        userEmail: user?.email ?? null,
        clubName: activeClub?.name ?? null,
        language,
        origin,
        truncatedNote: p.report.bodyTruncatedNote,
      }),
    );
    return `mailto:${supportEmail()}?subject=${subject}&body=${body}`;
  }, [topic, details, user?.email, activeClub?.name, language, origin, topicLabels, p.report.bodyTruncatedNote]);

  const openMailto = useCallback(() => {
    if (!topic) {
      toast({ title: p.report.topicPrompt, variant: "destructive" });
      return;
    }
    if (!details.trim()) {
      toast({ title: p.report.validationDetails, variant: "destructive" });
      return;
    }
    window.location.href = mailtoHref;
  }, [topic, details, mailtoHref, toast, p.report]);

  const openSimpleMailto = useCallback(() => {
    const href = `mailto:${supportEmail()}`;
    window.location.href = href;
  }, []);

  const copySupport = useCallback(() => {
    void navigator.clipboard.writeText(supportEmail());
    toast({ title: p.report.copied });
  }, [toast, p.report.copied]);

  const dashRole =
    typeof window !== "undefined"
      ? localStorage.getItem("one4team.activeRole") || localStorage.getItem("one4team_role") || "admin"
      : "admin";
  const dashboardTo = `/dashboard/${dashRole}`;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <DashboardHeaderSlot title={p.title} subtitle={p.subtitle} />

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-8">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {p.intro}{" "}
          <a
            href="#report"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {p.reportLinkLabel}
          </a>
          .
        </p>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-lg font-semibold text-foreground mb-4">
            {p.faqHeading}
          </h2>
          <div className="space-y-6">
            {p.categories.map((cat, ci) => (
              <div
                key={ci}
                className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 sm:p-5"
              >
                <h3 className="font-display text-sm font-semibold text-foreground mb-2">
                  {cat.title}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {cat.faqs.map((faq, fi) => (
                    <AccordionItem key={fi} value={`${ci}-${fi}`} className="border-border/60">
                      <AccordionTrigger className="text-left text-sm hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>

        <section
          id="report"
          className="scroll-mt-24 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 sm:p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">{p.report.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">{p.report.privacyNote}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-topic">{p.report.topicLabel}</Label>
            <Select
              value={topic || undefined}
              onValueChange={(v) => setTopic(v as ReportTopicId)}
            >
              <SelectTrigger id="support-topic" className="rounded-xl border-border bg-background">
                <SelectValue placeholder={p.report.topicPrompt} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TOPIC_ORDER.map((id) => (
                  <SelectItem key={id} value={id}>
                    {topicLabels[id] ?? id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-details">{p.report.detailsLabel}</Label>
            <Textarea
              id="support-details"
              rows={5}
              className="rounded-xl border-border bg-background resize-y min-h-[120px]"
              placeholder={p.report.detailsPlaceholder}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap">
            <Button
              type="button"
              className="rounded-xl bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={openMailto}
            >
              <Mail className="w-4 h-4 mr-2" />
              {p.report.openEmailApp}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={openSimpleMailto}>
              {p.report.simpleEmail}
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl" onClick={copySupport}>
              <Copy className="w-4 h-4 mr-2" />
              {p.report.copyAddress}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-mono">{supportEmail()}</span>
          </p>
        </section>

        <p className="text-xs text-muted-foreground text-center pb-4">
          <Link to="/settings" className="text-primary hover:underline">
            {t.sidebar.settings}
          </Link>
          {" · "}
          <Link to={dashboardTo} className="text-primary hover:underline">
            {t.sidebar.dashboard}
          </Link>
        </p>
      </div>
    </div>
  );
}
