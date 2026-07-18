import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Check, X as XIcon, ArrowRight, Sparkles, Crown, Rocket, Shield,
  Users, Calendar, Trophy, CreditCard, MessageSquare, Bot, BarChart3,
  Globe, ShoppingBag, Briefcase, Zap, Calculator, ChevronDown, Gift, HardDrive,
  Copy, CheckCheck, BadgeCheck, ListOrdered, ClipboardList, KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { correlationHeaders } from "@/lib/observability";
import { cn } from "@/lib/utils";
import { getStripe, isValidPlanId } from "@/lib/stripe";
import {
  PLAN_CATALOG,
  calculateCatalogPrice,
  suggestPlanForMemberCount,
  formatPlanMarketingLimits,
  storageMbToGbLabel,
  FOUNDING_CLUB_OFFER_CODE,
  type PlanCommercialConfig,
} from "@/lib/plan-catalog";
import { COMPARISON_ROWS, resolveComparisonValue, type ComparisonValue } from "@/lib/plan-comparison";
import type { PlanId } from "@/lib/stripe";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import { Ai4TIntroLogoVideo } from "@/components/ai/Ai4TIntroLogoVideo";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { FoundingClubBadge } from "@/components/billing/FoundingClubBadge";
import logo from "@/assets/one4team-logo.png";

const BESPOKE_CONSULTATION_EMAIL = "contact@one4team.com";

function buildBespokeConsultationMailto(subject: string, body: string, replyEmail?: string | null): string {
  let preparedBody = body;
  if (replyEmail && preparedBody.includes("Email:\n")) {
    preparedBody = preparedBody.replace("Email:\n", `Email: ${replyEmail}\n`);
  } else if (replyEmail && preparedBody.includes("E-Mail:\n")) {
    preparedBody = preparedBody.replace("E-Mail:\n", `E-Mail: ${replyEmail}\n`);
  }
  return `mailto:${BESPOKE_CONSULTATION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedBody)}`;
}

function openBespokeConsultationEmail(subject: string, body: string, replyEmail?: string | null) {
  window.location.href = buildBespokeConsultationMailto(subject, body, replyEmail);
}

/* ─── Pricing Data ─── */
interface PlanConfig {
  id: string;
  name: string;
  /** Letter/number mark shown on the price-card logo badge (TEAM → T E A M, Bespoke → 1). */
  iconMark: string;
  description: string;
  basePrice: { yearly: number; monthly: number };
  memberPrice: { yearly: number; monthly: number };
  discountThreshold: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

function planFromCatalog(
  catalog: PlanCommercialConfig,
  extras: Pick<PlanConfig, "name" | "iconMark" | "description" | "features" | "highlighted" | "badge">,
): PlanConfig {
  return {
    id: catalog.id,
    basePrice: catalog.basePrice,
    memberPrice: catalog.memberPrice,
    discountThreshold: catalog.discountThreshold,
    ...extras,
  };
}

function calculatePrice(plan: PlanConfig, memberCount: number, billing: "yearly" | "monthly") {
  if (!isValidPlanId(plan.id) || plan.id === "bespoke") {
    return { total: -1, base: 0, memberCost: 0, discount: false, discountPct: 0 };
  }
  return calculateCatalogPrice(plan.id, memberCount, billing);
}

/* ─── Founding Club Banner + terms / details modals ─── */
function useFoundingOfferCodeCopy(copy: {
  foundingTermsCopiedTitle?: string;
  foundingTermsCopyFailedTitle?: string;
  foundingTermsCopyFailedDesc?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyOfferCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FOUNDING_CLUB_OFFER_CODE);
      setCopied(true);
      toast({
        title: copy.foundingTermsCopiedTitle ?? "Offer code copied",
        description: FOUNDING_CLUB_OFFER_CODE,
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: copy.foundingTermsCopyFailedTitle ?? "Could not copy",
        description: copy.foundingTermsCopyFailedDesc ?? "Select the code and copy it manually.",
        variant: "destructive",
      });
    }
  }, [copy.foundingTermsCopiedTitle, copy.foundingTermsCopyFailedTitle, copy.foundingTermsCopyFailedDesc, toast]);

  return { copied, copyOfferCode };
}

function FoundingOfferDialogShell({
  triggerLabel,
  headline,
  lead,
  children,
  ctaLabel,
}: {
  triggerLabel: string;
  headline: string;
  lead: string;
  children: ReactNode;
  ctaLabel: string;
}) {
  const { t } = useLanguage();
  const copy = t.pricingPage;
  const { copied, copyOfferCode } = useFoundingOfferCodeCopy(copy);
  const offerLabel = (copy.foundingTermsOfferCodeLabel ?? "Offer code").replace(/:?\s*$/, "");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-xs sm:text-sm underline underline-offset-2 font-medium">
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(94vh,960px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden",
          "border-border/60 bg-background p-0 shadow-2xl sm:rounded-2xl",
        )}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-border/40 px-5 pb-4 pt-6 sm:px-7 sm:pb-5 sm:pt-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.16),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.07),transparent_50%)]"
          />
          <DialogHeader className="relative space-y-2.5 text-left">
            <FoundingClubBadge label={copy.foundingClubBadge ?? "Founding Club"} />
            <DialogTitle className="font-display text-[1.55rem] sm:text-[1.85rem] font-bold tracking-tight text-foreground leading-[1.15]">
              {headline}
            </DialogTitle>
            <DialogDescription className="text-[15px] sm:text-base leading-relaxed text-muted-foreground">
              {lead}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5">
          {children}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border/40 bg-muted/20 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={() => { void copyOfferCode(); }}
            className="founding-offer-code group"
            aria-label={`${offerLabel} ${FOUNDING_CLUB_OFFER_CODE}. ${copy.foundingTermsCopyHint ?? "Click to copy"}`}
          >
            <span className="founding-offer-code-label">{offerLabel}</span>
            <span className="founding-offer-code-value">{FOUNDING_CLUB_OFFER_CODE}</span>
            <span className="founding-offer-code-action">
              {copied ? (
                <CheckCheck className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              )}
              <span>
                {copied
                  ? (copy.foundingTermsCopiedShort ?? "Copied")
                  : (copy.foundingTermsCopyShort ?? "Copy")}
              </span>
            </span>
          </button>
          <DialogClose asChild>
            <a
              href="#plans"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-gold-static px-5 text-base sm:text-[1.05rem] font-semibold text-primary-foreground shadow-gold transition hover:brightness-110"
            >
              {ctaLabel}
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FoundingClubTermsDialog() {
  const { t, language } = useLanguage();
  const copy = t.pricingPage;
  const kickoff = PLAN_CATALOG.kickoff;

  const benefits = [
    {
      icon: Gift,
      title: copy.foundingTermsBenefitFreeTitle ?? "12 months free",
      body: copy.foundingTermsBenefitFreeBody ?? "Your first Kick-off season is on us.",
    },
    {
      icon: CreditCard,
      title: copy.foundingTermsBenefitCardTitle ?? "No credit card",
      body: copy.foundingTermsBenefitCardBody ?? "Start now. Pay nothing to claim the offer.",
    },
    {
      icon: Shield,
      title: copy.foundingTermsBenefitOpsTitle ?? "Real club ops",
      body: copy.foundingTermsBenefitOpsBody ?? "Members, teams, tasks, dues, shop and more included.",
    },
  ] as const;

  const limits = [
    {
      icon: Users,
      label: copy.foundingTermsLimitMembers ?? "Member profiles",
      value: kickoff.maxMembers.toLocaleString(language === "de" ? "de-DE" : "en-US"),
    },
    {
      icon: Trophy,
      label: copy.foundingTermsLimitTeams ?? "Teams",
      value: String(kickoff.maxTeams),
    },
    {
      icon: Shield,
      label: copy.foundingTermsLimitAdmins ?? "Admins",
      value: String(kickoff.maxAdmins),
    },
    {
      icon: HardDrive,
      label: copy.foundingTermsLimitStorage ?? "Storage",
      value: storageMbToGbLabel(kickoff.maxStorageMb),
    },
  ] as const;

  return (
    <FoundingOfferDialogShell
      triggerLabel={copy.viewOfferTerms ?? "Offer terms"}
      headline={copy.foundingTermsHeadline ?? "Your first season is on us."}
      lead={
        copy.foundingTermsLead ??
        "Join the Founding Club status and run Kick-off free for a full year while you build your digital club home."
      }
      ctaLabel={copy.foundingTermsCta ?? "Claim your free season"}
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="flex h-full flex-col rounded-xl border border-border/60 bg-card/80 p-3.5"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold-subtle">
              <item.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
            <p className="mt-1.5 text-[13px] sm:text-sm leading-snug text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
        <p className="mb-3 text-center text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-left">
          {copy.foundingTermsPackageLabel ?? "Included Kick-off package"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {limits.map((limit) => (
            <div
              key={limit.label}
              className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/80 px-2 py-3 text-center"
            >
              <limit.icon className="mb-1.5 h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="font-display text-xl font-bold tabular-nums leading-none text-foreground">
                {limit.value}
              </p>
              <p className="mt-2 text-xs sm:text-[13px] leading-tight text-muted-foreground">
                {limit.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.foundingTermsAfterLabel ?? "After your free season"}
        </p>
        <ul className="space-y-2.5">
          {[
            copy.foundingTermsAfterGrace ??
              "A 30-day read-only grace period keeps your data safe while you decide.",
            copy.foundingTermsAfterContinue ??
              "Continue on Kick-off, Squad, Pro or Champions whenever you are ready. Your club history stays intact.",
            copy.foundingTermsAfterChat ??
              "Club chat unlocks on paid Kick-off and every higher package.",
            copy.foundingTermsAfterStatus ??
              "Your Founding Club status stays with you: VIP support, early access to every new feature before wider release, and a privileged path toward bespoke club customisation.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm sm:text-[15px] leading-snug text-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </FoundingOfferDialogShell>
  );
}

function FoundingClubOfferDetailsDialog() {
  const { t } = useLanguage();
  const copy = t.pricingPage;

  const benefitCards = [
    {
      icon: Gift,
      title: copy.foundingDetailsBenefitSeasonTitle ?? "A full year of Kick-off, free",
      body:
        copy.foundingDetailsBenefitSeasonBody ??
        "Run members, teams, schedule, attendance, tasks, dues tracking, partners, marketplace and your public club page for twelve months at EUR 0.",
    },
    {
      icon: Zap,
      title: copy.foundingDetailsBenefitStartTitle ?? "Zero friction to start",
      body:
        copy.foundingDetailsBenefitStartBody ??
        "No credit card. No automatic renewal. Claim during onboarding and go live the same day.",
    },
    {
      icon: Crown,
      title: copy.foundingDetailsBenefitStatusTitle ?? "Founding Club status that lasts",
      body:
        copy.foundingDetailsBenefitStatusBody ??
        "VIP support, early access to new features before wider release, and a privileged path to bespoke customisation after your free season.",
    },
    {
      icon: Sparkles,
      title: copy.foundingDetailsBenefitOpsTitle ?? "Real operations from day one",
      body:
        copy.foundingDetailsBenefitOpsBody ??
        "Not a demo sandbox. Your data, history and workflows stay with you when you choose a paid package.",
    },
  ] as const;

  const prerequisites = [
    copy.foundingDetailsPrereqNew ??
      "You are creating a new club on ONE4Team for the first time.",
    copy.foundingDetailsPrereqOnce ??
      "One redemption per club while Founding Club places remain available.",
    copy.foundingDetailsPrereqKickoff ??
      "The offer applies to the Kick-off package and its catalogue limits.",
  ];

  const steps = [
    {
      icon: Rocket,
      title: copy.foundingDetailsStep1Title ?? "Start from Pricing",
      body:
        copy.foundingDetailsStep1Body ??
        "Choose Kick-off and tap “Start your free season”. You are taken into onboarding with the Founding Club offer attached.",
    },
    {
      icon: Users,
      title: copy.foundingDetailsStep2Title ?? "Create your club",
      body:
        copy.foundingDetailsStep2Body ??
        "Complete club setup as admin. The offer is redeemed automatically after your club is created. No payment step.",
    },
    {
      icon: KeyRound,
      title: copy.foundingDetailsStep3Title ?? "Activate and invite",
      body:
        copy.foundingDetailsStep3Body ??
        "Confirm your free season is active, invite members and teams, and start running day-to-day club operations immediately.",
    },
  ] as const;

  const conditions = [
    copy.foundingDetailsConditionPrice ??
      "EUR 0 for 12 months. No payment method required and no automatic paid renewal.",
    copy.foundingDetailsConditionChat ??
      "Promotional Kick-off includes announcements. Full club chat unlocks on paid Kick-off or any higher package.",
    copy.foundingDetailsConditionGrace ??
      "After the free season, a 30-day read-only grace period protects your data while you decide how to continue.",
    copy.foundingDetailsConditionContinue ??
      "Paid continuation requires an explicit plan choice on Pricing (Kick-off, Squad, Pro, Champions or Bespoke).",
    copy.foundingDetailsConditionLimited ??
      "Places are limited. ONE4Team may close or adjust the programme; Operator terms prevail if stated otherwise.",
  ];

  return (
    <FoundingOfferDialogShell
      triggerLabel={copy.viewOfferDetails ?? "View offer details"}
      headline={copy.foundingDetailsHeadline ?? "Become a Founding Club."}
      lead={
        copy.foundingDetailsLead ??
        "Digitise your club for a full season at no cost, keep Founding Club privileges, and build the operating system your teams already need."
      }
      ctaLabel={copy.foundingDetailsCta ?? copy.foundingTermsCta ?? "Claim your free season"}
    >
      {/* Benefits */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.foundingDetailsBenefitsLabel ?? "Why clubs claim this offer"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          {benefitCards.map((item) => (
            <div
              key={item.title}
              className="flex h-full flex-col rounded-xl border border-border/60 bg-card/80 p-3.5 sm:p-4"
            >
              <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold-subtle">
                <item.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>
              <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug">{item.title}</p>
              <p className="mt-1.5 text-[13px] sm:text-sm leading-snug text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prerequisites */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.foundingDetailsPrereqLabel ?? "Prerequisites"}
          </p>
        </div>
        <ul className="space-y-2.5 rounded-2xl border border-border/60 bg-muted/25 p-4">
          {prerequisites.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm sm:text-[15px] leading-snug text-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How to apply */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.foundingDetailsHowLabel ?? "How to apply"}
          </p>
        </div>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-xl border border-border/60 bg-card/80 p-3.5 sm:p-4"
            >
              <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-gold text-primary-foreground shadow-gold">
                <span className="font-display text-sm font-bold leading-none">{index + 1}</span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug flex items-center gap-2">
                  <step.icon className="h-3.5 w-3.5 text-primary shrink-0 hidden sm:inline" strokeWidth={2} />
                  {step.title}
                </p>
                <p className="mt-1.5 text-[13px] sm:text-sm leading-snug text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[13px] sm:text-sm leading-snug text-muted-foreground">
          {copy.foundingDetailsHowCodeHint ??
            "Prefer to keep the code handy? Copy the offer code below and use Kick-off onboarding with the Founding Club offer attached."}
        </p>
      </section>

      {/* Conditions */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.foundingDetailsConditionsLabel ?? "Conditions"}
          </p>
        </div>
        <ul className="space-y-2.5">
          {conditions.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm sm:text-[15px] leading-snug text-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </FoundingOfferDialogShell>
  );
}

function PromoBanner() {
  const { t } = useLanguage();
  return (
    <div className="founding-promo-banner fixed top-14 left-0 right-0 z-40">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1 px-3 py-2 sm:flex sm:items-center sm:justify-center sm:gap-x-4 sm:px-4 sm:py-2.5">
        <span className="founding-promo-banner-pill col-start-1 row-start-1 shrink-0">
          {t.pricingPage.kickoffFreeBadge ?? "12 MONTHS FREE"}
        </span>
        <span className="founding-promo-banner-copy col-start-2 row-start-1 font-bold tracking-tight">
          <span className="founding-promo-banner-copy-mobile sm:hidden">
            <span>
              {t.pricingPage.foundingBannerMobileLine1 ?? "Your first season is on us."}
            </span>
            <span>
              {t.pricingPage.foundingBannerMobileLine2 ??
                "Eligible new clubs receive Kick-off free for 12 months."}
            </span>
          </span>
          <span className="hidden sm:inline">
            {t.pricingPage.foundingBanner ??
              "Your first season is on us. Eligible new clubs receive Kick-off free for 12 months."}
          </span>
        </span>
        <div className="founding-promo-banner-links col-start-1 row-start-2 flex items-center gap-2.5 text-xs whitespace-nowrap sm:gap-4 sm:text-sm">
          <FoundingClubTermsDialog />
          <FoundingClubOfferDetailsDialog />
        </div>
      </div>
    </div>
  );
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ target, suffix = "", duration = 2000, prefix = "" }: { target: number; suffix?: string; duration?: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(counterRef, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return <span ref={counterRef}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Fade In Wrapper ─── */
function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Pricing Card ─── */
function PricingCard({ plan, billing, memberCount }: { plan: PlanConfig; billing: "yearly" | "monthly"; memberCount: number }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();
  const isBespoke = plan.id === "bespoke";

  async function handlePlanAction() {
    if (isBespoke) {
      openBespokeConsultationEmail(
        t.pricingPage.bespokeMailtoSubject ?? "ONE4Team Bespoke consultation request",
        t.pricingPage.bespokeMailtoBody ??
          "Dear ONE4Team team,\n\nI would like to request a consultation for a Bespoke / Enterprise package.\n",
        user?.email ?? null,
      );
      return;
    }

    // Founding Club Kick-off: never open Stripe; redeem after club creation.
    if (plan.id === "kickoff") {
      navigate(`/onboarding?plan=kickoff&offer=${encodeURIComponent(FOUNDING_CLUB_OFFER_CODE)}`);
      return;
    }

    if (user && clubId) {
      try {
        const { data, error } = await supabaseDynamic.functions.invoke("stripe-checkout", {
          headers: correlationHeaders(),
          body: {
            action: "create-checkout",
            clubId,
            planId: plan.id,
            billingCycle: billing,
            memberCount,
            successUrl: `${window.location.origin}/dashboard/admin?checkout=success`,
            cancelUrl: `${window.location.origin}/pricing?checkout=canceled`,
          },
        });

        if (error) {
          toast({
            title: t.pricingPage.checkoutFailedTitle ?? "Checkout failed",
            description:
              (typeof error === "object" && error && "message" in error
                ? String((error as { message?: string }).message)
                : String(error)) ||
              (t.pricingPage.checkoutFailedDesc ?? "Stripe could not start. Your plan was not changed. Please retry."),
            variant: "destructive",
          });
          return;
        }
        const result = data as { url?: string; sessionId?: string; error?: string } | null;

        if (result?.error) {
          toast({
            title: t.pricingPage.checkoutFailedTitle ?? "Checkout failed",
            description: result.error,
            variant: "destructive",
          });
          return;
        }

        if (result?.url) {
          window.location.href = result.url;
          return;
        }

        if (result?.sessionId) {
          const stripe = await getStripe();
          if (stripe) {
            await stripe.redirectToCheckout({ sessionId: result.sessionId });
            return;
          }
        }

        toast({
          title: t.pricingPage.checkoutFailedTitle ?? "Checkout failed",
          description: t.pricingPage.checkoutFailedDesc ?? "No Stripe session returned. Please retry.",
          variant: "destructive",
        });
      } catch (err) {
        toast({
          title: t.pricingPage.checkoutFailedTitle ?? "Checkout failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
      return;
    }

    navigate(`/onboarding?plan=${plan.id}&members=${memberCount}&billing=${billing}`);
  }

  if (isBespoke) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group relative glass-card rounded-2xl border border-primary/35 shadow-gold p-5 sm:p-8 pt-7 sm:pt-9 transition-all duration-300 cursor-default"
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.10] via-transparent to-primary/[0.05] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        {plan.badge ? (
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center justify-center rounded-full px-[0.7rem] py-[0.28rem] text-[0.65rem] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap bg-gradient-gold text-primary-foreground shadow-gold">
            {plan.badge}
          </div>
        ) : null}

        <div className="relative grid gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
          <div className="flex flex-col min-w-0">
            <div className="mb-3 sm:mb-4">
              <div className="relative mb-3 h-12 w-12 sm:h-14 sm:w-14">
                <img
                  src={logo}
                  alt="ONE4Team"
                  className="h-full w-full rounded-full object-contain"
                />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-gold shadow-gold ring-2 ring-background">
                  <span className="font-display text-xs sm:text-sm font-extrabold leading-none text-primary-foreground">
                    {plan.iconMark}
                  </span>
                </div>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-gradient-gold">
                {plan.name}
              </h3>
            </div>

            <p className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
              <BrandedText text={plan.description} ai4tOnly />
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 md:border-l md:border-border/40 md:pl-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-snug">
                  <BrandedText text={feature} ai4tOnly />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-8 sm:mt-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-end">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t.pricingPage.custom}
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-snug max-w-md">
              {t.pricingPage.bespokePricingHint ?? "Tailored pricing for federations and complex organisations."}
            </div>
          </div>
          <div className="md:border-l md:border-transparent md:pl-8">
            <Button
              onClick={() => { void handlePlanAction(); }}
              className="w-full sm:w-auto rounded-xl font-semibold text-sm bg-gradient-gold text-primary-foreground hover:brightness-110 shadow-gold"
            >
              {t.pricingPage.contactUs}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative glass-card rounded-2xl p-4 sm:p-5 flex flex-col h-full transition-all duration-300 cursor-default ${
        plan.highlighted ? "border-primary/40 shadow-gold" : "hover:border-primary/20"
      }`}
    >
      {plan.badge && (
        <div
          className={
            plan.id === "kickoff"
              ? "founding-promo-banner-pill absolute -top-3 left-1/2 z-10 -translate-x-1/2"
              : "absolute -top-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center justify-center rounded-full px-[0.7rem] py-[0.28rem] text-[0.65rem] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap bg-gradient-gold-static text-primary-foreground shadow-gold"
          }
        >
          {plan.badge}
        </div>
      )}

      {/* Header: ONE4Team logo + plan icon badge + name */}
      <div className="shrink-0 mb-2">
        <div className="relative mb-3 h-10 w-10 sm:h-12 sm:w-12">
          <img
            src={logo}
            alt="ONE4Team"
            className="h-full w-full rounded-full object-contain"
          />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-gold shadow-gold ring-2 ring-background">
            <span className="font-display text-[0.65rem] sm:text-xs font-extrabold leading-none text-primary-foreground">
              {plan.iconMark}
            </span>
          </div>
        </div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">{plan.name}</h3>
      </div>

      {/* Description: min height for row alignment; no clamp so long copy (e.g. Champions) stays readable */}
      <p className="shrink-0 text-muted-foreground text-sm sm:text-[15px] leading-relaxed min-h-[5.5rem] sm:min-h-[6.5rem]">
        <BrandedText text={plan.description} ai4tOnly />
      </p>

      <div className="border-t border-border/40 my-3 shrink-0" />

      {/* Price: fixed slot (Kick-off promo + afterwards lines set the height) */}
      <div className="shrink-0 mb-1 h-[7rem] sm:h-[7.5rem] flex flex-col justify-start">
        {plan.id === "kickoff" ? (
          <>
            <div className="text-muted-foreground text-xs sm:text-sm mb-0.5 leading-none">
              <span
                className="font-semibold line-through decoration-[#e31e24] decoration-2"
                aria-hidden
              >
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(plan.basePrice[billing])}
              </span>
            </div>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-none">
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(0)}
              </span>
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-snug">
              {t.pricingPage.kickoffPromoPeriod ?? "for your first 12 months"}
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-snug">
              {t.pricingPage.kickoffAfterwards ?? "Afterwards from"}{" "}
              {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(plan.basePrice[billing])}
              /{billing === "yearly" ? (t.common.year ?? "year") : (t.common.month ?? "month")}
              {" + "}
              {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(plan.memberPrice[billing])}
              {" "}
              {t.pricingPage.perActiveMember ?? "per active member"}
            </div>
          </>
        ) : (
          <>
            <div className="text-muted-foreground text-xs sm:text-sm mb-0.5">
              {t.pricingPage.fromPrice ?? "From"}
            </div>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-none">
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(plan.basePrice[billing])}
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">
                /{billing === "yearly" ? (t.common.year ?? "year") : (t.common.month ?? "month")}
              </span>
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-snug">
              + {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(plan.memberPrice[billing])}{" "}
              {t.pricingPage.perActiveMember ?? "per active member"}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border/40 my-3 shrink-0" />

      {/* Features grow with the card; grid stretch keeps row heights even */}
      <div className="flex-1 mb-4 min-h-0">
        <ul className="space-y-2">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
              <span className="leading-snug">
                <BrandedText text={feature} ai4tOnly />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => { void handlePlanAction(); }}
        className={`w-full shrink-0 rounded-xl font-semibold text-sm ${
          plan.highlighted
            ? "bg-gradient-gold-static text-primary-foreground hover:brightness-110 shadow-gold"
            : "glass-card bg-gold-on-hover text-foreground"
        }`}
      >
        {plan.id === "kickoff" ? (t.pricingPage.kickoffCta ?? t.common.getStarted) : t.common.getStarted}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </motion.div>
  );
}

/* ─── Price Calculator ─── */
function PriceCalculator({ plans }: { plans: PlanConfig[] }) {
  const { t } = useLanguage();
  const minMembers = 1;
  const [members, setMembers] = useState(800);
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<string>(() => suggestPlanForMemberCount(800));
  const sliderMaxMembers = useMemo(() => Math.max(10000, members), [members]);

  const recommended = suggestPlanForMemberCount(members);
  const planFits =
    selectedPlan === "bespoke" ||
    (isValidPlanId(selectedPlan) &&
      selectedPlan !== "bespoke" &&
      members <= (PLAN_CATALOG[selectedPlan as Exclude<PlanId, "bespoke">]?.maxMembers ?? Infinity));

  // If current selection no longer fits, snap to recommended band.
  useEffect(() => {
    if (!planFits) {
      setSelectedPlan(recommended === "bespoke" ? "champions" : recommended);
    }
  }, [planFits, recommended]);

  const plan = plans.find((p) => p.id === selectedPlan) ?? plans[0];
  const { total, base, memberCost, discount, discountPct } = calculatePrice(plan, members, billing);
  const periodSuffix = billing === "yearly" ? "yr" : "mo";
  const pricePerMember = members > 0 && total >= 0 ? total / members : 0;
  const foundingPrice =
    selectedPlan === "kickoff"
      ? { total: 0, note: t.pricingPage.foundingCalcNote ?? "Founding Club: EUR 0 for 12 months, then catalogue pricing below." }
      : null;

  const normalizeMembers = useCallback((value: number) => {
    if (Number.isNaN(value)) return members;
    return Math.max(minMembers, Math.floor(value));
  }, [members, minMembers]);

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold-subtle flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">{t.pricingPage.priceCalculator}</h3>
          <p className="text-muted-foreground text-xs sm:text-sm">{t.pricingPage.estimateCost}</p>
        </div>
      </div>

      {/* Plan selector */}
      <div className="mb-5">
        <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">{t.pricingPage.selectPlan}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {plans.filter((p) => p.id !== "bespoke").map((p) => {
            const fits =
              isValidPlanId(p.id) &&
              p.id !== "bespoke" &&
              members <= PLAN_CATALOG[p.id as Exclude<PlanId, "bespoke">].maxMembers;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!fits}
                onClick={() => setSelectedPlan(p.id)}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  selectedPlan === p.id
                    ? "bg-gradient-gold-static text-primary-foreground shadow-gold"
                    : fits
                      ? "glass-card text-foreground hover:border-primary/20"
                      : "glass-card text-muted-foreground/50 cursor-not-allowed opacity-60"
                }`}
              >
                {p.name}
                {recommended === p.id ? (
                  <span className="block text-[9px] opacity-80 mt-0.5">
                    {t.pricingPage.recommendedShort ?? "Recommended"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!planFits ? (
          <p className="text-xs text-destructive mt-2">
            {t.pricingPage.planTooSmall ??
              "This plan does not support that many member profiles. Choose a higher package or Bespoke."}
          </p>
        ) : null}
        {recommended === "bespoke" ? (
          <p className="text-xs text-muted-foreground mt-2">
            {t.pricingPage.bespokeRecommended ??
              "Above 5,000 profiles we recommend a Bespoke package."}
          </p>
        ) : null}
      </div>

      {/* Member slider */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs sm:text-sm font-medium text-foreground">{t.pricingPage.numberOfMembers}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={1}
              value={members}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isNaN(parsed)) return;
                setMembers(normalizeMembers(parsed));
              }}
              className="w-24 h-8 rounded-lg border border-border bg-background/60 px-2 text-right text-xs sm:text-sm font-semibold text-foreground"
              aria-label={t.pricingPage.numberOfMembers}
            />
          </div>
        </div>
        <input
          type="range"
          min={minMembers}
          max={sliderMaxMembers}
          step={10}
          value={members}
          onChange={(e) => setMembers(normalizeMembers(Number(e.target.value)))}
          className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{minMembers}</span>
          <span>{sliderMaxMembers.toLocaleString()}</span>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="mb-6">
        <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">{t.pricingPage.billingCycle}</label>
        <div className="flex gap-2">
          {(["yearly", "monthly"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBilling(cycle)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                billing === cycle
                  ? "bg-gradient-gold-static text-primary-foreground shadow-gold"
                  : "glass-card text-foreground hover:border-primary/20"
              }`}
            >
              {cycle === "yearly" ? t.pricingPage.save20 : t.common.monthly}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-border/50 pt-5">
        {foundingPrice ? (
          <p className="text-xs text-muted-foreground mb-3">{foundingPrice.note}</p>
        ) : null}
        <div className="space-y-2 text-sm">
          {foundingPrice ? (
            <div className="flex justify-between text-foreground font-display font-bold text-lg">
              <span>{t.pricingPage.foundingPromoPrice ?? "Founding Club (12 months)"}</span>
              <span>EUR 0</span>
            </div>
          ) : null}
          <div className="flex justify-between text-muted-foreground">
            <span>{t.pricingPage.basePrice}</span>
            <span>EUR {base.toFixed(2)}/{periodSuffix}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{members.toLocaleString()} members x EUR {plan.memberPrice[billing]}</span>
            <span>EUR {memberCost.toFixed(2)}/{periodSuffix}</span>
          </div>
          {discount && (
            <div className="flex justify-between text-primary font-medium">
              <span>{t.pricingPage.volumeDiscount} ({discountPct}%)</span>
              <span>-EUR {((base + memberCost) * 0.15).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-foreground font-display font-bold text-lg sm:text-xl pt-2 border-t border-border/50">
            <span>{foundingPrice ? (t.pricingPage.afterFounding ?? "Afterwards") : t.common.total}</span>
            <span>EUR {total.toFixed(2)}/{periodSuffix}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs sm:text-sm italic pt-1">
            <span>{t.pricingPage.pricePerMember}</span>
            <span>EUR {pricePerMember.toFixed(2)}/{periodSuffix}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison Cell ─── */
function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value === "included" || value === true) {
    return <Check className="w-4 h-4 text-primary mx-auto" strokeWidth={2} />;
  }
  if (value === "not_included" || value === false) {
    return <XIcon className="w-4 h-4 text-muted-foreground/40 mx-auto" strokeWidth={2} />;
  }
  if (typeof value === "number") {
    return <span className="text-xs text-foreground font-medium">{value.toLocaleString()}</span>;
  }
  return <span className="text-xs text-primary font-medium capitalize">{String(value)}</span>;
}

function comparisonLabel(t: ReturnType<typeof useLanguage>["t"], key: string): string {
  const map = (t.pricingPage.comparisonFeatureLabels ?? {}) as Record<string, string>;
  if (map[key]) return map[key];
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/* ─── Main Pricing Page ─── */
const Pricing = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [memberCount] = useState(250);
  const [showComparison, setShowComparison] = useState(false);
  const locale = language === "de" ? "de" : "en";

  const plans: PlanConfig[] = [
    planFromCatalog(PLAN_CATALOG.kickoff, {
      name: "Kick-off / T",
      iconMark: "T",
      description: t.pricingPage.kickoffDesc,
      features: [
        formatPlanMarketingLimits("kickoff", locale),
        ...t.pricingPage.kickoffFeatures,
      ],
      badge: t.pricingPage.kickoffFreeBadge ?? "12 MONTHS FREE",
    }),
    planFromCatalog(PLAN_CATALOG.squad, {
      name: "Squad / E",
      iconMark: "E",
      description: t.pricingPage.squadDesc,
      features: [
        formatPlanMarketingLimits("squad", locale),
        ...t.pricingPage.squadFeatures,
      ],
    }),
    planFromCatalog(PLAN_CATALOG.pro, {
      name: "Pro / A",
      iconMark: "A",
      description: t.pricingPage.proDesc,
      features: [
        formatPlanMarketingLimits("pro", locale),
        ...t.pricingPage.proFeatures,
      ],
      highlighted: true,
      badge: t.pricingPage.mostPopular,
    }),
    planFromCatalog(PLAN_CATALOG.champions, {
      name: "Champions / M",
      iconMark: "M",
      description: t.pricingPage.championsDesc,
      features: [
        formatPlanMarketingLimits("champions", locale),
        ...t.pricingPage.championsFeatures,
      ],
    }),
  ];

  const bespokePlan: PlanConfig = {
    id: "bespoke",
    name: "Bespoke / 1 of 1",
    iconMark: "1",
    description: t.pricingPage.bespokeDesc,
    basePrice: { yearly: 0, monthly: 0 },
    memberPrice: { yearly: 0, monthly: 0 },
    discountThreshold: 0,
    features: [...t.pricingPage.bespokeFeatures],
    highlighted: true,
    badge: t.pricingPage.bespokeBadge ?? "ENTERPRISE",
  };

  const addons = [
    {
      variant: "default" as const,
      icon: CreditCard,
      name: t.pricingPage.paymentsAddon,
      price: "EUR 0–19/mo",
      desc: t.pricingPage.paymentsAddonDesc,
    },
    {
      variant: "default" as const,
      icon: MessageSquare,
      name: t.pricingPage.proCommsAddon,
      price: "EUR 9/mo",
      desc: t.pricingPage.proCommsAddonDesc,
    },
    {
      variant: "ai4t" as const,
      icon: Bot,
      name: t.pricingPage.ai4tAddon,
      price: t.pricingPage.ai4tAddonPrice,
      desc: t.pricingPage.ai4tAddonDesc,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-[8.75rem] sm:pt-28">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <FootballFieldAnimation />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:from-background/80 dark:via-background/40 dark:to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 dark:from-background/60 dark:via-transparent dark:to-background/60" />
        </motion.div>

        <motion.div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 text-center" style={{ opacity: contentOpacity }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <img src={logo} alt="ONE4Team" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto drop-shadow-2xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6"
          >
            {t.pricingPage.title}{" "}
            <span className="text-gradient-gold">{t.pricingPage.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-foreground/70 dark:text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed px-2"
          >
            {t.pricingPage.description}
            <br />
            {t.pricingPage.descriptionLine2}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8 sm:mt-10"
          >
            {[
              { target: 14, suffix: "+", label: t.hero.platformModules },
              { target: 41, suffix: t.pricingPage.freeTrialCountSuffix, label: t.pricingPage.freeTrial },
              { target: 0, suffix: "", label: t.pricingPage.setupFee, display: "EUR 0" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
                  {stat.display ?? <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={1500 + i * 200} />}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Billing Toggle */}
      <section className="py-8 sm:py-10">
        <div className="container mx-auto px-4">
          <FadeInSection className="flex justify-center">
            <div className="glass-card rounded-2xl p-1.5 flex gap-1">
              <button
                onClick={() => setBilling("yearly")}
                className={`relative px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  billing === "yearly"
                    ? "bg-gradient-gold-static text-primary-foreground shadow-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.common.yearly}
                {billing === "yearly" && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                    -20%
                  </span>
                )}
              </button>
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  billing === "monthly"
                    ? "bg-gradient-gold-static text-primary-foreground shadow-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.common.monthly}
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Pricing Cards — four standard packages */}
      <section id="plans" className="pb-10 sm:pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-7xl mx-auto items-stretch">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billing={billing} memberCount={memberCount} />
            ))}
          </div>

          <FadeInSection className="text-center mt-6 sm:mt-8 max-w-3xl mx-auto px-2">
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {t.pricingPage.offerNotice ??
                "Kick-off is free for 12 months for eligible Founding Clubs.\nSquad, Pro and Champions include a 41-day trial.\nNo credit card is required for the Kick-off offer."}
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Bespoke enterprise band */}
      <section className="pb-16 sm:pb-20">
        <div className="container mx-auto px-4 max-w-5xl pt-3">
          <PricingCard plan={bespokePlan} billing={billing} memberCount={memberCount} />
        </div>
      </section>

      {/* Add-on Services */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.pricingPage.optionalAddons} <span className="text-gradient-gold">{t.pricingPage.addonsHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.pricingPage.addonsDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto items-stretch">
            {addons.map((addon, i) => (
              <FadeInSection key={i} delay={i * 0.1} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "glass-card rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-default h-full flex flex-col gap-5 hover:border-primary/20 hover:shadow-gold",
                    addon.variant === "ai4t" &&
                      "group relative overflow-hidden border border-border/60 dark:border-white/10 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-black dark:shadow-[0_24px_80px_-24px_rgba(227,30,36,0.35)] hover:!border-primary/20 hover:!shadow-gold",
                  )}
                >
                  {addon.variant === "ai4t" && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-[#e31e24]/[0.04] dark:from-[rgba(227,30,36,0.18)] dark:via-transparent dark:to-[rgba(255,255,255,0.06)] transition-opacity duration-300 group-hover:opacity-70"
                      aria-hidden
                    />
                  )}
                  <div className="relative flex flex-col flex-1 gap-5">
                  {addon.variant === "ai4t" ? (
                    <div className="flex flex-1 gap-3 sm:gap-4 min-h-0">
                      <div className="relative aspect-[683/1024] w-[7.5rem] sm:w-36 shrink-0 overflow-hidden rounded-xl bg-black">
                        <Ai4TIntroLogoVideo className="h-full w-full" playMode="visible" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display font-bold text-foreground text-sm sm:text-base leading-snug">
                            <BrandedText text={addon.name} ai4tOnly />
                          </h3>
                          <span className="text-primary font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap text-right leading-snug">
                            {addon.price}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-2 flex-1 whitespace-pre-line">
                          <BrandedText text={addon.desc} ai4tOnly />
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center">
                        <addon.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display font-bold text-foreground text-sm sm:text-base leading-snug">
                            {addon.name}
                          </h3>
                          <span className="text-primary font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap text-right leading-snug">
                            {addon.price}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-2 flex-1">
                          {addon.desc}
                        </p>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => navigate("/onboarding")}
                    className="w-full rounded-xl font-semibold text-sm glass-card bg-gold-on-hover text-foreground justify-center relative"
                  >
                    {t.common.book}
                    <ArrowRight className="absolute right-4 w-4 h-4" aria-hidden="true" />
                  </Button>
                  </div>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* How Pricing Works */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.pricingPage.howPricingWorks} <span className="text-gradient-gold">{t.pricingPage.pricingWorksHighlight}</span> {t.pricingPage.pricingWorksEnd}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.pricingPage.pricingWorksDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: CreditCard,
                step: "1",
                title: t.pricingPage.basePrice,
                desc: t.pricingPage.basePriceDesc,
              },
              {
                icon: Users,
                step: "2",
                title: t.pricingPage.perMember,
                desc: t.pricingPage.perMemberDesc,
              },
              {
                icon: Zap,
                step: "3",
                title: t.pricingPage.volumeDiscount,
                desc: t.pricingPage.volumeDiscountDesc,
              },
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="glass-card rounded-2xl p-5 sm:p-6 text-center hover:border-primary/20 transition-all duration-300 h-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="text-xs text-primary font-bold mb-1">{t.pricingPage.step} {item.step}</div>
                  <h3 className="font-display font-bold text-foreground mb-2 text-sm sm:text-base">{item.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection className="text-center mt-8 sm:mt-10">
            <div className="glass-card rounded-2xl inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 text-sm sm:text-base">
              <span className="text-muted-foreground">{t.common.total} =</span>
              <span className="font-display font-bold text-foreground">{t.pricingPage.basePrice}</span>
              <span className="text-muted-foreground">+</span>
              <span className="font-display font-bold text-foreground">{t.pricingPage.perMember}</span>
              <span className="text-muted-foreground">- {t.pricingPage.volumeDiscount}</span>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Price Calculator */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.pricingPage.calculateYour} <span className="text-gradient-gold">{t.pricingPage.investmentHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.pricingPage.calculatorDesc}
            </p>
          </FadeInSection>

          <FadeInSection>
            <PriceCalculator plans={plans} />
          </FadeInSection>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-8 sm:mb-10 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.pricingPage.comparePlans} <span className="text-gradient-gold">{t.pricingPage.plansHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6">
              {t.pricingPage.compareDesc}
            </p>
            <Button
              variant="outline"
              onClick={() => setShowComparison(!showComparison)}
              className="glass-card text-foreground rounded-xl text-sm"
            >
              {showComparison ? t.pricingPage.hideFeatureComparison : t.pricingPage.showFeatureComparison}
              <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${showComparison ? "rotate-180" : ""}`} />
            </Button>
          </FadeInSection>

          {showComparison && (
            <FadeInSection>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] max-w-5xl mx-auto">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-xs sm:text-sm font-semibold text-foreground w-1/4">{t.common.feature}</th>
                      {(["kickoff", "squad", "pro", "champions", "bespoke"] as PlanId[]).map((id) => {
                        const label =
                          id === "bespoke"
                            ? t.pricingPage.bespoke
                            : plans.find((p) => p.id === id)?.name ?? id;
                        return (
                          <th
                            key={id}
                            className={`text-center py-3 px-2 text-[10px] sm:text-xs font-semibold ${
                              id === "pro" ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.key} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-xs sm:text-sm text-foreground/80">
                          <BrandedText text={comparisonLabel(t, row.key)} ai4tOnly />
                        </td>
                        {(["kickoff", "squad", "pro", "champions", "bespoke"] as PlanId[]).map((id) => (
                          <td key={id} className="py-2.5 px-2 text-center">
                            <ComparisonCell value={resolveComparisonValue(row, id)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FadeInSection>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.pricingPage.frequentlyAsked} <span className="text-gradient-gold">{t.pricingPage.askedHighlight}</span>
            </h2>
          </FadeInSection>

          <div className="space-y-3 sm:space-y-4">
            {t.pricingPage.faq.map((faq, i) => (
              <FadeInSection key={i} delay={i * 0.04}>
                <div className="glass-card rounded-2xl p-4 sm:p-5 hover:border-primary/20 transition-all duration-300">
                  <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-1.5">
                    <BrandedText text={faq.q} ai4tOnly />
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    <BrandedText text={faq.a} ai4tOnly />
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent dark:via-primary/[0.05]" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <FadeInSection>
            <img src={logo} alt="ONE4Team" className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 drop-shadow-xl" />
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              {t.pricingPage.startFreeTrialToday}
              <br />
              <span className="text-gradient-gold">{t.pricingPage.todayHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 sm:mb-10">
              {t.pricingPage.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => navigate("/onboarding")}
                className="glass-card bg-gold-on-hover text-foreground font-semibold text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.pricingPage.startFreeTrial}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/about")}
                className="glass-card bg-red-chrome-on-hover text-foreground text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.pricingPage.learnMore}
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
