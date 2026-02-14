import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Check, X as XIcon, ArrowRight, Sparkles, Crown, Rocket, Shield, Star,
  Users, Calendar, Trophy, CreditCard, MessageSquare, Bot, BarChart3,
  Globe, ShoppingBag, Briefcase, Zap, Calculator, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

/* ─── Pricing Data ─── */
interface PlanConfig {
  id: string;
  name: string;
  icon: typeof Star;
  description: string;
  basePrice: { yearly: number; monthly: number };
  memberPrice: { yearly: number; monthly: number };
  discountThreshold: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

function calculatePrice(plan: PlanConfig, memberCount: number, billing: "yearly" | "monthly") {
  if (plan.id === "bespoke") return { total: -1, base: 0, memberCost: 0, discount: false, discountPct: 0 };
  const base = plan.basePrice[billing];
  const memberCost = memberCount * plan.memberPrice[billing];
  let total = base + memberCost;
  let discount = false;
  const discountPct = 15;
  if (memberCount > plan.discountThreshold) {
    discount = true;
    total *= 0.85;
  }
  return { total, base, memberCost, discount, discountPct };
}

/* ─── Comparison Table Features (boolean grid — names come from translations) ─── */
const comparisonGrid: { kickoff: boolean; squad: boolean; pro: boolean; champions: boolean; bespoke: boolean }[] = [
  { kickoff: true, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: true, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: true, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: true, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: true, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: true, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: true, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: true, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: false, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: false, bespoke: true },
  { kickoff: false, squad: false, pro: false, champions: false, bespoke: true },
];

/* ─── Promo Banner ─── */
function PromoBanner() {
  const { t } = useLanguage();
  const deadline = new Date("2026-03-14T23:59:59").getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, deadline - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white">
      <div className="container mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4 text-center">
        <span className="text-xs sm:text-sm font-semibold">
          🔥 {t.pricingPage.earlyBird} <span className="font-bold">{t.pricingPage.earlyBirdOff}</span> {t.pricingPage.earlyBirdUntil}
        </span>
        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-mono font-bold bg-white/15 rounded-lg px-2.5 py-1">
          {pad(timeLeft.days)}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s {t.pricingPage.timeLeft}
        </span>
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
  const { total, discount } = calculatePrice(plan, memberCount, billing);
  const isBespoke = plan.id === "bespoke";
  const Icon = plan.icon;

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
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-gold text-primary-foreground text-[10px] sm:text-xs font-semibold whitespace-nowrap">
          {plan.badge}
        </div>
      )}

      {/* Header — icon + name + description */}
      <div className="mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold-subtle flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-relaxed h-[3.6rem] sm:h-[4.2rem] line-clamp-3">{plan.description}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40 my-3" />

      {/* Price */}
      <div className="mb-4">
        {isBespoke ? (
          <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">{t.pricingPage.custom}</div>
        ) : (
          <>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                EUR {total < 0 ? "—" : total.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-[10px] sm:text-xs">/{billing === "yearly" ? "yr" : "mo"}</span>
            </div>
            <div className="text-muted-foreground text-[9px] sm:text-[10px] mt-1 leading-snug">
              EUR {plan.basePrice[billing]} base + EUR {plan.memberPrice[billing]}/member/{billing === "yearly" ? "yr" : "mo"}
            </div>
            {discount && (
              <div className="text-primary text-[9px] sm:text-[10px] font-medium mt-0.5">
                {t.pricingPage.volumeDiscountApplied}
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/40 my-3" />

      {/* Features — flex-1 pushes button to bottom */}
      <div className="flex-1 mb-4">
        <ul className="space-y-1.5">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] sm:text-xs text-foreground/80">
              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
              <span className="leading-snug">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => isBespoke
          ? navigate("/onboarding?plan=bespoke")
          : navigate(`/onboarding?plan=${plan.id}&members=${memberCount}&billing=${billing}`)
        }
        className={`w-full rounded-xl font-semibold text-sm ${
          plan.highlighted
            ? "bg-gradient-gold text-primary-foreground hover:brightness-110 shadow-gold"
            : "glass-card bg-gold-on-hover text-foreground"
        }`}
      >
        {isBespoke ? t.pricingPage.contactUs : t.common.getStarted}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </motion.div>
  );
}

/* ─── Price Calculator ─── */
function PriceCalculator({ plans }: { plans: PlanConfig[] }) {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<string>("squad");
  const [members, setMembers] = useState(100);
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  const plan = plans.find((p) => p.id === selectedPlan)!;
  const { total, base, memberCost, discount, discountPct } = calculatePrice(plan, members, billing);

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
          {plans.filter((p) => p.id !== "bespoke").map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                selectedPlan === p.id
                  ? "bg-gradient-gold text-primary-foreground shadow-gold"
                  : "glass-card text-foreground hover:border-primary/20"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Member slider */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs sm:text-sm font-medium text-foreground">{t.pricingPage.numberOfMembers}</label>
          <span className="text-sm sm:text-base font-display font-bold text-foreground">{members.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={10}
          max={10000}
          step={10}
          value={members}
          onChange={(e) => setMembers(Number(e.target.value))}
          className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>10</span>
          <span>10,000</span>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="mb-6">
        <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">{t.pricingPage.billingCycle}</label>
        <div className="flex gap-2">
          {(["yearly", "monthly"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBilling(cycle)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                billing === cycle
                  ? "bg-gradient-gold text-primary-foreground shadow-gold"
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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.pricingPage.basePrice}</span>
            <span>EUR {base.toFixed(2)}/{billing === "yearly" ? "yr" : "mo"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{members.toLocaleString()} members x EUR {plan.memberPrice[billing]}</span>
            <span>EUR {memberCost.toFixed(2)}/{billing === "yearly" ? "yr" : "mo"}</span>
          </div>
          {discount && (
            <div className="flex justify-between text-primary font-medium">
              <span>{t.pricingPage.volumeDiscount} ({discountPct}%)</span>
              <span>-EUR {((base + memberCost) * 0.15).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-foreground font-display font-bold text-lg sm:text-xl pt-2 border-t border-border/50">
            <span>{t.common.total}</span>
            <span>EUR {total.toFixed(2)}/{billing === "yearly" ? "yr" : "mo"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison Cell ─── */
function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-primary mx-auto" strokeWidth={2} />;
  if (value === false) return <XIcon className="w-4 h-4 text-muted-foreground/40 mx-auto" strokeWidth={2} />;
  return <span className="text-xs text-primary font-medium">{value}</span>;
}

/* ─── Main Pricing Page ─── */
const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [memberCount] = useState(100);
  const [showComparison, setShowComparison] = useState(false);

  const plans: PlanConfig[] = [
    {
      id: "kickoff",
      name: t.pricingPage.kickoff,
      icon: Star,
      description: t.pricingPage.kickoffDesc,
      basePrice: { yearly: 14, monthly: 1.40 },
      memberPrice: { yearly: 1, monthly: 0.10 },
      discountThreshold: 499,
      features: [...t.pricingPage.kickoffFeatures],
    },
    {
      id: "squad",
      name: t.pricingPage.squad,
      icon: Rocket,
      description: t.pricingPage.squadDesc,
      basePrice: { yearly: 28, monthly: 2.80 },
      memberPrice: { yearly: 2, monthly: 0.20 },
      discountThreshold: 999,
      features: [...t.pricingPage.squadFeatures],
      highlighted: true,
      badge: t.pricingPage.mostPopular,
    },
    {
      id: "pro",
      name: t.pricingPage.pro,
      icon: Trophy,
      description: t.pricingPage.proDesc,
      basePrice: { yearly: 56, monthly: 5.60 },
      memberPrice: { yearly: 3, monthly: 0.30 },
      discountThreshold: 1999,
      features: [...t.pricingPage.proFeatures],
    },
    {
      id: "champions",
      name: t.pricingPage.champions,
      icon: Crown,
      description: t.pricingPage.championsDesc,
      basePrice: { yearly: 112, monthly: 11.20 },
      memberPrice: { yearly: 4, monthly: 0.40 },
      discountThreshold: 2999,
      features: [...t.pricingPage.championsFeatures],
    },
    {
      id: "bespoke",
      name: t.pricingPage.bespoke,
      icon: Sparkles,
      description: t.pricingPage.bespokeDesc,
      basePrice: { yearly: 0, monthly: 0 },
      memberPrice: { yearly: 4, monthly: 0.40 },
      discountThreshold: 0,
      features: [...t.pricingPage.bespokeFeatures],
    },
  ];

  const addons = [
    {
      icon: CreditCard,
      name: t.pricingPage.paymentsAddon,
      price: "EUR 0–19/mo",
      desc: t.pricingPage.paymentsAddonDesc,
    },
    {
      icon: MessageSquare,
      name: t.pricingPage.proCommsAddon,
      price: "EUR 9/mo",
      desc: t.pricingPage.proCommsAddonDesc,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-24 sm:pt-26">
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
              { target: 500, suffix: "+", label: t.hero.activeClubs },
              { target: 14, suffix: " days", label: t.pricingPage.freeTrial },
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
                    ? "bg-gradient-gold text-primary-foreground shadow-gold"
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
                    ? "bg-gradient-gold text-primary-foreground shadow-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.common.monthly}
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 sm:pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billing={billing} memberCount={memberCount} />
            ))}
          </div>

          <FadeInSection className="text-center mt-6 sm:mt-8">
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t.pricingPage.allPlansInclude} <span className="text-primary font-semibold">{t.pricingPage.freeTrialDays}</span>{t.pricingPage.noCreditCard}
            </p>
          </FadeInSection>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {addons.map((addon, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full"
                >
                  <div className="flex gap-4 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center">
                      <addon.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="font-display font-bold text-foreground text-sm sm:text-base">{addon.name}</h3>
                        <span className="text-primary font-semibold text-xs sm:text-sm">{addon.price}</span>
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{addon.desc}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/onboarding")}
                    className="w-full rounded-xl font-semibold text-sm glass-card bg-gold-on-hover text-foreground"
                  >
                    {t.common.book}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
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
                      {plans.map((p) => (
                        <th key={p.id} className={`text-center py-3 px-2 text-[10px] sm:text-xs font-semibold ${p.highlighted ? "text-primary" : "text-foreground"}`}>
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonGrid.map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-xs sm:text-sm text-foreground/80">{t.pricingPage.comparisonFeatures[i]}</td>
                        <td className="py-2.5 px-2 text-center"><ComparisonCell value={row.kickoff} /></td>
                        <td className="py-2.5 px-2 text-center"><ComparisonCell value={row.squad} /></td>
                        <td className="py-2.5 px-2 text-center"><ComparisonCell value={row.pro} /></td>
                        <td className="py-2.5 px-2 text-center"><ComparisonCell value={row.champions} /></td>
                        <td className="py-2.5 px-2 text-center"><ComparisonCell value={row.bespoke} /></td>
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
                  <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-1.5">{faq.q}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{faq.a}</p>
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
