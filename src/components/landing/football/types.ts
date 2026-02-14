// ─── Football Animation Types, Constants & Utilities ───

export interface Vec2 { x: number; y: number }

export interface Formation { name: string; def: number[]; mid: number[]; fwd: number[] }

export type PlayerRole = "gk" | "def" | "mid" | "fwd" | "bench" | "coach";

export interface Player {
  pos: Vec2; vel: Vec2; team: number; basePos: Vec2;
  hasBall: boolean; isGoalkeeper: boolean; isBench: boolean; isCoach: boolean;
  role: PlayerRole;
  jerseyNumber: number; speed: number; baseSpeed: number;
  dribbleAngle: number; fieldIndex: number;
  kickPhase: number; kickLeg: number;
  divePhase: number; diveDir: number;
  fatigue: number; // 0–1
  distanceTraveled: number;
}

export interface ChatBubble { text: string; pos: Vec2; life: number; maxLife: number }

export interface Confetti {
  pos: Vec2; vel: Vec2; color: string; life: number;
  size: number; rotation: number; rotSpeed: number;
}

export interface Ball {
  pos: Vec2; vel: Vec2;
  targetPlayerIdx: number;
  inFlight: boolean; flightProgress: number;
  flightStart: Vec2; flightEnd: Vec2;
  speed: number; curve: number; height: number;
  bouncing: boolean; bounceCount: number; bounceHeight: number; bouncePhase: number;
  isShot: boolean;
  spin: number;
}

export interface Referee { pos: Vec2; vel: Vec2 }

export interface FieldRect {
  l: number; r: number; t: number; b: number;
  w: number; h: number; cx: number; cy: number;
}

export type GamePhase = "buildup" | "attack" | "shoot" | "reset" | "set_piece";
export type SetPieceType = "none" | "corner" | "throw_in" | "free_kick" | "goal_kick";

export interface GameState {
  players: Player[];
  ball: Ball;
  referee: Referee;
  teamColors: [[string, string, string], [string, string, string]];
  prevTeamColors: [[string, string, string], [string, string, string]] | null;
  colorTransitionAlpha: number;
  formations: [Formation, Formation];
  tactic: [string, string];
  chatBubbles: ChatBubble[];
  confetti: Confetti[];
  lastColorChange: number; lastChat: number; lastAction: number;
  lastTacticChange: number; lastSubstitution: number;
  ballHolder: number; possession: number;
  phase: GamePhase;
  setPieceType: SetPieceType;
  setPieceTimer: number;
  setPieceTeam: number;
  phaseTimer: number;
  score: [number, number];
  matchStart: number;
  goalCelebration: number;
  formationLabel: [{ text: string; alpha: number }, { text: string; alpha: number }];
  possessionCount: [number, number];
  crowdWavePhase: number;
  width: number; height: number;
}

// ─── Color Palettes (shirt, shorts, number) ───
export const TEAM_PALETTES: [string, string, string][] = [
  ["#2ecc40", "#1a7a27", "#fff"], ["#e74c3c", "#a93226", "#fff"],
  ["#ffffff", "#333333", "#222"], ["#f1c40f", "#222222", "#222"],
  ["#3498db", "#1a5276", "#fff"], ["#e67e22", "#784212", "#fff"],
  ["#9b59b6", "#6c3483", "#fff"], ["#1abc9c", "#0e6655", "#fff"],
  ["#2c3e50", "#e74c3c", "#fff"], ["#f39c12", "#ecf0f1", "#222"],
];

// ─── Formations ───
export const FORMATIONS: Formation[] = [
  { name: "4-4-2", def: [0.15, 0.38, 0.62, 0.85], mid: [0.15, 0.38, 0.62, 0.85], fwd: [0.35, 0.65] },
  { name: "4-3-3", def: [0.15, 0.38, 0.62, 0.85], mid: [0.25, 0.5, 0.75], fwd: [0.2, 0.5, 0.8] },
  { name: "3-5-2", def: [0.25, 0.5, 0.75], mid: [0.1, 0.3, 0.5, 0.7, 0.9], fwd: [0.35, 0.65] },
  { name: "4-2-3-1", def: [0.15, 0.38, 0.62, 0.85], mid: [0.35, 0.65], fwd: [0.2, 0.5, 0.8] },
  { name: "5-3-2", def: [0.1, 0.28, 0.5, 0.72, 0.9], mid: [0.25, 0.5, 0.75], fwd: [0.35, 0.65] },
  { name: "3-4-3", def: [0.25, 0.5, 0.75], mid: [0.15, 0.38, 0.62, 0.85], fwd: [0.2, 0.5, 0.8] },
];

// ─── Phrase banks (localised) ───
export interface PhraseBank {
  chat: string[];
  coach: string[];
  supporter: string[];
  ref: string[];
  save: string[];
  miss: string[];
  goal: string[];
  goalCrowd: string[];
  intercepted: string;
  foul: string;
  subOn: string;
  subOff: string;
  setPiece: Record<string, string>;
}

const EN_PHRASES: PhraseBank = {
  chat: [
    "Pass it!", "Great ball!", "Man on!", "Shoot!", "Well done!",
    "Press them!", "Keep it up!", "Run!", "Cover!", "Nice one!",
    "Here! Here!", "Go go go!", "Hold the line!", "Cross it!",
    "What a save!", "Unlucky!", "Stay focused!", "Mark your man!",
    "Let's go!", "Beautiful!", "Again!", "Come on lads!", "Push up!",
    "Time! Time!", "Square ball!", "Switch it!", "Brilliant!",
    "Keep shape!", "Close him down!",
  ],
  coach: [
    "Tighten up!", "More intensity!", "Stay compact!", "Width! Width!",
    "Control the tempo!", "Talk to each other!", "Good work boys!",
    "Keep possession!", "Press higher!", "Calm down!", "Be patient!",
    "Attack the space!", "4-4-2! Switch!", "Push the lines!",
    "Stay disciplined!", "Offside trap!", "High press now!", "Drop deeper!",
  ],
  supporter: [
    "GOOOL!", "Come on!", "Ref! That's a foul!", "Olé!",
    "We want a goal!", "Defense! Defense!", "Shoot!!",
    "What a game!", "Let's gooo!", "Amazing!", "Boo!",
    "MVP! MVP!", "Incredible!", "Yes yes yes!",
  ],
  ref: [
    "Play on!", "Foul!", "Free kick!", "Advantage!",
    "Yellow card!", "Corner kick!", "Goal kick!", "Throw in!",
  ],
  save: ["What a save!", "Denied!", "Great stop!", "Unbelievable save!"],
  miss: ["Wide!", "Off target!", "Just over!", "Close one!"],
  goal: ["GOOOL!"],
  goalCrowd: ["GOOOL!", "Amazing!", "Yes yes yes!", "Incredible!", "What a goal!"],
  intercepted: "Intercepted!",
  foul: "Foul!",
  subOn: "on",
  subOff: "off",
  setPiece: { corner: "Corner Kick", throw_in: "Throw In", free_kick: "Free Kick", goal_kick: "Goal Kick", none: "" },
};

const DE_PHRASES: PhraseBank = {
  chat: [
    "Abspielen!", "Starker Ball!", "Gegner!", "Schuss!", "Gut gemacht!",
    "Pressing!", "Weiter so!", "Lauf!", "Absichern!", "Stark!",
    "Hier! Hier!", "Los los los!", "Linie halten!", "Flanke!",
    "Was ein Halten!", "Pech!", "Konzentration!", "Deinen Mann decken!",
    "Los geht's!", "Wunderschön!", "Nochmal!", "Kommt Jungs!", "Aufrücken!",
    "Zeit! Zeit!", "Querpass!", "Verlagern!", "Brillant!",
    "Formation halten!", "Zumachen!",
  ],
  coach: [
    "Enger zusammen!", "Mehr Intensität!", "Kompakt bleiben!", "Breite! Breite!",
    "Tempo kontrollieren!", "Redet miteinander!", "Gute Arbeit, Jungs!",
    "Ballbesitz halten!", "Höher pressen!", "Ruhig bleiben!", "Geduldig sein!",
    "Räume attackieren!", "4-4-2! Umstellen!", "Linien schieben!",
    "Diszipliniert bleiben!", "Abseitsfalle!", "Hohes Pressing!", "Tiefer stehen!",
  ],
  supporter: [
    "TOOOR!", "Komm schon!", "Schiri! Das war ein Foul!", "Olé!",
    "Wir wollen ein Tor!", "Abwehr! Abwehr!", "Schuss!!",
    "Was ein Spiel!", "Auf geht's!", "Wahnsinn!", "Buh!",
    "MVP! MVP!", "Unglaublich!", "Ja ja ja!",
  ],
  ref: [
    "Weiterspielen!", "Foul!", "Freistoß!", "Vorteil!",
    "Gelbe Karte!", "Eckstoß!", "Abstoß!", "Einwurf!",
  ],
  save: ["Was eine Parade!", "Gehalten!", "Tolle Parade!", "Unglaublich gehalten!"],
  miss: ["Daneben!", "Vorbei!", "Knapp drüber!", "Knapp!"],
  goal: ["TOOOR!"],
  goalCrowd: ["TOOOR!", "Wahnsinn!", "Ja ja ja!", "Unglaublich!", "Was ein Tor!"],
  intercepted: "Abgefangen!",
  foul: "Foul!",
  subOn: "rein",
  subOff: "raus",
  setPiece: { corner: "Eckstoß", throw_in: "Einwurf", free_kick: "Freistoß", goal_kick: "Abstoß", none: "" },
};

const PHRASE_BANKS: Record<string, PhraseBank> = { en: EN_PHRASES, de: DE_PHRASES };

export function getPhrases(lang: string): PhraseBank {
  return PHRASE_BANKS[lang] || EN_PHRASES;
}

// Legacy exports (keep backward compat for imports)
export const CHAT_PHRASES = EN_PHRASES.chat;
export const COACH_PHRASES = EN_PHRASES.coach;
export const SUPPORTER_PHRASES = EN_PHRASES.supporter;
export const REF_PHRASES = EN_PHRASES.ref;
export const SAVE_PHRASES = EN_PHRASES.save;
export const MISS_PHRASES = EN_PHRASES.miss;

// ─── Utility functions ───
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const rnd = (mn: number, mx: number) => Math.random() * (mx - mn) + mn;
export const normalize = (v: Vec2): Vec2 => {
  const m = Math.hypot(v.x, v.y);
  return m > 0.001 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
};
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const bezier = (a: Vec2, ctrl: Vec2, b: Vec2, t: number): Vec2 => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t ** 2 * b.y,
});
export const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const pickTwoDistinct = <T,>(arr: T[]): [T, T] => {
  const a = Math.floor(Math.random() * arr.length);
  let b = a; while (b === a) b = Math.floor(Math.random() * arr.length);
  return [arr[a], arr[b]];
};

export function getField(w: number, h: number): FieldRect {
  const l = w * 0.1, r = w * 0.9, t = h * 0.15, b = h * 0.85;
  return { l, r, t, b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 };
}

export function buildTeamPositions(
  formation: Formation, _team: number, isLeft: boolean
): { x: number; y: number; role: PlayerRole; gk: boolean; fieldIndex: number }[] {
  const positions: { x: number; y: number; role: PlayerRole; gk: boolean; fieldIndex: number }[] = [];
  let idx = 0;
  positions.push({ x: isLeft ? 0.05 : 0.95, y: 0.5, role: "gk", gk: true, fieldIndex: idx++ });
  const defX = isLeft ? 0.2 : 0.8;
  formation.def.forEach((y) => positions.push({ x: defX, y, role: "def", gk: false, fieldIndex: idx++ }));
  const midX = isLeft ? 0.38 : 0.62;
  formation.mid.forEach((y) => positions.push({ x: midX, y, role: "mid", gk: false, fieldIndex: idx++ }));
  const fwdX = isLeft ? 0.52 : 0.48;
  formation.fwd.forEach((y) => positions.push({ x: fwdX, y, role: "fwd", gk: false, fieldIndex: idx++ }));
  while (positions.length < 11) positions.push({ x: isLeft ? 0.48 : 0.52, y: 0.5, role: "fwd", gk: false, fieldIndex: idx++ });
  return positions.slice(0, 11);
}

/** Linearly interpolate two hex colors */
export function lerpColor(c1: string, c2: string, t: number): string {
  const parse = (c: string) => {
    const hex = c.replace("#", "");
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
