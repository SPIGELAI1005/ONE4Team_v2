import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  Crown,
  Gem,
  Medal,
  Ribbon,
  Shield,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { levelFromXp, type ClubProgressLevel } from "@/lib/club-member-progress";

/**
 * Cup / award icons ordered from early progress → peak achievement.
 * Steps advance every ~10 XP or ~10% within a level band (whichever is further).
 */
export const PROGRESS_AWARD_ICONS: readonly LucideIcon[] = [
  Medal,
  Award,
  Ribbon,
  Trophy,
  Star,
  Shield,
  ShieldCheck,
  BadgeCheck,
  Gem,
  Crown,
  // Higher levels cycle a richer crest set
  Medal,
  Award,
  Trophy,
  Star,
  Shield,
  Ribbon,
  BadgeCheck,
  Gem,
  Crown,
  Trophy,
] as const;

export interface ProgressAwardIconMeta {
  Icon: LucideIcon;
  /** Stable 0-based step used for the icon palette. */
  step: number;
  level: ClubProgressLevel;
  /** 0–10 bucket within the current level (10% / ~10 XP). */
  withinLevelStep: number;
}

/**
 * Within-level step: max of floor(xpInLevel / 10) and floor(progress% / 10), capped 0–10.
 * Level bands then offset the palette so rookies and legends do not share the same crest.
 */
export function progressAwardWithinLevelStep(xp: number): {
  withinLevelStep: number;
  level: ClubProgressLevel;
  levelIndex: number;
  progress01: number;
} {
  const meta = levelFromXp(xp);
  const xpInLevel = Math.max(0, xp - meta.floor);
  const byXp = Math.floor(xpInLevel / 10);
  const byPct = Math.floor(meta.progress01 * 10);
  const withinLevelStep = Math.min(10, Math.max(0, Math.max(byXp, byPct)));
  return {
    withinLevelStep,
    level: meta.level,
    levelIndex: meta.levelIndex,
    progress01: meta.progress01,
  };
}

export function progressAwardStepIndex(xp: number): number {
  const { withinLevelStep, levelIndex } = progressAwardWithinLevelStep(xp);
  // Each major level starts a new decade of icons (0–9 within band).
  return (Math.max(1, levelIndex) - 1) * 10 + Math.min(9, withinLevelStep);
}

export function getProgressAwardIcon(xp: number): ProgressAwardIconMeta {
  const { withinLevelStep, level } = progressAwardWithinLevelStep(xp);
  const step = progressAwardStepIndex(xp);
  const Icon = PROGRESS_AWARD_ICONS[step % PROGRESS_AWARD_ICONS.length] ?? Trophy;
  return { Icon, step, level, withinLevelStep };
}
