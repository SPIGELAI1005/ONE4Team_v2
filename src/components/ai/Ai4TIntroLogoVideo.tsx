import { useEffect, useRef } from "react";
import ai4tIntroLogo from "@/assets/ai-4-t-intro-logo.mp4";
import ai4tGlassLogo from "@/assets/ai-4-t-glass-logo.png";
import { cn } from "@/lib/utils";

interface Ai4TIntroLogoVideoProps {
  className?: string;
  /** Fraction of viewport height used as center band (0–1). Used when playMode is `center`. */
  centerBand?: number;
  /**
   * `center` — play when the element crosses the viewport mid-band (hero sections).
   * `visible` — play when enough of the element is on screen (cards / side panels).
   */
  playMode?: "center" | "visible";
}

export function Ai4TIntroLogoVideo({
  className,
  centerBand = 0.22,
  playMode = "center",
}: Ai4TIntroLogoVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedRef = useRef(false);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const holdLastFrame = () => {
      hasPlayedRef.current = true;
      isPlayingRef.current = false;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.04);
      }
      video.pause();
    };

    const tryPlay = () => {
      if (prefersReducedMotion || hasPlayedRef.current || isPlayingRef.current) return;
      isPlayingRef.current = true;
      void video.play().catch(() => {
        isPlayingRef.current = false;
      });
    };

    const isSectionCentered = () => {
      const rect = container.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const threshold = window.innerHeight * centerBand;
      return Math.abs(sectionCenter - viewportCenter) <= threshold;
    };

    video.pause();
    video.currentTime = 0;
    video.addEventListener("ended", holdLastFrame);

    if (playMode === "visible") {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
            tryPlay();
          }
        },
        { threshold: [0, 0.35, 0.5, 0.75], rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(container);
      return () => {
        video.removeEventListener("ended", holdLastFrame);
        observer.disconnect();
      };
    }

    const maybePlay = () => {
      if (!isSectionCentered()) return;
      tryPlay();
    };

    const onScrollOrResize = () => maybePlay();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    maybePlay();

    return () => {
      video.removeEventListener("ended", holdLastFrame);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [centerBand, playMode]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full min-h-0 overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        className="absolute inset-0 z-[1] block h-full w-full scale-[1.015] object-cover object-top"
        muted
        playsInline
        preload="auto"
        poster={ai4tGlassLogo}
        aria-label="AI 4 T intro logo animation"
      >
        <source src={ai4tIntroLogo} type="video/mp4" />
      </video>
    </div>
  );
}
