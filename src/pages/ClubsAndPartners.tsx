import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight, ExternalLink, Star, Check,
  Handshake, Eye, Headphones, Network, Lightbulb, Zap,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";
import tsvLogo from "@/assets/tsv-allach-logo.png";
import tsvStadium from "@/assets/tsv-allach-stadium.png";
import tsvTeam from "@/assets/tsv-allach-team.png";
import tsvTestimonial from "@/assets/tsv-allach-testimonial.png";
import sporteckeLogo from "@/assets/sportecke-logo.png";
import sporteckeStore from "@/assets/sportecke-store.png";
import sporteckeTestimonial from "@/assets/sportecke-testimonial.png";

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

/* ─── Main Page ─── */
const ClubsAndPartners = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const whyBenefitIcons = [Lightbulb, Zap, Star, Eye, Headphones, Network];

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
            {t.clubsAndPartnersPage.title}{" "}
            <span className="text-gradient-gold">{t.clubsAndPartnersPage.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-foreground/70 dark:text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed px-2"
          >
            {t.clubsAndPartnersPage.description}
            <br />
            {t.clubsAndPartnersPage.descriptionLine2}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8 sm:mt-10"
          >
            {[
              { target: 1, suffix: "+", label: t.clubsAndPartnersPage.partnerClubs },
              { target: 1, suffix: "+", label: t.clubsAndPartnersPage.industryPartners },
              { target: 1, suffix: "", label: t.clubsAndPartnersPage.countriesRepresented },
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

      {/* ─── Pioneer Partners ─── */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.clubsAndPartnersPage.pioneerTitle} <span className="text-gradient-gold">{t.clubsAndPartnersPage.pioneerHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.clubsAndPartnersPage.pioneerDesc}
            </p>
          </FadeInSection>

          <div className="space-y-8 sm:space-y-10 max-w-4xl mx-auto">
            {/* TSV Allach 09 — Custom Rich Card */}
            <FadeInSection>
              <div className="glass-card rounded-2xl overflow-hidden hover:border-green-500/30 transition-all duration-300">
                {/* Hero Banner — Stadium image */}
                <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">
                  <img
                    src={tsvStadium}
                    alt="TSV Allach 09 Sportanlage"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-900/40 via-transparent to-green-900/40" />
                  {/* Badge */}
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-green-600 to-green-500 text-white text-[10px] sm:text-xs font-semibold shadow-lg">
                    {t.clubsAndPartnersPage.tsvAllachBadge}
                  </span>
                  {/* Logo + Name overlay */}
                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-white/10 backdrop-blur-sm">
                      <img src={tsvLogo} alt="TSV Allach 09" className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                        {t.clubsAndPartnersPage.tsvAllachName}
                      </h3>
                      <p className="text-green-300 text-xs sm:text-sm font-semibold drop-shadow-md">
                        {t.clubsAndPartnersPage.tsvAllachRole}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="relative p-6 sm:p-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] via-transparent to-green-500/[0.06] dark:from-green-500/[0.06] dark:to-green-500/[0.12]" />
                  <p className="relative text-foreground/80 text-sm sm:text-base leading-relaxed">
                    {t.clubsAndPartnersPage.tsvAllachDesc}
                  </p>
                </div>

                {/* Team Photo + Quote side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/40">
                  <div className="overflow-hidden">
                    <img
                      src={tsvTestimonial}
                      alt="TSV Allach 09 Coaching Session"
                      className="w-full h-full object-cover min-h-[200px] md:min-h-full"
                    />
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center bg-muted/20">
                    <blockquote className="text-foreground/70 text-xs sm:text-sm leading-relaxed italic mb-4">
                      {t.clubsAndPartnersPage.tsvAllachQuote}
                    </blockquote>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      {t.clubsAndPartnersPage.tsvAllachPartnership}
                    </p>
                  </div>
                </div>

                {/* Features + CTA */}
                <div className="p-6 sm:p-8 border-t border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                    {t.clubsAndPartnersPage.tsvAllachFeatures.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-foreground/80">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" strokeWidth={2} />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <a href="https://www.tsvallach09.de/" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full sm:w-auto rounded-xl font-semibold text-sm bg-gradient-to-r from-green-600 to-green-500 text-white hover:brightness-110 shadow-lg shadow-green-500/20">
                      {t.clubsAndPartnersPage.visitWebsite}
                      <ExternalLink className="ml-2 w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </FadeInSection>

            {/* Sportecke München — Custom Rich Card */}
            <FadeInSection>
              <div className="glass-card rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                {/* Hero Banner — Store image */}
                <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">
                  <img
                    src={sporteckeStore}
                    alt="Sportecke München Store"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-blue-900/40" />
                  {/* Badge */}
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 text-white text-[10px] sm:text-xs font-semibold shadow-lg">
                    {t.clubsAndPartnersPage.sporteckeBadge}
                  </span>
                  {/* Logo + Name overlay */}
                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-white/90 backdrop-blur-sm">
                      <img src={sporteckeLogo} alt="Sportecke München" className="w-full h-full object-contain p-1.5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                        {t.clubsAndPartnersPage.sporteckeName}
                      </h3>
                      <p className="text-blue-300 text-xs sm:text-sm font-semibold drop-shadow-md">
                        {t.clubsAndPartnersPage.sporteckeRole}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="relative p-6 sm:p-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-blue-500/[0.06] dark:from-blue-500/[0.06] dark:to-blue-500/[0.12]" />
                  <p className="relative text-foreground/80 text-sm sm:text-base leading-relaxed">
                    {t.clubsAndPartnersPage.sporteckeDesc}
                  </p>
                </div>

                {/* Testimonial Photo + Quote side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/40">
                  <div className="overflow-hidden">
                    <img
                      src={sporteckeTestimonial}
                      alt="Sportecke München Partner"
                      className="w-full h-full object-cover min-h-[200px] md:min-h-full"
                    />
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center bg-muted/20">
                    <blockquote className="text-foreground/70 text-xs sm:text-sm leading-relaxed italic mb-4">
                      {t.clubsAndPartnersPage.sporteckeQuote}
                    </blockquote>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      {t.clubsAndPartnersPage.sporteckePartnership}
                    </p>
                  </div>
                </div>

                {/* Features + CTA */}
                <div className="p-6 sm:p-8 border-t border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                    {t.clubsAndPartnersPage.sporteckeFeatures.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-foreground/80">
                        <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" strokeWidth={2} />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <a href="https://www.sportecke-muenchen.de/" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full sm:w-auto rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:brightness-110 shadow-lg shadow-blue-500/20">
                      {t.clubsAndPartnersPage.visitWebsite}
                      <ExternalLink className="ml-2 w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ─── Why Partner With Us? ─── */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent dark:via-primary/[0.04]" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.clubsAndPartnersPage.whyPartnerTitle}{" "}
              <span className="text-gradient-gold">{t.clubsAndPartnersPage.whyPartnerHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t.clubsAndPartnersPage.whyPartnerDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {t.clubsAndPartnersPage.whyPartnerBenefits.map((benefit, i) => {
              const BenefitIcon = whyBenefitIcons[i] ?? Star;
              return (
                <FadeInSection key={i} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-5 sm:p-6 hover:border-primary/20 hover:shadow-gold transition-all duration-300 cursor-default h-full"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-gold-subtle flex items-center justify-center mb-4">
                      <BenefitIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{benefit.desc}</p>
                  </motion.div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Join Us CTA ─── */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeInSection className="text-center mb-10 sm:mb-14 px-2">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {t.clubsAndPartnersPage.joinTitle}{" "}
              <span className="text-gradient-gold">{t.clubsAndPartnersPage.joinHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-3xl mx-auto">
              {t.clubsAndPartnersPage.joinDesc}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {/* For Clubs */}
            <FadeInSection delay={0}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card rounded-2xl p-6 sm:p-8 hover:border-primary/20 hover:shadow-gold transition-all duration-300 h-full flex flex-col"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2">
                  {t.clubsAndPartnersPage.joinClubTitle}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-6 flex-1">
                  {t.clubsAndPartnersPage.joinClubDesc}
                </p>
                <Button
                  onClick={() => navigate("/onboarding")}
                  className="w-full rounded-xl font-semibold text-sm bg-gradient-gold text-primary-foreground hover:brightness-110 shadow-gold"
                >
                  {t.clubsAndPartnersPage.joinClubCta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </FadeInSection>

            {/* For Suppliers */}
            <FadeInSection delay={0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card rounded-2xl p-6 sm:p-8 hover:border-primary/20 hover:shadow-gold transition-all duration-300 h-full flex flex-col"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                  <Handshake className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2">
                  {t.clubsAndPartnersPage.joinSupplierTitle}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-6 flex-1">
                  {t.clubsAndPartnersPage.joinSupplierDesc}
                </p>
                <Button
                  onClick={() => navigate("/onboarding")}
                  className="w-full rounded-xl font-semibold text-sm glass-card bg-gold-on-hover text-foreground"
                >
                  {t.clubsAndPartnersPage.joinSupplierCta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </FadeInSection>
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
              {t.clubsAndPartnersPage.ctaTitle}
              <br />
              <span className="text-gradient-gold">{t.clubsAndPartnersPage.ctaHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 sm:mb-10">
              {t.clubsAndPartnersPage.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => navigate("/onboarding")}
                className="glass-card bg-gold-on-hover text-foreground font-semibold text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.clubsAndPartnersPage.ctaButton}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/about")}
                className="glass-card bg-red-chrome-on-hover text-foreground text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
              >
                {t.clubsAndPartnersPage.learnMore}
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClubsAndPartners;
