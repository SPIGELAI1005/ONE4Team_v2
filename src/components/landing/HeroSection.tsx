import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl glass-card flex items-center justify-center shadow-gold">
            <img src={logo} alt="ONE4Team" className="w-16 h-16 drop-shadow-2xl" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6"
        >
          <span className="text-foreground">One</span>
          <span className="text-gradient-gold">4</span>
          <span className="text-foreground">Team</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 font-light tracking-tight"
        >
          The complete operating system for hobby clubs.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-lg text-muted-foreground/60 max-w-2xl mx-auto mb-12"
        >
          People · Teams · Infrastructure · Partners · Community — all in one AI-powered platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-20"
        >
          <Button
            size="lg"
            onClick={() => navigate("/onboarding")}
            className="bg-gradient-gold text-primary-foreground font-semibold text-base px-8 py-6 shadow-gold hover:opacity-90 transition-opacity rounded-2xl haptic-press"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="glass-card text-foreground text-base px-8 py-6 rounded-2xl haptic-press"
          >
            Watch Demo
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-3 gap-6 max-w-xl mx-auto"
        >
          {[
            { icon: Users, label: "Members Managed", value: "50K+" },
            { icon: Shield, label: "Active Clubs", value: "500+" },
            { icon: Trophy, label: "Sports Supported", value: "20+" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.95 }}
              className="text-center p-4 rounded-2xl glass-card cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <stat.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
