import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Users, Calendar, Trophy, CreditCard, MessageSquare,
  Briefcase, ShoppingBag, Bot, BarChart3, Globe,
  Heart, Shield, Zap, Target, Sparkles, ArrowRight,
  CheckCircle2, Rocket, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

/** Animated counter that counts from 0 to `target` when visible */
function AnimatedCounter({ target, suffix = "", duration = 2000, decimals = 0 }: { target: number; suffix?: string; duration?: number; decimals?: number }) {
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
      const value = eased * target;
      setCount(decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.round(value));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, target, duration, decimals]);

  return <span ref={counterRef}>{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</span>;
}

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

const About = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const platformFeatures = [
    { icon: Users, title: t.features.memberManagement, desc: t.aboutPage.memberManagementLong, color: "primary" },
    { icon: Calendar, title: t.features.trainingTeams, desc: t.aboutPage.trainingTeamsLong, color: "primary" },
    { icon: Trophy, title: t.features.matchManagement, desc: t.aboutPage.matchManagementLong, color: "primary" },
    { icon: CreditCard, title: t.features.paymentsFees, desc: t.aboutPage.paymentsFeesLong, color: "primary" },
    { icon: MessageSquare, title: t.aboutPage.communicationHub, desc: t.aboutPage.communicationHubLong, color: "primary" },
    { icon: Briefcase, title: t.features.partnerPortal, desc: t.aboutPage.partnerPortalLong, color: "primary" },
    { icon: ShoppingBag, title: t.features.clubShop, desc: t.aboutPage.clubShopLong, color: "primary" },
    { icon: Globe, title: t.features.publicClubPage, desc: t.aboutPage.publicClubPageLong, color: "primary" },
    { icon: Bot, title: t.features.aiCoTrainer, desc: t.aboutPage.aiCoTrainerLong, color: "primary" },
    { icon: BarChart3, title: t.features.smartDashboards, desc: t.aboutPage.smartDashboardsLong, color: "primary" },
  ];

  const values = [
    { icon: Heart, title: t.aboutPage.communityFirst, desc: t.aboutPage.communityFirstDesc },
    { icon: Shield, title: t.aboutPage.trustSecurity, desc: t.aboutPage.trustSecurityDesc },
    { icon: Zap, title: t.aboutPage.simplicitySpeed, desc: t.aboutPage.simplicitySpeedDesc },
    { icon: Eye, title: t.aboutPage.transparency, desc: t.aboutPage.transparencyDesc },
  ];

  const stats = [
    { target: 50, suffix: "K+", label: t.hero.membersManaged },
    { target: 500, suffix: "+", label: t.hero.activeClubs },
    { target: 20, suffix: "+", label: t.hero.sportsSupported },
    { target: 99.9, suffix: "%", label: t.aboutPage.uptime, decimals: 1 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-14">
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
            <img src={logo} alt="ONE4Team" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto drop-shadow-2xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6"
          >
            {t.aboutPage.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-foreground/70 dark:text-foreground/80 max-w-3xl mx-auto font-light leading-relaxed px-2"
          >
            {t.aboutPage.heroLine1}
            <br />
            {t.aboutPage.heroLine2}
            <br />
            {t.aboutPage.heroLine3}
          </motion.p>
        </motion.div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInSection className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              {t.aboutPage.ourMission} <span className="text-gradient-gold">{t.aboutPage.missionHighlight}</span>
            </h2>
            <p className="text-foreground/70 dark:text-foreground/80 text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              {t.aboutPage.missionDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <FadeInSection delay={0.1}>
              <div className="glass-card rounded-2xl p-6 sm:p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{t.aboutPage.theProblem}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {t.aboutPage.theProblemDesc}
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="glass-card rounded-2xl p-6 sm:p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{t.aboutPage.ourSolution}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {t.aboutPage.ourSolutionDesc}
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 sm:py-14 border-y border-border/50">
        <div className="container mx-auto px-4">
          <FadeInSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto text-center">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={2000 + i * 300} decimals={stat.decimals ?? 0} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Platform Features — detailed */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-12 sm:mb-16 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.aboutPage.completePlatform}{" "}
              <span className="text-gradient-gold">{t.aboutPage.platformHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.aboutPage.platformDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {platformFeatures.map((feature, i) => (
              <FadeInSection key={i} delay={i * 0.05}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full"
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-gold-subtle flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-1 text-sm sm:text-base">{feature.title}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Two Worlds */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-12 sm:mb-16 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.aboutPage.twoWorldsUnified}{" "}
              <span className="text-gradient-gold">{t.aboutPage.unifiedHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.aboutPage.twoWorldsDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <FadeInSection delay={0.1}>
              <div className="glass-card rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-gold h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">{t.aboutPage.clubWorldAbout}</h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4">
                  {t.aboutPage.clubWorldAboutDesc}
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[t.common.players, t.common.trainers, t.common.staff, t.common.members, t.common.parents].map((role) => (
                    <span key={role} className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="glass-card rounded-2xl p-6 sm:p-8 hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_30px_hsl(0_65%_50%/0.15)] h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent flex items-center justify-center mb-5">
                  <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-accent-foreground" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">{t.aboutPage.partnerWorldAbout}</h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4">
                  {t.aboutPage.partnerWorldAboutDesc}
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[t.common.sponsors, t.common.suppliers, t.common.consultants, t.common.services].map((role) => (
                    <span key={role} className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInSection className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.aboutPage.poweredByAI} <span className="text-gradient-gold">{t.aboutPage.aiHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.aboutPage.aiDesc}
            </p>
          </FadeInSection>

          <div className="space-y-4 sm:space-y-6">
            {[
              { icon: Bot, title: t.aboutPage.coTrainerTitle, desc: t.aboutPage.coTrainerAboutDesc },
              { icon: BarChart3, title: t.aboutPage.smartAnalytics, desc: t.aboutPage.smartAnalyticsDesc },
              { icon: Rocket, title: t.aboutPage.coAIminTitle, desc: t.aboutPage.coAIminAboutDesc },
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="glass-card rounded-2xl p-5 sm:p-6 flex gap-4 items-start hover:border-primary/20 transition-all duration-300">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-12 sm:mb-16 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.aboutPage.ourValues} <span className="text-gradient-gold">{t.aboutPage.valuesHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.aboutPage.valuesDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {values.map((value, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="glass-card rounded-2xl p-5 sm:p-7 text-center hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-2 text-sm sm:text-base">{value.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{value.desc}</p>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why ONE4Team */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInSection className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.aboutPage.whyOne4Team}<span className="text-gradient-gold">{t.aboutPage.whyOne4TeamHighlight}</span>{t.aboutPage.whyOne4TeamEnd}
            </h2>
          </FadeInSection>

          <div className="space-y-3 sm:space-y-4">
            {t.aboutPage.whyPoints.map((point, i) => (
              <FadeInSection key={i} delay={i * 0.04}>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-muted/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-foreground/80 dark:text-foreground/90 text-sm sm:text-base">{point}</p>
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
              {t.aboutPage.readyToTransform}
              <br />
              <span className="text-gradient-gold">{t.aboutPage.yourClubHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 sm:mb-10">
              {t.aboutPage.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => navigate("/onboarding")}
                className="glass-card bg-gold-on-hover text-foreground font-semibold text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.common.getStarted}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/")}
                className="glass-card bg-red-chrome-on-hover text-foreground text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.aboutPage.backToHome}
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
