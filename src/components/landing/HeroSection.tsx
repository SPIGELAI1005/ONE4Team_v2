import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, Shield, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useRef, useEffect, useState, useCallback } from "react";
import logo from "@/assets/one4team-logo.png";
import FootballFieldAnimation from "./FootballFieldAnimation";

/** Animated counter that counts from 0 to `target` when visible */
function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
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

  return <span ref={counterRef}>{count.toLocaleString()}{suffix}</span>;
}

/** Glass card that reflects colors sampled from the canvas behind it */
function ReflectiveGlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ r: 0, g: 0, b: 0, intensity: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let rafId = 0;
    let lastSample = 0;
    const SAMPLE_INTERVAL = 80; // ~12fps sampling

    const sample = (now: number) => {
      rafId = requestAnimationFrame(sample);
      if (now - lastSample < SAMPLE_INTERVAL) return;
      lastSample = now;

      // Find the canvas in the same section
      const section = card.closest("section");
      const canvas = section?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const cardRect = card.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Map card center + edges to canvas pixel coordinates
      const scaleX = (canvas.width / dpr) / canvasRect.width;
      const scaleY = (canvas.height / dpr) / canvasRect.height;

      const cx = (cardRect.left + cardRect.width / 2 - canvasRect.left) * scaleX * dpr;
      const cy = (cardRect.top + cardRect.height / 2 - canvasRect.top) * scaleY * dpr;
      const hw = (cardRect.width / 2) * scaleX * dpr;
      const hh = (cardRect.height / 2) * scaleY * dpr;

      // Sample a grid of points across the card area
      const points = [
        [cx, cy],                       // center
        [cx - hw * 0.7, cy],            // left
        [cx + hw * 0.7, cy],            // right
        [cx, cy - hh * 0.7],            // top
        [cx, cy + hh * 0.7],            // bottom
        [cx - hw * 0.5, cy - hh * 0.5], // top-left
        [cx + hw * 0.5, cy - hh * 0.5], // top-right
        [cx - hw * 0.5, cy + hh * 0.5], // bottom-left
        [cx + hw * 0.5, cy + hh * 0.5], // bottom-right
        // Edge samples (just outside the card boundary for approaching elements)
        [cx - hw * 1.2, cy],
        [cx + hw * 1.2, cy],
        [cx, cy - hh * 1.2],
        [cx, cy + hh * 1.2],
      ];

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      let maxBrightness = 0;

      for (const [px, py] of points) {
        const x = Math.round(px);
        const y = Math.round(py);
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;

        try {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3];
          if (a < 10) continue; // skip transparent

          // Weight saturated/bright colors more
          const brightness = (r + g + b) / 3;
          const saturation = Math.max(r, g, b) - Math.min(r, g, b);
          const weight = 1 + saturation / 128;

          rSum += r * weight;
          gSum += g * weight;
          bSum += b * weight;
          count += weight;
          maxBrightness = Math.max(maxBrightness, brightness);
        } catch {
          // Canvas tainted or out of bounds
        }
      }

      if (count > 0) {
        const r = Math.round(rSum / count);
        const g = Math.round(gSum / count);
        const b = Math.round(bSum / count);
        // Intensity based on how colorful/bright the sampled area is
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        const intensity = Math.min(1, (saturation / 120) * (maxBrightness / 180));
        setGlow({ r, g, b, intensity });
      }
    };

    rafId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`cursor-default ${className}`}
    >
      {children}
    </motion.div>
  );
}

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.5]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.6], [0.08, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <FootballFieldAnimation lang={language} />
        {/* Light mode: lighter overlays so the animation shows through vividly */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:from-background/80 dark:via-background/40 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 dark:from-background/60 dark:via-transparent dark:to-background/60" />
      </motion.div>

      {/* Scroll-linked ambient glow */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[200px] sm:w-[400px] sm:h-[300px] md:w-[600px] md:h-[400px] bg-primary rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px] pointer-events-none"
        style={{ scale: glowScale, opacity: glowOpacity }}
      />

      {/* Content */}
      <motion.div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 md:py-20 text-center" style={{ y: contentY, opacity }}>
        {/* Logo — no tile, transparent background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <img src={logo} alt="ONE4Team" className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 mx-auto drop-shadow-2xl" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
          className="font-logo text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 sm:mb-6"
        >
          <span className="text-foreground">ONE</span>
          <span className="text-gradient-gold-animated mx-0.5 sm:mx-1 md:mx-2">4</span>
          <span className="text-foreground">Team</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base sm:text-lg md:text-2xl text-foreground/80 dark:text-foreground/90 max-w-3xl mx-auto mb-3 sm:mb-4 font-light tracking-tight px-2"
        >
          {t.hero.tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-sm sm:text-base md:text-lg text-foreground/60 dark:text-foreground/70 max-w-2xl mx-auto mb-8 sm:mb-12 px-2"
        >
          {t.hero.subtitle}
          <br />
          {t.hero.subtitleLine2}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-8 sm:mb-10 px-4 sm:px-0"
        >
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
            onClick={() => navigate("/features")}
            className="glass-card bg-red-chrome-on-hover text-foreground text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 rounded-2xl haptic-press"
          >
            {t.hero.watchDemo}
          </Button>
        </motion.div>

        {/* Stats — iOS liquid glass cards with animated counters */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-xl mx-auto px-2 sm:px-0"
        >
          {[
            { icon: Users, label: t.hero.membersManaged, target: 50, suffix: "K+" },
            { icon: Shield, label: t.hero.activeClubs, target: 500, suffix: "+" },
            { icon: Trophy, label: t.hero.sportsSupported, target: 20, suffix: "+" },
          ].map((stat, i) => (
            <ReflectiveGlassCard key={i} className="text-center p-3 sm:p-4 md:p-5">
              <div className="relative z-10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={2000 + i * 300} />
                </div>
                <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{stat.label}</div>
              </div>
            </ReflectiveGlassCard>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
