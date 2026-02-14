import { useRef, useEffect, useCallback } from "react";
import type { Vec2, GameState } from "./football/types";
import { getField } from "./football/types";
import { createInitialState, updateGameState } from "./football/ai";
import {
  drawField, drawCrowd, drawOffsideLine, drawPlayers,
  drawRefereePlayer, drawBall, drawConfettiItem, drawBubble,
  drawFormationLabels, drawSetPieceLabel, drawVignette,
  drawScoreboard, drawRadar, invalidateFieldCache,
} from "./football/renderer";

interface FootballFieldAnimationProps {
  lang?: string;
}

const FootballFieldAnimation = ({ lang = "en" }: FootballFieldAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<GameState | null>(null);
  const supportersRef = useRef<Vec2[]>([]);
  const prevTimeRef = useRef<number>(0);
  const isVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const isDarkRef = useRef(true);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Detect dark/light mode changes
  const detectTheme = useCallback(() => {
    isDarkRef.current = document.documentElement.classList.contains("dark");
    invalidateFieldCache(); // re-render field with new theme colors
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ─── Theme detection: watch for class changes on <html> ───
    detectTheme();
    const themeObserver = new MutationObserver(() => { detectTheme(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // ─── prefers-reduced-motion: still animate but at 30fps ───
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    motionQuery.addEventListener("change", onMotionChange);

    // ─── IntersectionObserver: pause when off-screen ───
    const observer = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    // ─── Resize ───
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
      const isVertical = cw < 768 && ch > cw;
      const w = isVertical ? ch : cw;
      const h = isVertical ? cw : ch;
      const { state, supporters } = createInitialState(w, h);
      stateRef.current = state;
      supportersRef.current = supporters;
      invalidateFieldCache();
    };
    resize();
    window.addEventListener("resize", resize);
    prevTimeRef.current = performance.now();

    // ─── Frame skip counter for reduced-motion (30fps) ───
    let frameSkip = false;

    // ─── Main animation loop ───
    const animate = (timestamp: number) => {
      animRef.current = requestAnimationFrame(animate);

      // Pause when off-screen
      if (!isVisibleRef.current) { prevTimeRef.current = timestamp; return; }

      // Reduced motion: skip every other frame → ~30fps
      if (reducedMotionRef.current) {
        frameSkip = !frameSkip;
        if (frameSkip) { prevTimeRef.current = timestamp; return; }
      }

      const s = stateRef.current;
      if (!s) return;

      const dt = Math.min((timestamp - prevTimeRef.current) / 16.67, 3);
      prevTimeRef.current = timestamp;

      const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
      const isVertical = cw < 768 && ch > cw;
      const w = isVertical ? ch : cw;
      const h = isVertical ? cw : ch;
      const dpr = window.devicePixelRatio || 1;
      const f = getField(w, h);

      // Update game state
      updateGameState(s, dt, supportersRef.current, langRef.current);
      const now = Date.now();

      // ─── Render ───
      const isDark = isDarkRef.current;
      ctx.clearRect(0, 0, cw, ch);

      if (isVertical) { ctx.save(); ctx.translate(cw, 0); ctx.rotate(Math.PI / 2); }

      // Static field (from offscreen canvas cache)
      drawField(ctx, w, h, f, dpr, isDark);

      // Crowd (team-colored, reactive)
      drawCrowd(ctx, supportersRef.current, s, f, now, isDark);

      // Offside lines
      drawOffsideLine(ctx, s, f, 0, isDark);
      drawOffsideLine(ctx, s, f, 1, isDark);

      // Set piece label
      drawSetPieceLabel(ctx, s, f, langRef.current);

      // Players (with fatigue indicators, ball holder label, smooth color transitions)
      drawPlayers(ctx, s, isVertical);

      // Referee
      drawRefereePlayer(ctx, s.referee, isVertical);

      // Ball (with spin and bounce)
      drawBall(ctx, s.ball, isDark);

      // Confetti
      s.confetti.forEach((c) => drawConfettiItem(ctx, c));

      // Chat bubbles
      s.chatBubbles.forEach((b) => {
        if (isVertical) {
          ctx.save(); ctx.translate(b.pos.x, b.pos.y); ctx.rotate(-Math.PI / 2);
          drawBubble(ctx, { ...b, pos: { x: 0, y: 0 } }); ctx.restore();
        } else {
          drawBubble(ctx, b);
        }
      });

      // Formation labels
      drawFormationLabels(ctx, s, f);

      if (isVertical) { ctx.restore(); }

      // ─── Screen-space overlays ───
      drawVignette(ctx, cw, ch, isDark);
      drawScoreboard(ctx, s, f, cw, isVertical, now);

      // Mini radar (desktop only)
      if (!isVertical) drawRadar(ctx, s, f);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, [detectTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-90 dark:opacity-60"
    />
  );
};

export default FootballFieldAnimation;
