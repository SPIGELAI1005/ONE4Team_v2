import { motion } from "framer-motion";
import { Users, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/one4team-logo.png";
import FootballFieldAnimation from "./FootballFieldAnimation";

const DualWorldSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-20 md:py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16 px-2"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            {t.dualWorld.heading}
            <br />
            <span className="text-gradient-gold">{t.dualWorld.headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            {t.dualWorld.description}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto pt-28 sm:pt-32 md:pt-40">
          {/* Background tile with animated football field */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 -mx-3 sm:-mx-4 md:-mx-6 -mb-3 sm:-mb-4 md:-mb-6 top-10 sm:top-12 md:top-16 rounded-3xl border border-border/50 overflow-hidden"
          >
            <FootballFieldAnimation />
            <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />
          </motion.div>

          {/* Logo image + text centered on top border */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute inset-x-0 top-10 sm:top-12 md:top-16 z-10 flex flex-col items-center"
          >
            <img src={logo} alt="ONE4Team" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-lg -translate-y-[57.5%]" />
          </motion.div>

          {/* Logo text above the cards */}
          <div className="relative z-10 text-center mb-4 sm:mb-5 md:mb-6 -mt-6 sm:-mt-8 md:-mt-10">
            <span className="font-logo text-3xl sm:text-4xl md:text-5xl tracking-tight">
              <span className="text-foreground">ONE</span>
              <span className="text-gradient-gold-animated mx-0.5 sm:mx-1 md:mx-2">4</span>
              <span className="text-foreground">Team</span>
            </span>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Club World */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate("/onboarding?world=club")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border p-5 sm:p-8 md:p-10 hover:border-primary/40 transition-all duration-500 hover:shadow-gold world-card-hover"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-gold-subtle rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-4 sm:mb-6">
                <Users className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground">{t.dualWorld.clubWorld}</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">
                {t.dualWorld.clubWorldDesc}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {[t.common.players, t.common.trainers, t.common.staff, t.common.members, t.common.parents].map((role) => (
                  <span key={role} className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {role}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                {t.dualWorld.enterClubWorld} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Partner World */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate("/onboarding?world=partner")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border p-5 sm:p-8 md:p-10 hover:border-accent/40 transition-all duration-500 hover:shadow-[0_0_30px_hsl(0_65%_50%/0.15)] world-card-hover"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-accent flex items-center justify-center mb-4 sm:mb-6">
                <Briefcase className="w-5 h-5 sm:w-7 sm:h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground">{t.dualWorld.partnerWorld}</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">
                {t.dualWorld.partnerWorldDesc}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {[t.common.sponsors, t.common.suppliers, t.common.consultants, t.common.services].map((role) => (
                  <span key={role} className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {role}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-accent font-medium group-hover:gap-3 gap-2 transition-all">
                {t.dualWorld.enterPartnerWorld} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DualWorldSection;
