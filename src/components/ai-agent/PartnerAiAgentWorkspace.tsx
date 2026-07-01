import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  Globe,
  Loader2,
  MessageSquare,
  Sparkles,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Ai4TeamVoiceControls } from "@/components/ai-agent/Ai4TeamVoiceControls";
import { useLanguage } from "@/hooks/use-language";
import { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import { PARTNER_PORTAL_ROUTES } from "@/lib/partner-portal-routes";
import type { Ai4TRoleKey } from "@/lib/ai-4-t-role-prompts";
import { cn } from "@/lib/utils";

interface PartnerAiAgentWorkspaceProps {
  roleKey: Ai4TRoleKey;
  onSendToChat: (text: string) => void;
}

type PartnerActionId =
  | "listing"
  | "marketplace"
  | "messages"
  | "tasks"
  | "reports";

export function PartnerAiAgentWorkspace({ roleKey, onSendToChat }: PartnerAiAgentWorkspaceProps) {
  const { t, language } = useLanguage();
  const p = t.coTrainerPage.partnerAgent;
  const aiVoice = useAi4TeamVoice(language);
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);

  const actions = useMemo(
    () =>
      [
        {
          id: "listing" as PartnerActionId,
          icon: Globe,
          href: PARTNER_PORTAL_ROUTES.supplier_page,
          title: p.actionListingTitle,
          desc: p.actionListingDesc,
          prompt: p.actionListingPrompt,
        },
        {
          id: "marketplace" as PartnerActionId,
          icon: Store,
          href: PARTNER_PORTAL_ROUTES.marketplace,
          title: p.actionMarketplaceTitle,
          desc: p.actionMarketplaceDesc,
          prompt: p.actionMarketplacePrompt,
        },
        {
          id: "messages" as PartnerActionId,
          icon: MessageSquare,
          href: PARTNER_PORTAL_ROUTES.messages,
          title: p.actionMessagesTitle,
          desc: p.actionMessagesDesc,
          prompt: p.actionMessagesPrompt,
        },
        {
          id: "tasks" as PartnerActionId,
          icon: ClipboardList,
          href: PARTNER_PORTAL_ROUTES.tasks,
          title: p.actionTasksTitle,
          desc: p.actionTasksDesc,
          prompt: p.actionTasksPrompt,
        },
        {
          id: "reports" as PartnerActionId,
          icon: BarChart3,
          href: PARTNER_PORTAL_ROUTES.reports,
          title: p.actionReportsTitle,
          desc: p.actionReportsDesc,
          prompt: p.actionReportsPrompt,
        },
      ] as const,
    [p],
  );

  const runNl = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNlLoading(true);
    try {
      onSendToChat(trimmed);
      setNlInput("");
    } finally {
      setNlLoading(false);
    }
  };

  const quickPrompt =
    roleKey === "sponsor"
      ? p.quickSponsorPrompt
      : roleKey === "consultant"
        ? p.quickConsultantPrompt
        : roleKey === "service_provider"
          ? p.quickServicePrompt
          : p.quickSupplierPrompt;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative z-10 min-h-0 flex-1 space-y-6 overflow-y-auto">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-2xl">
          <div className="text-sm font-semibold text-foreground">{p.sectionQuickTitle}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">{p.sectionQuickDesc}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold">
                <Sparkles className="h-4 w-4" />
                {p.quickCopilotTitle}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.quickCopilotDesc}</p>
              <Button
                className="mt-3 bg-gradient-gold-static font-semibold text-primary-foreground"
                onClick={() => void runNl(quickPrompt)}
                disabled={nlLoading}
              >
                {nlLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {p.quickCopilotButton}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold">
                <Globe className="h-4 w-4" />
                {p.quickListingTitle}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.quickListingDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={PARTNER_PORTAL_ROUTES.supplier_page}>{p.openSupplierPage}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void runNl(p.actionListingPrompt)}
                  disabled={nlLoading}
                >
                  {p.draftWithAi}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{p.sectionWorkflowsTitle}</div>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{p.sectionWorkflowsDesc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {nlLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : null}
              <Ai4TeamVoiceControls
                disabled={nlLoading}
                voice={aiVoice}
                onVoiceCommand={(transcript) => void runNl(transcript)}
              />
            </div>
          </div>

          <div className="space-y-2" role="list" aria-label={p.sectionWorkflowsTitle}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  role="listitem"
                  className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-start"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="text-sm font-semibold text-foreground">{action.title}</div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{action.desc}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:pt-0.5">
                    <Button asChild size="sm" variant="outline">
                      <Link to={action.href}>{p.openPage}</Link>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void runNl(action.prompt)} disabled={nlLoading}>
                      {p.draftWithAi}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/50 bg-background/30 p-4 space-y-2">
            <div className="text-xs font-semibold text-foreground">{p.composerTitle}</div>
            <p className="text-[11px] text-muted-foreground">{p.composerHint}</p>
            <Textarea
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder={p.composerPlaceholder}
              rows={3}
              className="resize-y text-sm"
            />
            <Button
              size="sm"
              className="bg-gradient-gold-static font-semibold text-primary-foreground"
              disabled={!nlInput.trim() || nlLoading}
              onClick={() => void runNl(nlInput)}
            >
              {nlLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {p.composerSend}
            </Button>
          </div>
        </div>

        <p className={cn("text-center text-[11px] text-muted-foreground px-2")}>{p.footerNote}</p>
      </div>
    </div>
  );
}
