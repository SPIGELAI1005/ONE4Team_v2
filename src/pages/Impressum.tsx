import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Scale, ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

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

const Impressum = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const imp = t.impressumPage;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-14">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-background dark:from-primary/[0.06]" />
        </motion.div>

        <motion.div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 text-center" style={{ opacity: contentOpacity }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3"
          >
            {imp.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-sm sm:text-base text-muted-foreground"
          >
            {imp.subtitle}
          </motion.p>
        </motion.div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          {/* Company Info */}
          <FadeInSection>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-4">{imp.companyInfo.heading}</h2>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{imp.companyInfo.name}</p>
                <p>{imp.companyInfo.represented}</p>
                <p>{imp.companyInfo.address}</p>
                <p>{imp.companyInfo.email}</p>
                <p>{imp.companyInfo.website}</p>
              </div>
            </div>
          </FadeInSection>

          {/* Registration */}
          <FadeInSection delay={0.05}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.registration.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.registration.content}</p>
            </div>
          </FadeInSection>

          {/* VAT */}
          <FadeInSection delay={0.1}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.vat.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.vat.content}</p>
            </div>
          </FadeInSection>

          {/* Responsible for Content */}
          <FadeInSection delay={0.15}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.responsibility.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.responsibility.content}</p>
            </div>
          </FadeInSection>

          {/* EU Dispute Resolution */}
          <FadeInSection delay={0.2}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.disputeResolution.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {imp.disputeResolution.content.split("https://ec.europa.eu/consumers/odr")[0]}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  https://ec.europa.eu/consumers/odr
                  <ExternalLink className="w-3 h-3" />
                </a>
                {imp.disputeResolution.content.split("https://ec.europa.eu/consumers/odr")[1]}
              </p>
            </div>
          </FadeInSection>

          {/* Liability for Content */}
          <FadeInSection delay={0.25}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.liability.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.liability.content}</p>
            </div>
          </FadeInSection>

          {/* Liability for Links */}
          <FadeInSection delay={0.3}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.liabilityLinks.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.liabilityLinks.content}</p>
            </div>
          </FadeInSection>

          {/* Copyright */}
          <FadeInSection delay={0.35}>
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">{imp.copyright.heading}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{imp.copyright.content}</p>
            </div>
          </FadeInSection>

          <FadeInSection className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="glass-card rounded-2xl px-6 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.common.back}
            </Button>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Impressum;
