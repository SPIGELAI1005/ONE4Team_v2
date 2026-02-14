import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight, Check, Users, Dumbbell, Trophy, CreditCard,
  MessageSquare, Globe, ShoppingBag, Handshake, Bot, BarChart3,
  Shield, UserCheck, Heart, Briefcase, Star, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

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

/* ─── Feature icons mapping ─── */
const clubFeatureIcons = [Users, Dumbbell, Trophy, CreditCard, MessageSquare, Globe];
const partnerFeatureIcons = [Handshake, ShoppingBag];
const aiFeatureIcons = [Bot, BarChart3];
const benefitIcons = [Shield, UserCheck, Star, Heart, Briefcase, Zap];
const useCaseColors = [
  "from-green-600 to-green-500",
  "from-blue-600 to-blue-400",
  "from-amber-600 to-amber-400",
  "from-purple-600 to-purple-400",
];

/* ─── Main Page ─── */
const Features = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20 sm:pt-24">
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
            {t.featuresPage.title}{" "}
            <span className="text-gradient-gold">{t.featuresPage.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-foreground/70 dark:text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed px-2"
          >
            {t.featuresPage.description}
            <br />
            {t.featuresPage.descriptionLine2}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8 sm:mt-10"
          >
            {[
              { target: 10, suffix: "+", label: t.featuresPage.coreModules },
              { target: 6, suffix: "+", label: t.featuresPage.rolesSupported },
              { target: 2, suffix: "", label: t.featuresPage.languagesAvailable },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={1500 + i * 200} />
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── For Clubs ─── */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.featuresPage.forClubsTitle}{" "}
              <span className="text-gradient-gold">{t.featuresPage.forClubsHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.featuresPage.forClubsDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {t.featuresPage.clubFeatures.map((feature, i) => {
              const Icon = clubFeatureIcons[i] ?? Star;
              return (
                <FadeInSection key={i} delay={i * 0.06}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full flex flex-col"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-4 flex-1">{feature.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-primary font-medium bg-primary/5 dark:bg-primary/10 rounded-full px-2 py-0.5">
                          <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {h}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── For Partners ─── */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.featuresPage.forPartnersTitle}{" "}
              <span className="text-gradient-gold">{t.featuresPage.forPartnersHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.featuresPage.forPartnersDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {t.featuresPage.partnerFeatures.map((feature, i) => {
              const Icon = partnerFeatureIcons[i] ?? Star;
              return (
                <FadeInSection key={i} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full flex flex-col"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-4 flex-1">{feature.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-primary font-medium bg-primary/5 dark:bg-primary/10 rounded-full px-2 py-0.5">
                          <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {h}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── AI & Intelligence ─── */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.featuresPage.aiTitle}{" "}
              <span className="text-gradient-gold">{t.featuresPage.aiHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.featuresPage.aiDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {t.featuresPage.aiFeatures.map((feature, i) => {
              const Icon = aiFeatureIcons[i] ?? Star;
              return (
                <FadeInSection key={i} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-6 sm:p-8 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full flex flex-col"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-base sm:text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-5 flex-1">{feature.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-primary font-medium bg-primary/5 dark:bg-primary/10 rounded-full px-2.5 py-1">
                          <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {h}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Who Benefits ─── */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.featuresPage.benefitsTitle}{" "}
              <span className="text-gradient-gold">{t.featuresPage.benefitsHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.featuresPage.benefitsDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {t.featuresPage.benefits.map((benefit, i) => {
              const Icon = benefitIcons[i] ?? Star;
              return (
                <FadeInSection key={i} delay={i * 0.06}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold-subtle flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-2">{benefit.role}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{benefit.desc}</p>
                  </motion.div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.featuresPage.useCasesTitle}{" "}
              <span className="text-gradient-gold">{t.featuresPage.useCasesHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.featuresPage.useCasesDesc}
            </p>
          </FadeInSection>

          <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
            {t.featuresPage.useCases.map((useCase, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <div className="glass-card rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300">
                  {/* Use case header */}
                  <div className="relative p-5 sm:p-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06] dark:from-primary/[0.06] dark:to-primary/[0.12]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r ${useCaseColors[i]} flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg`}>
                          {i + 1}
                        </span>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">{useCase.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        <span className="font-semibold text-foreground/80">{t.featuresPage.scenarioLabel}:</span>{" "}
                        {useCase.scenario}
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-border/40">
                    <div className="space-y-3">
                      {useCase.steps.map((step, j) => (
                        <div key={j} className="flex gap-3">
                          <span className={`shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${useCaseColors[i]} flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                            {j + 1}
                          </span>
                          <p className="text-foreground/80 text-xs sm:text-sm leading-relaxed pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-border/40 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                      <p className="text-foreground text-xs sm:text-sm font-medium leading-relaxed">
                        <span className="text-primary font-semibold">{t.featuresPage.resultLabel}:</span>{" "}
                        {useCase.result}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent dark:via-primary/[0.05]" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <FadeInSection>
            <img src={logo} alt="ONE4Team" className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 drop-shadow-xl" />
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              {t.featuresPage.ctaTitle}
              <br />
              <span className="text-gradient-gold">{t.featuresPage.ctaHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 sm:mb-10">
              {t.featuresPage.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => navigate("/onboarding")}
                className="glass-card bg-gold-on-hover text-foreground font-semibold text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.featuresPage.ctaButton}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/pricing")}
                className="glass-card bg-red-chrome-on-hover text-foreground text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.featuresPage.explorePricing}
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
