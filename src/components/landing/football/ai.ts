// ─── Football Animation AI & Game Logic ───

import type { Vec2, Player, Ball, GameState, FieldRect, Formation, PhraseBank } from "./types";
import {
  TEAM_PALETTES, FORMATIONS, getPhrases,
  lerp, dist, rnd, normalize, sub, bezier,
  pickRandom, pickTwoDistinct, getField, buildTeamPositions,
} from "./types";

// ─── Initialization ───

export function createInitialState(w: number, h: number): { state: GameState; supporters: Vec2[] } {
  const f = getField(w, h);
  const [f0, f1] = pickTwoDistinct(FORMATIONS);
  const [c0, c1] = pickTwoDistinct(TEAM_PALETTES);

  const makePlayer = (
    tx: number, ty: number, team: number, role: Player["role"],
    gk: boolean, jerseyNumber: number, fieldIndex: number,
  ): Player => {
    const baseSpeed = gk ? 0.6 : role === "def" ? 0.8 : role === "mid" ? 1.0 : 1.1;
    return {
      pos: { x: f.l + tx * f.w, y: f.t + ty * f.h },
      vel: { x: 0, y: 0 }, team,
      basePos: { x: f.l + tx * f.w, y: f.t + ty * f.h },
      hasBall: false, isGoalkeeper: gk,
      isBench: role === "bench", isCoach: role === "coach",
      role, jerseyNumber, speed: baseSpeed, baseSpeed,
      dribbleAngle: 0, fieldIndex, kickPhase: 0, kickLeg: 1,
      divePhase: 0, diveDir: 0, fatigue: 0, distanceTraveled: 0,
    };
  };

  const players: Player[] = [];
  buildTeamPositions(f0, 0, true).forEach((p, i) =>
    players.push(makePlayer(p.x, p.y, 0, p.role, p.gk, p.gk ? 1 : i + 1, p.fieldIndex)));
  buildTeamPositions(f1, 1, false).forEach((p, i) =>
    players.push(makePlayer(p.x, p.y, 1, p.role, p.gk, p.gk ? 1 : i + 1, p.fieldIndex)));

  // Bench + coaches
  for (let ti = 0; ti < 2; ti++) {
    const bx = ti === 0 ? -0.04 : 1.04;
    for (let i = 0; i < 3; i++) players.push(makePlayer(bx, 0.32 + i * 0.12, ti, "bench", false, 12 + i, -1));
    players.push(makePlayer(bx, 0.72, ti, "coach", false, 0, -1));
  }

  const holderIdx = 9;
  players[holderIdx].hasBall = true;

  // Supporters
  const supporters: Vec2[] = [];
  for (let i = 0; i < 45; i++) {
    supporters.push({ x: f.l + (i / 45) * f.w + rnd(0, f.w / 45), y: f.t - h * 0.05 + rnd(-h * 0.015, h * 0.015) });
  }
  for (let i = 0; i < 45; i++) {
    supporters.push({ x: f.l + (i / 45) * f.w + rnd(0, f.w / 45), y: f.t + (f.t + f.h - f.t) + h * 0.05 + rnd(-h * 0.015, h * 0.015) });
  }

  const ball: Ball = {
    pos: { ...players[holderIdx].pos }, vel: { x: 0, y: 0 },
    targetPlayerIdx: -1, inFlight: false, flightProgress: 0,
    flightStart: { x: 0, y: 0 }, flightEnd: { x: 0, y: 0 },
    speed: 0, curve: 0, height: 0,
    bouncing: false, bounceCount: 0, bounceHeight: 0, bouncePhase: 0,
    isShot: false, spin: 0,
  };

  return {
    state: {
      players, ball,
      referee: { pos: { x: f.cx, y: f.cy }, vel: { x: 0, y: 0 } },
      teamColors: [c0, c1], prevTeamColors: null, colorTransitionAlpha: 1,
      formations: [f0, f1], tactic: ["balanced", "balanced"],
      chatBubbles: [], confetti: [],
      lastColorChange: Date.now(), lastChat: Date.now(),
      lastAction: Date.now(), lastTacticChange: Date.now(), lastSubstitution: Date.now(),
      ballHolder: holderIdx, possession: 0,
      phase: "buildup", setPieceType: "none", setPieceTimer: 0, setPieceTeam: 0,
      phaseTimer: Date.now(), score: [0, 0], matchStart: Date.now(),
      goalCelebration: 0,
      formationLabel: [{ text: f0.name, alpha: 1 }, { text: f1.name, alpha: 1 }],
      possessionCount: [0, 0], crowdWavePhase: 0,
      width: w, height: h,
    },
    supporters,
  };
}

// ─── Helpers ───

function getActiveTeamPlayers(s: GameState, team: number) {
  return s.players.map((p, i) => ({ p, i })).filter(({ p }) => p.team === team && !p.isBench && !p.isCoach);
}

function triggerKick(s: GameState, playerIdx: number) {
  s.players[playerIdx].kickPhase = 0.01;
  s.players[playerIdx].kickLeg = Math.random() > 0.5 ? 1 : -1;
}

function spawnConfetti(s: GameState, pos: Vec2) {
  const colors = ["#f1c40f", "#e74c3c", "#3498db", "#2ecc40", "#e67e22", "#fff", "#ff69b4"];
  for (let i = 0; i < 60; i++) {
    s.confetti.push({
      pos: { ...pos }, vel: { x: rnd(-3, 3), y: rnd(-5, -1) },
      color: pickRandom(colors), life: rnd(1500, 3000),
      size: rnd(3, 7), rotation: rnd(0, Math.PI * 2), rotSpeed: rnd(-0.1, 0.1),
    });
  }
}

function updateFormation(s: GameState, teamIdx: number, formation: Formation, f: FieldRect) {
  const isLeft = teamIdx === 0;
  const newPositions = buildTeamPositions(formation, teamIdx, isLeft);
  const teamPlayers = s.players.filter((p) => p.team === teamIdx && !p.isBench && !p.isCoach);
  newPositions.forEach((np, i) => {
    if (i < teamPlayers.length) {
      const tp = teamPlayers[i];
      tp.basePos = { x: f.l + np.x * f.w, y: f.t + np.y * f.h };
      tp.role = np.role; tp.isGoalkeeper = np.gk;
      tp.baseSpeed = np.gk ? 0.6 : np.role === "def" ? 0.8 : np.role === "mid" ? 1.0 : 1.1;
    }
  });
}

function applyTacticShift(s: GameState, teamIdx: number, tactic: string, f: FieldRect) {
  const attackDir = teamIdx === 0 ? 1 : -1;
  const shift = tactic === "offensive" ? 0.08 : tactic === "defensive" ? -0.06 : 0;
  s.players.forEach((p) => {
    if (p.team !== teamIdx || p.isBench || p.isCoach || p.isGoalkeeper) return;
    p.basePos.x += attackDir * shift * f.w;
    p.basePos.x = Math.max(f.l + 10, Math.min(f.r - 10, p.basePos.x));
  });
}

// ─── Ball actions ───

function passBall(s: GameState, fromIdx: number, toIdx: number) {
  const from = s.players[fromIdx], to = s.players[toIdx];
  const d = dist(from.pos, to.pos);
  const leadTime = d / 4.5;
  const targetPos = { x: to.pos.x + to.vel.x * leadTime * 0.5, y: to.pos.y + to.vel.y * leadTime * 0.5 };
  triggerKick(s, fromIdx);
  s.ball.inFlight = true; s.ball.flightProgress = 0; s.ball.isShot = false;
  s.ball.flightStart = { x: from.pos.x + (from.vel.x > 0 ? 6 : -6), y: from.pos.y + 8 };
  s.ball.flightEnd = { ...targetPos }; s.ball.targetPlayerIdx = toIdx;
  s.ball.speed = Math.min(5.5, 2.5 + d * 0.008); s.ball.curve = rnd(-0.15, 0.15);
  s.ball.vel = normalize(sub(targetPos, from.pos));
  from.hasBall = false; s.ballHolder = -1; s.lastAction = Date.now();
}

function shootBall(s: GameState, fromIdx: number, f: FieldRect) {
  const from = s.players[fromIdx];
  const goalX = from.team === 0 ? f.r : f.l;
  const targetPos = { x: goalX, y: f.cy + rnd(-f.h * 0.08, f.h * 0.08) };
  const d = dist(from.pos, targetPos);
  triggerKick(s, fromIdx);
  s.ball.inFlight = true; s.ball.flightProgress = 0; s.ball.isShot = true;
  s.ball.flightStart = { x: from.pos.x + (from.team === 0 ? 6 : -6), y: from.pos.y + 8 };
  s.ball.flightEnd = targetPos; s.ball.targetPlayerIdx = -1;
  s.ball.speed = Math.min(7, 4 + d * 0.005); s.ball.curve = rnd(-0.1, 0.1);
  s.ball.vel = normalize(sub(targetPos, from.pos));
  from.hasBall = false; s.ballHolder = -1; s.lastAction = Date.now();
  s.phase = "shoot"; s.phaseTimer = Date.now();

  // Trigger GK dive
  const defTeam = 1 - from.team;
  const gk = s.players.find((p) => p.team === defTeam && p.isGoalkeeper);
  if (gk) { gk.divePhase = 0.01; gk.diveDir = targetPos.y > gk.pos.y ? 1 : -1; }
}

function changeTeams(s: GameState, f: FieldRect) {
  s.prevTeamColors = [s.teamColors[0], s.teamColors[1]];
  s.colorTransitionAlpha = 0;
  const [c0, c1] = pickTwoDistinct(TEAM_PALETTES);
  const [f0, f1] = pickTwoDistinct(FORMATIONS);
  s.teamColors = [c0, c1]; s.formations = [f0, f1];
  updateFormation(s, 0, f0, f); updateFormation(s, 1, f1, f);
  s.lastColorChange = Date.now(); s.score = [0, 0]; s.matchStart = Date.now();
  s.formationLabel = [{ text: f0.name, alpha: 1 }, { text: f1.name, alpha: 1 }];
  s.possessionCount = [0, 0];
  // Reset fatigue on team change
  s.players.forEach((p) => { p.fatigue = 0; p.distanceTraveled = 0; });
}

/** Give ball to GK after save/miss/goal kick */
function giveBallToGK(s: GameState, team: number) {
  const gkIdx = s.players.findIndex((p) => p.team === team && p.isGoalkeeper);
  if (gkIdx >= 0) {
    s.players.forEach((p) => (p.hasBall = false));
    s.ballHolder = gkIdx; s.players[gkIdx].hasBall = true;
    s.ball.pos = { ...s.players[gkIdx].pos };
    s.ball.vel = { x: 0, y: 0 }; s.ball.height = 0;
    s.ball.bouncing = false;
  }
  s.possession = team; s.phase = "buildup"; s.phaseTimer = Date.now();
  s.lastAction = Date.now();
}

/** Trigger a set piece */
function startSetPiece(s: GameState, type: "corner" | "throw_in" | "free_kick" | "goal_kick", team: number, f: FieldRect) {
  s.phase = "set_piece"; s.setPieceType = type;
  s.setPieceTeam = team; s.setPieceTimer = Date.now();
  s.ball.inFlight = false; s.ball.bouncing = false; s.ball.height = 0;

  // Position ball for set piece
  if (type === "corner") {
    const isLeft = team === 0;
    s.ball.pos = { x: isLeft ? f.r - 2 : f.l + 2, y: Math.random() > 0.5 ? f.t + 2 : f.t + f.h - 2 };
  } else if (type === "throw_in") {
    s.ball.pos.y = s.ball.pos.y < f.cy ? f.t + 2 : f.t + f.h - 2;
  } else if (type === "goal_kick") {
    s.ball.pos = { x: team === 0 ? f.l + f.w * 0.05 : f.r - f.w * 0.05, y: f.cy };
  } else if (type === "free_kick") {
    // ball stays where it is
  }

  // Assign nearest teammate as "taker"
  const teamPlayers = getActiveTeamPlayers(s, team);
  let nearest = -1, nd = Infinity;
  teamPlayers.forEach(({ p, i }) => {
    if (p.isGoalkeeper && type !== "goal_kick") return;
    const d = dist(p.pos, s.ball.pos);
    if (d < nd) { nd = d; nearest = i; }
  });
  s.players.forEach((p) => (p.hasBall = false));
  if (nearest >= 0) { s.ballHolder = nearest; s.players[nearest].hasBall = true; }
  s.lastAction = Date.now();
}

/** Attempt substitution for a team */
function trySubstitution(s: GameState, teamIdx: number, f: FieldRect, phrases: PhraseBank) {
  const fieldPlayers = s.players.filter((p) => p.team === teamIdx && !p.isBench && !p.isCoach && !p.isGoalkeeper);
  const benchPlayers = s.players.filter((p) => p.team === teamIdx && p.isBench);
  if (benchPlayers.length === 0) return;

  // Find most fatigued field player
  let mostTired = fieldPlayers[0], mostTiredIdx = s.players.indexOf(fieldPlayers[0]);
  fieldPlayers.forEach((p) => {
    if (p.fatigue > mostTired.fatigue) {
      mostTired = p; mostTiredIdx = s.players.indexOf(p);
    }
  });
  if (mostTired.fatigue < 0.6) return; // Only sub if fairly tired

  const subIn = benchPlayers[0];
  const subInIdx = s.players.indexOf(subIn);

  // Swap roles and positions
  const savedRole = mostTired.role;
  const savedBase = { ...mostTired.basePos };
  const savedFieldIdx = mostTired.fieldIndex;
  const savedNumber = mostTired.jerseyNumber;

  // Sub out → bench
  mostTired.role = "bench"; mostTired.isBench = true;
  mostTired.basePos = { ...subIn.basePos }; mostTired.pos = { ...subIn.pos };
  mostTired.fieldIndex = -1;

  // Sub in → field
  subIn.role = savedRole; subIn.isBench = false;
  subIn.basePos = savedBase; subIn.pos = { ...savedBase };
  subIn.fieldIndex = savedFieldIdx; subIn.fatigue = 0; subIn.distanceTraveled = 0;
  subIn.speed = subIn.baseSpeed;

  // Transfer ball if needed
  if (s.ballHolder === mostTiredIdx) { s.ballHolder = subInIdx; subIn.hasBall = true; mostTired.hasBall = false; }

  // Chat announcement
  s.chatBubbles.push({
    text: `Sub: #${subIn.jerseyNumber} ${phrases.subOn}, #${savedNumber} ${phrases.subOff}`,
    pos: { x: f.cx, y: f.t - 15 }, life: 3500, maxLife: 3500,
  });
}

// ─── Main Update ───

export function updateGameState(s: GameState, dt: number, supporters: Vec2[], lang = "en") {
  const phrases = getPhrases(lang);
  const now = Date.now();
  const f = getField(s.width, s.height);

  // Smooth color transition
  if (s.colorTransitionAlpha < 1) {
    s.colorTransitionAlpha = Math.min(1, s.colorTransitionAlpha + 0.02 * dt);
    if (s.colorTransitionAlpha >= 1) s.prevTeamColors = null;
  }

  // Crowd wave
  s.crowdWavePhase += 0.02 * dt;

  // Formation rotation (~90–120s)
  if (now - s.lastColorChange > 90000 + Math.random() * 30000) {
    changeTeams(s, f);
  }

  // Tactic shifts (~20–40s)
  if (now - s.lastTacticChange > 20000 + Math.random() * 20000) {
    const tactics = ["offensive", "defensive", "balanced"];
    for (let ti = 0; ti < 2; ti++) {
      const newTactic = pickRandom(tactics);
      s.tactic[ti] = newTactic;
      updateFormation(s, ti, s.formations[ti], f);
      applyTacticShift(s, ti, newTactic, f);
    }
    s.lastTacticChange = now;
  }

  // Substitutions (~60–80s)
  if (now - s.lastSubstitution > 60000 + Math.random() * 20000) {
    trySubstitution(s, Math.random() > 0.5 ? 0 : 1, f, phrases);
    s.lastSubstitution = now;
  }

  const possTeam = s.possession;
  const defTeam = 1 - possTeam;
  const attackGoalX = possTeam === 0 ? f.r : f.l;
  const attackDir = possTeam === 0 ? 1 : -1;

  if (s.ballHolder >= 0) s.possessionCount[s.players[s.ballHolder].team]++;

  // ─── Set piece timer ───
  if (s.phase === "set_piece" && now - s.setPieceTimer > 1500) {
    // Execute the set piece
    if (s.ballHolder >= 0) {
      const holder = s.players[s.ballHolder];
      const teammates = getActiveTeamPlayers(s, s.setPieceTeam).filter(({ i }) => i !== s.ballHolder);
      if (teammates.length > 0) {
        const target = pickRandom(teammates);
        passBall(s, s.ballHolder, target.i);
      }
    }
    s.phase = "buildup"; s.setPieceType = "none"; s.phaseTimer = now;
  }

  // ─── Player AI movement + fatigue ───
  s.players.forEach((p, i) => {
    if (p.isBench || p.isCoach) return;
    const prevPos = { ...p.pos };
    const holder = s.ballHolder >= 0 ? s.players[s.ballHolder] : null;
    const isHolder = i === s.ballHolder;
    let targetX = p.basePos.x, targetY = p.basePos.y, urgency = 0.02;

    if (isHolder) {
      p.dribbleAngle += rnd(-0.05, 0.05) * dt;
      p.dribbleAngle = Math.max(-0.8, Math.min(0.8, p.dribbleAngle));
      targetX = p.pos.x + attackDir * 1.5;
      targetY = p.pos.y + Math.sin(p.dribbleAngle) * 0.8;
      urgency = 0.06;
      const maxAdv = possTeam === 0 ? f.r - f.w * 0.15 : f.l + f.w * 0.15;
      if ((possTeam === 0 && p.pos.x > maxAdv) || (possTeam === 1 && p.pos.x < maxAdv)) urgency = 0.01;
    } else if (p.team === possTeam) {
      if (p.role === "fwd") {
        targetX = p.basePos.x + attackDir * f.w * 0.1;
        targetY = p.basePos.y + Math.sin(now * 0.001 + i) * f.h * 0.06; urgency = 0.04;
      } else if (p.role === "mid") {
        if (holder) {
          const offY = p.basePos.y < f.cy ? -f.h * 0.1 : f.h * 0.1;
          targetX = (holder.pos.x + p.basePos.x) / 2 + attackDir * f.w * 0.05;
          targetY = holder.pos.y + offY;
        }
        urgency = 0.03;
      } else if (p.role === "def") {
        if (holder) { targetY = lerp(p.basePos.y, holder.pos.y, 0.12); targetX = p.basePos.x + attackDir * f.w * 0.03; }
        urgency = 0.02;
      } else if (p.isGoalkeeper) {
        targetY = lerp(p.basePos.y, s.ball.pos.y, 0.1); urgency = 0.03;
      }
    } else {
      if (p.role === "fwd" || p.role === "mid") {
        if (holder && dist(p.pos, holder.pos) < f.w * 0.25) {
          targetX = lerp(p.pos.x, holder.pos.x, 0.3);
          targetY = lerp(p.pos.y, holder.pos.y, 0.3); urgency = 0.035;
        } else {
          targetX = p.basePos.x; targetY = lerp(p.basePos.y, s.ball.pos.y, 0.2); urgency = 0.025;
        }
      } else if (p.role === "def") {
        targetY = lerp(p.basePos.y, s.ball.pos.y, 0.25); targetX = p.basePos.x; urgency = 0.03;
      } else if (p.isGoalkeeper) {
        targetY = lerp(p.basePos.y, s.ball.pos.y, 0.15); urgency = 0.04;
      }
    }

    const dx = targetX - p.pos.x, dy = targetY - p.pos.y, d = Math.hypot(dx, dy);
    if (d > 1) { p.vel.x += (dx / d) * urgency * p.speed * dt; p.vel.y += (dy / d) * urgency * p.speed * dt; }
    p.vel.x += rnd(-0.012, 0.012) * dt; p.vel.y += rnd(-0.012, 0.012) * dt;
    p.vel.x *= 0.92; p.vel.y *= 0.92;
    const maxSpd = p.speed * 1.8, spd = Math.hypot(p.vel.x, p.vel.y);
    if (spd > maxSpd) { p.vel.x = (p.vel.x / spd) * maxSpd; p.vel.y = (p.vel.y / spd) * maxSpd; }
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt;
    p.pos.x = Math.max(f.l + 5, Math.min(f.r - 5, p.pos.x));
    p.pos.y = Math.max(f.t + 5, Math.min(f.t + f.h - 5, p.pos.y));

    // Fatigue accumulation
    const moved = Math.hypot(p.pos.x - prevPos.x, p.pos.y - prevPos.y);
    p.distanceTraveled += moved;
    p.fatigue = Math.min(1, p.distanceTraveled / (f.w * 8));
    // Fatigue slows the player
    p.speed = p.baseSpeed * (1 - p.fatigue * 0.3);
  });

  // Update kick & dive animations
  s.players.forEach((p) => {
    if (p.kickPhase > 0) { p.kickPhase += 0.06 * dt; if (p.kickPhase >= 1) p.kickPhase = 0; }
    if (p.divePhase > 0) { p.divePhase += 0.03 * dt; if (p.divePhase >= 1) p.divePhase = 0; }
  });

  // Referee follows ball
  const refDist = dist(s.referee.pos, s.ball.pos);
  if (refDist > 50) {
    const rd = normalize(sub(s.ball.pos, s.referee.pos));
    s.referee.vel.x = lerp(s.referee.vel.x, rd.x * 0.8, 0.05);
    s.referee.vel.y = lerp(s.referee.vel.y, rd.y * 0.8, 0.05);
  } else {
    s.referee.vel.x *= 0.95; s.referee.vel.y *= 0.95;
  }
  s.referee.pos.x += s.referee.vel.x * dt; s.referee.pos.y += s.referee.vel.y * dt;
  s.referee.pos.x = Math.max(f.l + 10, Math.min(f.r - 10, s.referee.pos.x));
  s.referee.pos.y = Math.max(f.t + 10, Math.min(f.t + f.h - 10, s.referee.pos.y));

  // ─── Ball physics ───
  // Ball spin
  if (s.ball.inFlight) s.ball.spin += s.ball.speed * 0.05 * dt;
  else if (s.ballHolder >= 0) s.ball.spin += 0.02 * dt;

  // Ball bouncing after landing
  if (s.ball.bouncing) {
    s.ball.bouncePhase += 0.08 * dt;
    if (s.ball.bouncePhase >= 1) {
      s.ball.bounceCount++;
      s.ball.bounceHeight *= 0.4; // Each bounce is 40% of previous
      s.ball.bouncePhase = 0;
      if (s.ball.bounceCount >= 3 || s.ball.bounceHeight < 0.5) {
        s.ball.bouncing = false; s.ball.height = 0;
      }
    }
    if (s.ball.bouncing) {
      s.ball.height = Math.sin(s.ball.bouncePhase * Math.PI) * s.ball.bounceHeight;
    }
  }

  if (s.ball.inFlight) {
    s.ball.flightProgress += (s.ball.speed / Math.max(dist(s.ball.flightStart, s.ball.flightEnd), 1)) * dt;
    s.ball.height = Math.sin(s.ball.flightProgress * Math.PI) * (s.ball.speed > 4 ? 15 : 6);

    // ─── Interception check (passes only) ───
    if (!s.ball.isShot && s.ball.flightProgress > 0.15 && s.ball.flightProgress < 0.85) {
      const defPlayers = getActiveTeamPlayers(s, 1 - s.possession);
      for (const { p, i } of defPlayers) {
        if (p.isGoalkeeper) continue;
        const d2 = dist(p.pos, s.ball.pos);
        if (d2 < 15 && Math.random() < 0.25) {
          // Intercept!
          s.ball.inFlight = false; s.ball.vel = { x: 0, y: 0 }; s.ball.height = 0;
          s.ball.pos = { ...p.pos };
          s.players.forEach((pp) => (pp.hasBall = false));
          s.ballHolder = i; p.hasBall = true;
          s.possession = p.team; s.phase = "buildup"; s.phaseTimer = now;
          s.lastAction = now;
          s.chatBubbles.push({ text: phrases.intercepted, pos: { ...p.pos }, life: 2000, maxLife: 2000 });
          break;
        }
      }
    }

    if (s.ball.inFlight && s.ball.flightProgress >= 1) {
      s.ball.pos = { ...s.ball.flightEnd }; s.ball.inFlight = false;
      s.ball.vel = { x: 0, y: 0 };

      if (s.phase === "shoot") {
        // ─── Save / miss / goal mechanic ───
        const saveChance = 0.45;
        const missChance = 0.15;
        const roll = Math.random();

        if (roll < saveChance) {
          // GK saves
          const defGKTeam = 1 - s.possession;
          s.chatBubbles.push({ text: pickRandom(phrases.save), pos: { ...s.ball.pos }, life: 3000, maxLife: 3000 });
          giveBallToGK(s, defGKTeam);
          // Start ball bounce
          s.ball.bouncing = true; s.ball.bounceCount = 0; s.ball.bounceHeight = 4; s.ball.bouncePhase = 0;
        } else if (roll < saveChance + missChance) {
          // Shot goes wide/over
          s.chatBubbles.push({ text: pickRandom(phrases.miss), pos: { ...s.ball.pos }, life: 3000, maxLife: 3000 });
          // Goal kick for defending team
          startSetPiece(s, "goal_kick", 1 - s.possession, f);
        } else {
          // GOAL!
          const scoringTeam = s.possession;
          s.score[scoringTeam]++;
          s.goalCelebration = now;
          spawnConfetti(s, { ...s.ball.pos });
          s.chatBubbles.push({ text: pickRandom(phrases.goal), pos: { ...s.ball.pos }, life: 3500, maxLife: 3500 });
          if (supporters.length > 0) {
            for (let ci = 0; ci < 3; ci++) {
              s.chatBubbles.push({
                text: pickRandom(phrases.goalCrowd),
                pos: { ...pickRandom(supporters) }, life: 3000, maxLife: 3000,
              });
            }
          }
          changeTeams(s, f);
          const newPoss = 1 - scoringTeam;
          giveBallToGK(s, newPoss);
        }
      } else {
        // Pass reception + ball bounce
        s.ball.bouncing = true; s.ball.bounceCount = 0; s.ball.bounceHeight = 3; s.ball.bouncePhase = 0;
        s.ball.height = 0;

        let recIdx = s.ball.targetPlayerIdx;
        if (recIdx < 0 || dist(s.players[recIdx].pos, s.ball.pos) > 30) {
          let nearest = -1, nd = Infinity;
          s.players.forEach((p, i2) => { if (p.isBench || p.isCoach) return; const dd = dist(p.pos, s.ball.pos); if (dd < nd) { nd = dd; nearest = i2; } });
          recIdx = nearest;
        }
        if (recIdx >= 0) {
          s.ballHolder = recIdx; s.players.forEach((p) => (p.hasBall = false));
          s.players[recIdx].hasBall = true;
          if (s.players[recIdx].team !== s.possession) {
            s.possession = s.players[recIdx].team; s.phase = "buildup"; s.phaseTimer = now;
          }
        }
      }
    } else if (s.ball.inFlight) {
      const mid = { x: (s.ball.flightStart.x + s.ball.flightEnd.x) / 2, y: (s.ball.flightStart.y + s.ball.flightEnd.y) / 2 };
      const bDx = s.ball.flightEnd.x - s.ball.flightStart.x, bDy = s.ball.flightEnd.y - s.ball.flightStart.y;
      const ctrl = { x: mid.x - bDy * s.ball.curve, y: mid.y + bDx * s.ball.curve };
      const prevBallPos = { ...s.ball.pos };
      s.ball.pos = bezier(s.ball.flightStart, ctrl, s.ball.flightEnd, s.ball.flightProgress);
      s.ball.vel = sub(s.ball.pos, prevBallPos);
    }
  } else if (s.ballHolder >= 0 && !s.ball.bouncing) {
    const holder = s.players[s.ballHolder];
    const hSpd = Math.hypot(holder.vel.x, holder.vel.y);
    const dribbleCycle = Math.sin(performance.now() * 0.014 + holder.pos.x * 0.1);
    const moveDir = hSpd > 0.2 ? normalize(holder.vel) : { x: 0, y: 0 };
    const footSideOffset = dribbleCycle * 3;
    const feetY = holder.pos.y + 7 * 1.1 * 0.7 + 7 * 0.9 * 0.6;
    s.ball.pos.x = lerp(s.ball.pos.x, holder.pos.x + moveDir.x * 5 + footSideOffset, 0.3 * dt);
    s.ball.pos.y = lerp(s.ball.pos.y, feetY + moveDir.y * 2, 0.3 * dt);
    s.ball.vel = { x: 0, y: 0 }; s.ball.height = 0;
  }

  // ─── Decision making ───
  if (s.ballHolder >= 0 && !s.ball.inFlight && s.phase !== "set_piece") {
    const tsa = now - s.lastAction;
    const holder = s.players[s.ballHolder];
    const holdTime = s.phase === "attack" ? rnd(800, 1800) : rnd(1200, 2500);
    if (tsa > holdTime) {
      const dtg = Math.abs(holder.pos.x - attackGoalX);
      const inRange = dtg < f.w * 0.22;

      // Random foul chance (2%) → free kick
      if (Math.random() < 0.02 && s.phase !== "reset") {
        s.chatBubbles.push({ text: phrases.foul, pos: { ...s.referee.pos }, life: 2000, maxLife: 2000 });
        startSetPiece(s, "free_kick", possTeam, f);
      } else if (inRange && (holder.role === "fwd" || Math.random() < 0.25)) {
        shootBall(s, s.ballHolder, f);
      } else {
        const tm = getActiveTeamPlayers(s, possTeam).filter(({ i }) => i !== s.ballHolder);
        if (tm.length > 0) {
          const scored = tm.map(({ p, i }) => {
            const d2 = dist(holder.pos, p.pos);
            const fwd = (p.pos.x - holder.pos.x) * attackDir;
            const nOpp = getActiveTeamPlayers(s, defTeam).reduce((min, { p: op }) => Math.min(min, dist(op.pos, p.pos)), Infinity);
            return { i, score: fwd * 0.5 + nOpp * 0.3 - Math.abs(d2 - f.w * 0.2) * 0.2 + rnd(-15, 15) };
          });
          scored.sort((a, b) => b.score - a.score);
          passBall(s, s.ballHolder, scored[Math.floor(Math.random() * Math.min(3, scored.length))].i);
          if (s.phase === "buildup" && Math.random() < 0.4) { s.phase = "attack"; s.phaseTimer = now; }
        }

        // Chance for ball to go out of bounds near sideline → throw-in
        if (s.ball.inFlight && Math.random() < 0.03) {
          s.ball.inFlight = false;
          startSetPiece(s, "throw_in", 1 - possTeam, f);
        }
      }
    }
  }

  // ─── Chat bubbles ───
  if (now - s.lastChat > rnd(2500, 5000)) {
    s.lastChat = now;
    const r2 = Math.random();
    let source: Vec2; let pool: string[];
    if (r2 < 0.45) {
      const active = s.players.filter((p) => !p.isBench && !p.isCoach);
      source = { ...pickRandom(active).pos }; pool = phrases.chat;
    } else if (r2 < 0.60) {
      const coaches = s.players.filter((p) => p.isCoach);
      source = { ...pickRandom(coaches).pos }; pool = phrases.coach;
    } else if (r2 < 0.73) {
      source = supporters.length > 0 ? { ...pickRandom(supporters) } : { x: s.width * 0.5, y: s.height * 0.08 };
      pool = phrases.supporter;
    } else if (r2 < 0.85) {
      source = { ...s.referee.pos }; pool = phrases.ref;
    } else {
      const bench = s.players.filter((p) => p.isBench);
      source = bench.length > 0 ? { ...pickRandom(bench).pos } : { x: s.width * 0.5, y: s.height * 0.5 };
      pool = phrases.chat;
    }
    s.chatBubbles.push({ text: pickRandom(pool), pos: source, life: 2800, maxLife: 2800 });
  }
  s.chatBubbles = s.chatBubbles.filter((b) => b.life > 0);
  s.chatBubbles.forEach((b) => { b.life -= 16 * dt; b.pos.y -= 0.12 * dt; });

  // Confetti
  s.confetti.forEach((c) => {
    c.pos.x += c.vel.x * dt; c.pos.y += c.vel.y * dt;
    c.vel.y += 0.05 * dt; c.vel.x *= 0.99;
    c.rotation += c.rotSpeed * dt; c.life -= 16 * dt;
  });
  s.confetti = s.confetti.filter((c) => c.life > 0);

  // Fade formation labels
  s.formationLabel.forEach((fl) => { if (fl.alpha > 0) fl.alpha -= 0.003 * dt; });
}
