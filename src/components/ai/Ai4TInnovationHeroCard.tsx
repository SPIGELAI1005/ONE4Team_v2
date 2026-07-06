import { motion } from "framer-motion";
import { Ai4TIntroLogoVideo } from "@/components/ai/Ai4TIntroLogoVideo";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { cn } from "@/lib/utils";

interface Ai4TInnovationHeroCardProps {
  title: string;
  titleHighlight: string;
  description: string;
  className?: string;
}

export function Ai4TInnovationHeroCard({
  title,
  titleHighlight,
  description,
  className,
}: Ai4TInnovationHeroCardProps) {
  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-3xl border border-border/60 shadow-gold transition-all hover:border-primary/20",
        "dark:border-white/10 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-black dark:shadow-[0_24px_80px_-24px_rgba(227,30,36,0.35)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-[#e31e24]/[0.04] dark:from-[rgba(227,30,36,0.18)] dark:via-transparent dark:to-[rgba(255,255,255,0.06)]" />

      <div className="relative grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative aspect-[683/1024] h-full w-auto min-w-[9rem] max-w-[46vw] shrink-0 overflow-hidden rounded-l-3xl bg-black sm:min-w-[10.5rem] sm:max-w-[12.5rem] md:max-w-[14.5rem] lg:max-w-[16.5rem]"
        >
          <Ai4TIntroLogoVideo className="h-full w-full" />
        </motion.div>

        <div className="flex flex-col justify-center p-4 text-left sm:p-6 md:p-12">
          <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-5xl">
            {title}{" "}
            <span className="text-gradient-gold">{titleHighlight}</span>
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm md:text-lg">
            <BrandedText text={description} ai4tOnly />
          </p>
        </div>
      </div>
    </div>
  );
}
