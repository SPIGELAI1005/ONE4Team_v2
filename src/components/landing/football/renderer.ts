// ─── Football Animation Renderer ───
// All drawing functions + offscreen field cache (theme-aware)

import type { Vec2, Ball, ChatBubble, Confetti, Referee, GameState, FieldRect } from "./types";
import { normalize, lerpColor, getPhrases } from "./types";

// ─── Offscreen field cache (includes theme in key) ───
let fieldCache: HTMLCanvasElement | null = null;
let fieldCacheKey = "";

export function invalidateFieldCache() { fieldCache = null; fieldCacheKey = ""; }

function renderFieldToCache(w: number, h: number, f: FieldRect, dpr: number, isDark: boolean) {
  const key = `${w}:${h}:${dpr}:${isDark}`;
  if (fieldCache && fieldCacheKey === key) return fieldCache;
  fieldCache = document.createElement("canvas");
  fieldCache.width = w * dpr;
  fieldCache.height = h * dpr;
  const ctx = fieldCache.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // ─── Theme-dependent colors ───
  const grassA = isDark ? [0.22, 0.30] : [0.55, 0.68];
  const lineColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(30,60,30,0.28)";
  const centerDot = isDark ? "rgba(255,255,255,0.2)" : "rgba(30,60,30,0.3)";
  const goalFrame = isDark ? "rgba(255,255,255,0.25)" : "rgba(40,40,40,0.4)";
  const lightGlow0 = isDark ? "rgba(255,250,200,0.15)" : "rgba(255,220,100,0.35)";
  const lightGlow1 = isDark ? "rgba(255,250,200,0.04)" : "rgba(255,220,100,0.12)";
  const lightBulb = isDark ? "rgba(255,250,200,0.5)" : "rgba(255,200,50,0.8)";
  const standColor = isDark ? "rgba(80,80,100,0.08)" : "rgba(60,70,90,0.12)";
  const poleColor = isDark ? "rgba(200,200,200,0.3)" : "rgba(120,120,120,0.5)";

  // Grass stripes — vivid green in light mode
  const stripeCount = 12, stripeW = f.w / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0
      ? `rgba(34,140,50,${grassA[0]})`
      : `rgba(28,115,42,${grassA[1]})`;
    ctx.fillRect(f.l + i * stripeW, f.t, stripeW, f.h);
  }

  // Field outline + markings
  ctx.strokeStyle = lineColor; ctx.lineWidth = isDark ? 1.5 : 2;
  ctx.beginPath(); ctx.roundRect(f.l, f.t, f.w, f.h, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(f.cx, f.t); ctx.lineTo(f.cx, f.t + f.h); ctx.stroke();
  ctx.beginPath(); ctx.arc(f.cx, f.cy, f.h * 0.15, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(f.cx, f.cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = centerDot; ctx.fill();

  // Penalty & goal areas
  const paW = f.w * 0.12, paH = f.h * 0.45;
  ctx.strokeStyle = lineColor; ctx.lineWidth = isDark ? 1.5 : 2;
  ctx.strokeRect(f.l, f.cy - paH / 2, paW, paH);
  ctx.strokeRect(f.r - paW, f.cy - paH / 2, paW, paH);
  const gaW = f.w * 0.05, gaH = f.h * 0.2;
  ctx.strokeRect(f.l, f.cy - gaH / 2, gaW, gaH);
  ctx.strokeRect(f.r - gaW, f.cy - gaH / 2, gaW, gaH);

  // Goal frames
  ctx.strokeStyle = goalFrame; ctx.lineWidth = isDark ? 2.5 : 3;
  const goalH = f.h * 0.12;
  ctx.strokeRect(f.l - 6, f.cy - goalH / 2, 6, goalH);
  ctx.strokeRect(f.r, f.cy - goalH / 2, 6, goalH);

  // Stadium corner lights
  [
    { x: f.l - 8, y: f.t - 8 }, { x: f.r + 8, y: f.t - 8 },
    { x: f.l - 8, y: f.t + f.h + 8 }, { x: f.r + 8, y: f.t + f.h + 8 },
  ].forEach((lp) => {
    const grad = ctx.createRadialGradient(lp.x, lp.y, 2, lp.x, lp.y, isDark ? 45 : 60);
    grad.addColorStop(0, lightGlow0);
    grad.addColorStop(0.5, lightGlow1);
    grad.addColorStop(1, "rgba(255,250,200,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, isDark ? 45 : 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = poleColor;
    ctx.fillRect(lp.x - 1, lp.y - 2, 2, 6);
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = lightBulb; ctx.fill();
  });

  // Stands
  ctx.fillStyle = standColor;
  ctx.fillRect(f.l, f.t - h * 0.08, f.w, h * 0.06);
  ctx.fillRect(f.l, f.t + f.h + h * 0.02, f.w, h * 0.06);

  fieldCacheKey = key;
  return fieldCache;
}

export function drawField(ctx: CanvasRenderingContext2D, w: number, h: number, f: FieldRect, dpr: number, isDark: boolean) {
  const cached = renderFieldToCache(w, h, f, dpr, isDark);
  ctx.drawImage(cached, 0, 0, w, h);
}

/** Get blended team colors for smooth transitions */
function getColors(s: GameState, team: number): [string, string, string] {
  if (s.prevTeamColors && s.colorTransitionAlpha < 1) {
    const t = s.colorTransitionAlpha;
    const prev = s.prevTeamColors[team];
    const next = s.teamColors[team];
    return [lerpColor(prev[0], next[0], t), lerpColor(prev[1], next[1], t), lerpColor(prev[2], next[2], t)];
  }
  return s.teamColors[team];
}

export function drawJersey(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  colors: [string, string, string], num: number, r: number,
  hasBallRing: boolean, vel?: Vec2, kickPhase?: number, kickLeg?: number,
  fatigueLevel?: number,
) {
  const spd = vel ? Math.hypot(vel.x, vel.y) : 0;
  const kp = kickPhase || 0;
  const kl = kickLeg || 1;
  const runCycle = spd > 0.3 ? Math.sin(performance.now() * 0.014 + x * 0.1) * Math.min(spd * 2.5, 1) : 0;
  const hw = r * 0.85, hh = r * 1.1, legLen = r * 0.9;
  const legTop = y + hh * 0.7, shortsBottom = legTop + r * 0.45;
  const kickSwing = kp > 0 ? Math.sin(kp * Math.PI) * 1.2 : 0;
  let leftAngle = runCycle * 0.5, rightAngle = -runCycle * 0.5;
  if (kp > 0) {
    if (kl > 0) { rightAngle = -kickSwing; leftAngle = kickSwing * 0.3; }
    else { leftAngle = kickSwing; rightAngle = -kickSwing * 0.3; }
  }
  const leftFootX = x - hw * 0.3 + Math.sin(leftAngle) * legLen * 0.6;
  const leftFootY = shortsBottom + Math.cos(Math.abs(leftAngle) * 0.3) * legLen * 0.85;
  const rightFootX = x + hw * 0.3 + Math.sin(rightAngle) * legLen * 0.6;
  const rightFootY = shortsBottom + Math.cos(Math.abs(rightAngle) * 0.3) * legLen * 0.85;

  // Shadow
  const shadowY = Math.max(leftFootY, rightFootY) + 2;
  ctx.beginPath(); ctx.ellipse(x, shadowY, r * 1.0, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill();

  // Shorts
  ctx.fillStyle = colors[1];
  ctx.beginPath(); ctx.roundRect(x - hw * 0.75, legTop - 2, hw * 1.5, r * 0.5, 1); ctx.fill();

  // Legs
  ctx.strokeStyle = "#deb887"; ctx.lineWidth = r * 0.28; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - hw * 0.3, shortsBottom); ctx.lineTo(leftFootX, leftFootY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + hw * 0.3, shortsBottom); ctx.lineTo(rightFootX, rightFootY); ctx.stroke();

  // Boots
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(leftFootX, leftFootY, r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(rightFootX, rightFootY, r * 0.24, 0, Math.PI * 2); ctx.fill();

  // Jersey body
  ctx.beginPath();
  ctx.moveTo(x - hw, y - hh * 0.5);
  ctx.lineTo(x - hw - r * 0.45, y - hh * 0.2); ctx.lineTo(x - hw - r * 0.45, y + hh * 0.1);
  ctx.lineTo(x - hw, y + hh * 0.1); ctx.lineTo(x - hw * 0.8, y + hh * 0.7);
  ctx.lineTo(x + hw * 0.8, y + hh * 0.7); ctx.lineTo(x + hw, y + hh * 0.1);
  ctx.lineTo(x + hw + r * 0.45, y + hh * 0.1); ctx.lineTo(x + hw + r * 0.45, y - hh * 0.2);
  ctx.lineTo(x + hw, y - hh * 0.5); ctx.lineTo(x + r * 0.2, y - hh * 0.6);
  ctx.lineTo(x - r * 0.2, y - hh * 0.6); ctx.closePath();
  ctx.fillStyle = colors[0]; ctx.fill();
  ctx.strokeStyle = colors[1]; ctx.lineWidth = 1; ctx.stroke();

  // Head
  ctx.beginPath(); ctx.arc(x, y - hh * 0.6 - r * 0.35, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#deb887"; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - hh * 0.6 - r * 0.35, r * 0.35, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fillStyle = "rgba(60,40,20,0.6)"; ctx.fill();

  // Arms
  const armLen = r * 0.7, shoulderY2 = y - hh * 0.35;
  ctx.strokeStyle = "#deb887"; ctx.lineWidth = r * 0.22; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - hw - r * 0.3, shoulderY2); ctx.lineTo(x - hw - r * 0.3, shoulderY2 + armLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + hw + r * 0.3, shoulderY2); ctx.lineTo(x + hw + r * 0.3, shoulderY2 + armLen); ctx.stroke();

  // Jersey number
  if (num > 0) {
    ctx.font = `bold ${Math.round(r * 0.7)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = colors[2]; ctx.fillText(String(num), x, y + hh * 0.05);
  }

  // Ball holder ring
  if (hasBallRing) {
    ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 1.8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Fatigue indicator (small bar above head when tired)
  if (fatigueLevel && fatigueLevel > 0.5) {
    const barW = r * 1.2, barH = 2;
    const barX = x - barW / 2, barY2 = y - hh * 0.6 - r * 0.35 - r * 0.55;
    const fatigueFraction = Math.min(1, (fatigueLevel - 0.5) * 2); // 0.5–1 → 0–1
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(barX, barY2, barW, barH);
    ctx.fillStyle = fatigueFraction > 0.7 ? "rgba(231,76,60,0.7)" : "rgba(241,196,15,0.6)";
    ctx.fillRect(barX, barY2, barW * fatigueFraction, barH);
  }
}

export function drawGKDiving(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  colors: [string, string, string], num: number, r: number,
  divePhase: number, diveDir: number,
) {
  const progress = Math.sin(divePhase * Math.PI);
  const diveOffset = diveDir * progress * r * 4;
  const rotation = diveDir * progress * 0.6;
  ctx.save();
  ctx.translate(x + diveOffset, y);
  ctx.rotate(rotation);
  drawJersey(ctx, 0, 0, colors, num, r, false);
  ctx.restore();
}

export function drawCoach(ctx: CanvasRenderingContext2D, x: number, y: number, colors: [string, string, string]) {
  const legLen = 7, bodyBottom = y + 8;
  ctx.beginPath(); ctx.ellipse(x, bodyBottom + legLen + 2, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill();
  ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  const sway = Math.sin(performance.now() * 0.003 + x) * 0.15;
  ctx.beginPath(); ctx.moveTo(x - 2, bodyBottom); ctx.lineTo(x - 2.5 + sway, bodyBottom + legLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, bodyBottom); ctx.lineTo(x + 2.5 - sway, bodyBottom + legLen); ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(x - 2.5 + sway, bodyBottom + legLen, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2.5 - sway, bodyBottom + legLen, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - 4, y - 2, 8, 10, 2); ctx.fillStyle = "#2c3e50"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x - 1, y + 4); ctx.lineTo(x + 1, y + 4);
  ctx.fillStyle = colors[0]; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 4.5, 3, 0, Math.PI * 2); ctx.fillStyle = "#deb887"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 4.5, 3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fillStyle = "rgba(80,80,80,0.5)"; ctx.fill();
}

export function drawBall(ctx: CanvasRenderingContext2D, b: Ball, isDark = true) {
  const shadowScale = 1 + b.height * 0.02;
  const shadowAlpha = Math.max(0.05, (isDark ? 0.15 : 0.25) - b.height * 0.005);
  ctx.beginPath(); ctx.ellipse(b.pos.x, b.pos.y + 4, 3.5 * shadowScale, 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`; ctx.fill();

  const ballY = b.pos.y - b.height;
  // Spin rotation
  ctx.save();
  ctx.translate(b.pos.x, ballY);
  ctx.rotate(b.spin);
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)"; ctx.lineWidth = isDark ? 0.8 : 1; ctx.stroke();
  // Pentagon patch (rotates with spin)
  ctx.beginPath(); ctx.arc(-0.5, -0.5, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.restore();

  // Speed trail
  if (b.inFlight && b.speed > 2) {
    const dir = normalize(b.vel);
    ctx.beginPath(); ctx.moveTo(b.pos.x, ballY); ctx.lineTo(b.pos.x - dir.x * 10, ballY - dir.y * 10);
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // Glow halo
  ctx.beginPath(); ctx.arc(b.pos.x, ballY, 9, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(b.pos.x, ballY, 2, b.pos.x, ballY, 9);
  if (isDark) {
    grad.addColorStop(0, "rgba(255,255,255,0.18)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    grad.addColorStop(0, "rgba(0,0,0,0.10)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = grad; ctx.fill();
}

export function drawBubble(ctx: CanvasRenderingContext2D, cb: ChatBubble) {
  const fadeAlpha = cb.life < cb.maxLife * 0.2 ? cb.life / (cb.maxLife * 0.2) : 1;
  ctx.save(); ctx.globalAlpha = fadeAlpha * 0.9;
  ctx.font = "9px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tw = ctx.measureText(cb.text).width;
  const px = 6;
  const bubbleW = tw + px * 2, bubbleH = 16;
  const bx = cb.pos.x - bubbleW / 2;
  const by = cb.pos.y - 26 - (1 - fadeAlpha) * 10;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath(); ctx.roundRect(bx, by, bubbleW, bubbleH, 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cb.pos.x - 3, by + bubbleH); ctx.lineTo(cb.pos.x, by + bubbleH + 4); ctx.lineTo(cb.pos.x + 3, by + bubbleH); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(cb.text, cb.pos.x, by + bubbleH / 2);
  ctx.restore();
}

export function drawConfettiItem(ctx: CanvasRenderingContext2D, c: Confetti) {
  ctx.save();
  ctx.translate(c.pos.x, c.pos.y);
  ctx.rotate(c.rotation);
  ctx.globalAlpha = Math.min(1, c.life / 500);
  ctx.fillStyle = c.color;
  ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.4);
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D, cw: number, ch: number, isDark: boolean) {
  const grad = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.10)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);
}

/** Draw "Ball Holder" label above the ball holder */
export function drawBallHolderLabel(ctx: CanvasRenderingContext2D, x: number, y: number, num: number, r: number) {
  const label = `#${num}`;
  ctx.save();
  ctx.font = "bold 7px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tw = ctx.measureText(label).width;
  const lx = x, ly = y - r * 1.1 - r * 0.35 - r * 0.7;
  ctx.fillStyle = "rgba(241,196,15,0.7)";
  ctx.beginPath(); ctx.roundRect(lx - tw / 2 - 3, ly - 5, tw + 6, 10, 3); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

/** Draw crowd supporters with team-colored sections */
export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  supporters: Vec2[],
  s: GameState,
  f: FieldRect,
  now: number,
  isDark = true,
) {
  const celebrating = now - s.goalCelebration < 3000;
  const colors = [getColors(s, 0), getColors(s, 1)];

  supporters.forEach((p, i) => {
    const wave = Math.sin(s.crowdWavePhase + i * 0.15) * 2;
    const bounce = celebrating ? Math.abs(Math.sin(now * 0.01 + i)) * 4 : 0;

    // React more to nearby ball
    const ballDist = Math.hypot(p.x - s.ball.pos.x, p.y - s.ball.pos.y);
    const excitement = Math.max(0, 1 - ballDist / (f.w * 0.3)) * 1.5;

    // Top stands (0–44) support team 0, bottom (45–89) support team 1
    const teamIdx = i < 45 ? 0 : 1;
    const teamColor = colors[teamIdx][0];
    const baseAlpha = isDark ? (0.25 + excitement * 0.1) : (0.45 + excitement * 0.15);
    const dotR = isDark ? 2.5 : 3;

    ctx.beginPath();
    ctx.arc(p.x, p.y - wave - bounce - excitement, dotR, 0, Math.PI * 2);
    if (celebrating) {
      ctx.fillStyle = isDark ? "rgba(255,220,100,0.5)" : "rgba(255,200,50,0.7)";
    } else {
      // Tint with team color
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = baseAlpha;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** Draw offside line for a team */
export function drawOffsideLine(ctx: CanvasRenderingContext2D, s: GameState, f: FieldRect, team: number, isDark = true) {
  const defenders = s.players.filter((p) => p.team === team && p.role === "def" && !p.isBench && !p.isCoach);
  if (defenders.length === 0) return;
  const isLeft = team === 0;
  const lastDef = isLeft
    ? defenders.reduce((max, p) => p.pos.x > max.pos.x ? p : max, defenders[0])
    : defenders.reduce((min, p) => p.pos.x < min.pos.x ? p : min, defenders[0]);
  ctx.beginPath();
  ctx.moveTo(lastDef.pos.x, f.t); ctx.lineTo(lastDef.pos.x, f.t + f.h);
  ctx.strokeStyle = isDark ? "rgba(255,100,100,0.08)" : "rgba(200,50,50,0.18)"; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
}

/** Draw all players with smooth color transitions and fatigue */
export function drawPlayers(ctx: CanvasRenderingContext2D, s: GameState, isVertical: boolean) {
  s.players.forEach((p, i) => {
    const colors = getColors(s, p.team);
    const drawAt = (x: number, y: number) => {
      if (p.isCoach) {
        drawCoach(ctx, x, y, colors);
      } else if (p.isBench) {
        drawJersey(ctx, x, y, colors, p.jerseyNumber, 4.5, false, { x: 0, y: 0 });
      } else if (p.isGoalkeeper && p.divePhase > 0) {
        drawGKDiving(ctx, x, y, colors, p.jerseyNumber, 7, p.divePhase, p.diveDir);
      } else {
        drawJersey(ctx, x, y, colors, p.jerseyNumber, 7, i === s.ballHolder, p.vel, p.kickPhase, p.kickLeg, p.fatigue);
        // Ball holder label
        if (i === s.ballHolder && !p.isBench && !p.isCoach) {
          drawBallHolderLabel(ctx, x, y, p.jerseyNumber, 7);
        }
      }
    };

    if (isVertical) {
      ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(-Math.PI / 2);
      drawAt(0, 0);
      ctx.restore();
    } else {
      drawAt(p.pos.x, p.pos.y);
    }
  });
}

/** Draw referee */
export function drawRefereePlayer(ctx: CanvasRenderingContext2D, ref: Referee, isVertical: boolean) {
  if (isVertical) {
    ctx.save(); ctx.translate(ref.pos.x, ref.pos.y); ctx.rotate(-Math.PI / 2);
    drawJersey(ctx, 0, 0, ["#111", "#222", "#ff0"], 0, 5.5, false, ref.vel);
    ctx.restore();
  } else {
    drawJersey(ctx, ref.pos.x, ref.pos.y, ["#111", "#222", "#ff0"], 0, 5.5, false, ref.vel);
  }
}

/** Draw scoreboard HUD */
export function drawScoreboard(
  ctx: CanvasRenderingContext2D, s: GameState, f: FieldRect,
  cw: number, isVertical: boolean, now: number,
) {
  const colors = [getColors(s, 0), getColors(s, 1)];
  const matchElapsed = Math.floor((now - s.matchStart) / 1000);
  const matchSeconds = (matchElapsed * 6) % 5400;
  const matchMin = Math.floor(matchSeconds / 60);
  const matchSec = matchSeconds % 60;
  const clockStr = `${String(matchMin).padStart(2, "0")}:${String(matchSec).padStart(2, "0")}`;

  const sbW = 160, sbH = 32;
  const sbX = isVertical ? (cw - sbW) / 2 : f.l + 8;
  const sbY = isVertical ? 55 : f.t + 8;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 6); ctx.stroke();
  ctx.beginPath(); ctx.arc(sbX + 14, sbY + sbH / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = colors[0][0]; ctx.fill();
  ctx.beginPath(); ctx.arc(sbX + sbW - 50, sbY + sbH / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = colors[1][0]; ctx.fill();
  ctx.font = "bold 13px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
  ctx.fillText(`${s.score[0]}  -  ${s.score[1]}`, sbX + 55, sbY + sbH / 2);
  ctx.font = "11px Outfit, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.textAlign = "right";
  ctx.fillText(clockStr, sbX + sbW - 8, sbY + sbH / 2);

  // Possession bar
  const totalPoss = s.possessionCount[0] + s.possessionCount[1];
  if (totalPoss > 0) {
    const poss0 = s.possessionCount[0] / totalPoss;
    const barY = sbY + sbH + 4, barH = 4;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.roundRect(sbX, barY, sbW, barH, 2); ctx.fill();
    ctx.fillStyle = colors[0][0];
    ctx.beginPath(); ctx.roundRect(sbX, barY, sbW * poss0, barH, 2); ctx.fill();
    ctx.fillStyle = colors[1][0];
    ctx.beginPath(); ctx.roundRect(sbX + sbW * poss0, barY, sbW * (1 - poss0), barH, 2); ctx.fill();
    ctx.font = "8px Outfit, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textAlign = "left";
    ctx.fillText(`${Math.round(poss0 * 100)}%`, sbX, barY + barH + 9);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round((1 - poss0) * 100)}%`, sbX + sbW, barY + barH + 9);
  }
}

/** Draw mini tactical radar (desktop only) */
export function drawRadar(ctx: CanvasRenderingContext2D, s: GameState, f: FieldRect) {
  const radarW = 70, radarH = 45;
  const radarX = f.r - radarW - 8, radarY = f.t + f.h - radarH - 8;
  const colors = [getColors(s, 0), getColors(s, 1)];

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.roundRect(radarX, radarY, radarW, radarH, 3); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.roundRect(radarX, radarY, radarW, radarH, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(radarX + radarW / 2, radarY); ctx.lineTo(radarX + radarW / 2, radarY + radarH);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.stroke();

  s.players.forEach((p) => {
    if (p.isBench || p.isCoach) return;
    const rx = radarX + ((p.pos.x - f.l) / f.w) * radarW;
    const ry = radarY + ((p.pos.y - f.t) / f.h) * radarH;
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = colors[p.team][0]; ctx.fill();
  });

  const bRx = radarX + ((s.ball.pos.x - f.l) / f.w) * radarW;
  const bRy = radarY + ((s.ball.pos.y - f.t) / f.h) * radarH;
  ctx.beginPath(); ctx.arc(bRx, bRy, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();
}

/** Draw formation labels (fade out) */
export function drawFormationLabels(ctx: CanvasRenderingContext2D, s: GameState, f: FieldRect) {
  for (let ti = 0; ti < 2; ti++) {
    const fl = s.formationLabel[ti];
    if (fl.alpha > 0.01) {
      const labelX = ti === 0 ? f.l + f.w * 0.15 : f.r - f.w * 0.15;
      ctx.save(); ctx.globalAlpha = fl.alpha * 0.6;
      ctx.font = "bold 10px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
      ctx.fillText(fl.text, labelX, f.t + f.h + 12);
      ctx.restore();
    }
  }
}

/** Draw set-piece indicator */
export function drawSetPieceLabel(ctx: CanvasRenderingContext2D, s: GameState, f: FieldRect, lang = "en") {
  if (s.phase !== "set_piece") return;
  const labels = getPhrases(lang).setPiece;
  const label = labels[s.setPieceType] || "";
  if (!label) return;

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.font = "bold 11px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(f.cx - tw / 2 - 8, f.t - 18, tw + 16, 16, 4); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(label, f.cx, f.t - 10);
  ctx.restore();
}
