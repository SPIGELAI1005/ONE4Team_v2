import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  History,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ai4TWordmark } from "@/components/ai/Ai4TWordmark";
import { Ai4TBrand, BrandedText } from "@/components/ai/Ai4TBrand";
import { useLanguage } from "@/hooks/use-language";
import {
  AI4T_INTRO_ROLES,
  buildAi4TRoleQuickPrompts,
  getAi4TAssistantRoleName,
  type Ai4TRoleKey,
} from "@/lib/ai-4-t-role-prompts";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";
import { clubGlassPanelLgClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

export type Ai4TIntroSurface = "club" | "app";

interface Ai4TIntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surface?: Ai4TIntroSurface;
  clubName?: string;
  primaryColor?: string | null;
  isSignedIn?: boolean;
  onLaunch: (prompt?: string) => void;
}

const FEATURE_IDS = ["chat", "agent", "plans", "context", "workflows", "history"] as const;
type FeatureId = (typeof FEATURE_IDS)[number];

const FEATURE_ICONS: Record<FeatureId, typeof MessageSquare> = {
  chat: MessageSquare,
  agent: Sparkles,
  plans: ClipboardList,
  context: Building2,
  workflows: ShieldCheck,
  history: History,
};

export function Ai4TIntroModal({
  open,
  onOpenChange,
  surface = "club",
  clubName,
  primaryColor,
  isSignedIn = false,
  onLaunch,
}: Ai4TIntroModalProps) {
  const { t, language } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<Ai4TRoleKey>("trainer");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const isClub = surface === "club";
  const intro = t.ai4tIntro;

  const rolePrompts = useMemo(
    () => buildAi4TRoleQuickPrompts(selectedRole, language),
    [selectedRole, language],
  );

  const assistantName = getAi4TAssistantRoleName(selectedRole);

  useEffect(() => {
    if (!open) {
      setSelectedPrompt(null);
      setSelectedRole("trainer");
    }
  }, [open]);

  useEffect(() => {
    setSelectedPrompt(null);
  }, [selectedRole]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const panelClass = isClub
    ? clubGlassPanelLgClass
    : "rounded-3xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-2xl";

  const fg = isClub ? "text-[color:var(--club-foreground)]" : "text-foreground";
  const muted = isClub ? "text-[color:var(--club-muted)]" : "text-muted-foreground";
  const border = isClub ? "border-[color:var(--club-border)]" : "border-border/60";
  const chipIdle = isClub
    ? "border-2 border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)] hover:bg-white/10"
    : "border-2 border-border/60 bg-background/50 text-foreground hover:bg-muted/40";
  const chipActive = isClub
    ? "border-2 border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
    : "border-2 border-primary/40 bg-primary/10 text-foreground";
  const promptCard = isClub
    ? "border-[color:var(--club-border)] bg-white/5 hover:border-[color:var(--club-primary)]/40 hover:bg-white/10"
    : "border-border/60 bg-background/60 hover:border-primary/30 hover:bg-primary/5";
  const promptSelected = isClub
    ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/10 ring-1 ring-[color:var(--club-primary)]/35"
    : "border-primary/40 bg-primary/10 ring-1 ring-primary/25";
  const featureCard = isClub
    ? "border-[color:var(--club-border)] bg-white/5"
    : "border-border/60 bg-background/40";

  const launchLabel = selectedPrompt
    ? surface === "app"
      ? intro.launchWithPromptInApp
      : intro.launchWithPrompt
    : surface === "app"
      ? intro.launchInApp
      : isSignedIn
        ? intro.launchSignedIn
        : intro.launchSignedOut;

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => onOpenChange(false)}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai4t-intro-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden sm:max-w-3xl lg:max-w-4xl",
              panelClass,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn("shrink-0 border-b px-5 py-4 sm:px-6", border)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {isClub ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <Ai4TWordmark id="ai4t-intro-title" className="h-10 w-auto shrink-0 max-w-[min(42vw,180px)] sm:h-11 sm:max-w-[200px]" />
                      <p className={cn("min-w-0 text-sm leading-snug", muted)}>
                        {clubName ? intro.subtitleForClub.replace("{club}", clubName) : intro.subtitle}
                      </p>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <h2 id="ai4t-intro-title" className={cn("text-lg font-semibold tracking-tight sm:text-xl", fg)}>
                        <Ai4TBrand />
                      </h2>
                      <p className={cn("mt-0.5 text-sm leading-snug", muted)}>
                        {clubName ? intro.subtitleForClub.replace("{club}", clubName) : intro.subtitle}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("shrink-0", fg)}
                  onClick={() => onOpenChange(false)}
                  aria-label={intro.close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <p className={cn("text-sm leading-relaxed", muted)}>
                <BrandedText text={intro.overview} />
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FEATURE_IDS.map((id) => {
                  const Icon = FEATURE_ICONS[id];
                  const feature = intro.features[id];
                  return (
                    <div
                      key={id}
                      className={cn("rounded-2xl border p-3", featureCard)}
                    >
                      <div
                        className={cn(
                          "mb-2 flex h-8 w-8 items-center justify-center rounded-xl",
                          isClub
                            ? "bg-[color:var(--club-primary)]/15 text-[color:var(--club-primary)]"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className={cn("text-xs font-semibold", fg)}>{feature.title}</div>
                      <p className={cn("mt-1 text-[11px] leading-snug", muted)}>{feature.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={cn("text-sm font-semibold", fg)}>{intro.examplePromptsTitle}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                      isClub
                        ? "border border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-muted)]"
                        : "border border-border/60 bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {assistantName}
                  </span>
                </div>
                <p className={cn("mt-1 text-xs", muted)}>{intro.examplePromptsHint}</p>

                <div className="mt-3 flex gap-1.5 overflow-x-auto px-0.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {AI4T_INTRO_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        "box-border shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedRole === role ? chipActive : chipIdle,
                      )}
                    >
                      {intro.roles[role]}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {rolePrompts.map((qp) => {
                    const isSelected = selectedPrompt === qp.prompt;
                    return (
                      <button
                        key={qp.label}
                        type="button"
                        onClick={() => setSelectedPrompt(isSelected ? null : qp.prompt)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          promptCard,
                          isSelected && promptSelected,
                        )}
                      >
                        <div className={cn("text-xs font-semibold", fg)}>{qp.label}</div>
                        <p className={cn("mt-1 line-clamp-2 text-[11px] leading-snug", muted)}>{qp.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className={cn("mt-4 text-[11px] leading-relaxed", muted)}>{intro.scopeNote}</p>
            </div>

            <div className={cn("shrink-0 border-t px-5 py-4 sm:px-6", border)}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={cn("text-xs", muted)}>
                  {isSignedIn ? <BrandedText text={intro.footerSignedIn} /> : <BrandedText text={intro.footerSignedOut} />}
                </p>
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "w-full font-semibold sm:w-auto sm:min-w-[200px]",
                    isClub && clubCtaFillHoverClass,
                  )}
                  style={isClub ? clubCtaPrimaryInlineStyle(primaryColor) : undefined}
                  onClick={() => {
                    onLaunch(selectedPrompt ?? undefined);
                    onOpenChange(false);
                  }}
                >
                  <BrandedText text={launchLabel} />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
