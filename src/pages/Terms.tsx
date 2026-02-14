import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { FileText, ArrowLeft } from "lucide-react";
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

const Terms = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3"
          >
            {t.termsPage.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-sm sm:text-base text-muted-foreground"
          >
            {t.termsPage.lastUpdated}
          </motion.p>
        </motion.div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeInSection className="mb-8">
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {t.termsPage.subtitle}
            </p>
          </FadeInSection>

          <div className="space-y-8">
            {t.termsPage.sections.map((section, i) => (
              <FadeInSection key={i} delay={i * 0.03}>
                <div className="glass-card rounded-2xl p-5 sm:p-6">
                  <h2 className="font-display font-bold text-foreground text-base sm:text-lg mb-3">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>

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

export default Terms;
