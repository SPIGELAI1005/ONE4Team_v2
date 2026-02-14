import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Users, Calendar, Trophy, CreditCard, MessageSquare,
  Briefcase, ShoppingBag, Bot, BarChart3, Globe
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FeatureCard = ({ feature, index }: { feature: FeatureItem; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -20]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.8]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group p-3 sm:p-5 rounded-xl sm:rounded-2xl glass-card hover:border-primary/20 transition-all duration-300 hover:shadow-gold cursor-default"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-gold-subtle flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-semibold text-foreground mb-0.5 sm:mb-1 text-xs sm:text-sm">{feature.title}</h3>
      <p className="text-muted-foreground text-[10px] sm:text-xs leading-relaxed">{feature.desc}</p>
    </motion.div>
  );
};

const FeaturesSection = () => {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "center center"] });
  const headingY = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const headingOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  const features = [
    { icon: Users, title: t.features.memberManagement, desc: t.features.memberManagementDesc },
    { icon: Calendar, title: t.features.trainingTeams, desc: t.features.trainingTeamsDesc },
    { icon: Trophy, title: t.features.matchManagement, desc: t.features.matchManagementDesc },
    { icon: CreditCard, title: t.features.paymentsFees, desc: t.features.paymentsFeesDesc },
    { icon: MessageSquare, title: t.features.communication, desc: t.features.communicationDesc },
    { icon: Briefcase, title: t.features.partnerPortal, desc: t.features.partnerPortalDesc },
    { icon: ShoppingBag, title: t.features.clubShop, desc: t.features.clubShopDesc },
    { icon: Globe, title: t.features.publicClubPage, desc: t.features.publicClubPageDesc },
    { icon: Bot, title: t.features.aiCoTrainer, desc: t.features.aiCoTrainerDesc },
    { icon: BarChart3, title: t.features.smartDashboards, desc: t.features.smartDashboardsDesc },
  ];

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 md:py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div style={{ y: headingY, opacity: headingOpacity }} className="text-center mb-10 sm:mb-16 px-2">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            {t.features.heading}
            <br />
            <span className="text-gradient-gold">{t.features.headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            {t.features.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
