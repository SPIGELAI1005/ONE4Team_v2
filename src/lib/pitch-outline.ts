export interface OutlinePoint {
  x: number;
  y: number;
}

/** Canonical outline: freeform polygon in % of map canvas (0–100). */
export interface PitchOutlinePolygon {
  type: "polygon";
  points: OutlinePoint[];
}

/** @deprecated Prefer PitchOutlinePolygon; kept for call-site clarity. */
export type PitchOutlineRect = PitchOutlinePolygon;
export type PitchOutline = PitchOutlinePolygon;

export const PITCH_OUTLINE_MIN_SIZE = 2;
export const PITCH_OUTLINE_MIN_POINTS = 3;
export const PITCH_OUTLINE_MAX_POINTS = 24;

function asNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function clampOutlineCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function clampOutlineSize(value: number): number {
  if (!Number.isFinite(value)) return PITCH_OUTLINE_MIN_SIZE;
  return Math.min(100, Math.max(PITCH_OUTLINE_MIN_SIZE, value));
}

export function clampOutlineRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((Math.round(value) % 360) + 360) % 360;
}

function parsePoint(raw: unknown): OutlinePoint | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const x = asNumber(o.x, NaN);
  const y = asNumber(o.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clampOutlineCoord(x), y: clampOutlineCoord(y) };
}

function normalizePoints(points: OutlinePoint[]): OutlinePoint[] | null {
  if (points.length < PITCH_OUTLINE_MIN_POINTS) return null;
  if (points.length > PITCH_OUTLINE_MAX_POINTS) return points.slice(0, PITCH_OUTLINE_MAX_POINTS);
  return points.map((p) => ({
    x: clampOutlineCoord(p.x),
    y: clampOutlineCoord(p.y),
  }));
}

/** Convert legacy rotated rect to a 4-point polygon. */
export function rectToPolygon(raw: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}): PitchOutlinePolygon | null {
  const w = clampOutlineSize(raw.w);
  const h = clampOutlineSize(raw.h);
  if (w < PITCH_OUTLINE_MIN_SIZE || h < PITCH_OUTLINE_MIN_SIZE) return null;
  const x = clampOutlineCoord(raw.x);
  const y = clampOutlineCoord(raw.y);
  const rotation = clampOutlineRotation(raw.rotation ?? 0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const corners: OutlinePoint[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  if (!rotation) {
    return { type: "polygon", points: corners };
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    type: "polygon",
    points: corners.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: clampOutlineCoord(cx + dx * cos - dy * sin),
        y: clampOutlineCoord(cy + dx * sin + dy * cos),
      };
    }),
  };
}

export function parsePitchOutline(raw: unknown): PitchOutlinePolygon | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  if (o.type === "polygon" || Array.isArray(o.points)) {
    if (!Array.isArray(o.points)) return null;
    const points: OutlinePoint[] = [];
    for (const entry of o.points) {
      const p = parsePoint(entry);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      points.push(p);
    }
    const normalized = normalizePoints(points);
    if (!normalized) return null;
    return { type: "polygon", points: normalized };
  }

  if (o.type == null || o.type === "rect") {
    return rectToPolygon({
      x: asNumber(o.x, 0),
      y: asNumber(o.y, 0),
      w: asNumber(o.w, 0),
      h: asNumber(o.h, 0),
      rotation: asNumber(o.rotation, 0),
    });
  }

  return null;
}

export function serializePitchOutline(
  outline: PitchOutlinePolygon | null | undefined,
): PitchOutlinePolygon | null {
  if (!outline) return null;
  return parsePitchOutline(outline);
}

/** Build a 4-point polygon from two drag corners in % space. */
export function rectFromDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): PitchOutlinePolygon {
  const x1 = clampOutlineCoord(Math.min(startX, endX));
  const y1 = clampOutlineCoord(Math.min(startY, endY));
  const x2 = clampOutlineCoord(Math.max(startX, endX));
  const y2 = clampOutlineCoord(Math.max(startY, endY));
  const w = clampOutlineSize(x2 - x1);
  const h = clampOutlineSize(y2 - y1);
  return {
    type: "polygon",
    points: [
      { x: x1, y: y1 },
      { x: x1 + w, y: y1 },
      { x: x1 + w, y: y1 + h },
      { x: x1, y: y1 + h },
    ],
  };
}

export function outlineCenter(outline: PitchOutlinePolygon): { cx: number; cy: number } {
  if (outline.points.length === 0) return { cx: 50, cy: 50 };
  let sx = 0;
  let sy = 0;
  for (const p of outline.points) {
    sx += p.x;
    sy += p.y;
  }
  return { cx: sx / outline.points.length, cy: sy / outline.points.length };
}

/** Bounding box helper for label sizing. */
export function outlineBounds(outline: PitchOutlinePolygon): { x: number; y: number; w: number; h: number } {
  let minX = 100;
  let minY = 100;
  let maxX = 0;
  let maxY = 0;
  for (const p of outline.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    w: Math.max(PITCH_OUTLINE_MIN_SIZE, maxX - minX),
    h: Math.max(PITCH_OUTLINE_MIN_SIZE, maxY - minY),
  };
}

export function outlinePointsToSvg(outline: PitchOutlinePolygon): string {
  return outline.points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function pointerToMapPercent(
  clientX: number,
  clientY: number,
  el: DOMRect,
): { x: number; y: number } {
  if (el.width < 1 || el.height < 1) return { x: 0, y: 0 };
  return {
    x: clampOutlineCoord(((clientX - el.left) / el.width) * 100),
    y: clampOutlineCoord(((clientY - el.top) / el.height) * 100),
  };
}

export function translateOutline(outline: PitchOutlinePolygon, dx: number, dy: number): PitchOutlinePolygon {
  return {
    type: "polygon",
    points: outline.points.map((p) => ({
      x: clampOutlineCoord(p.x + dx),
      y: clampOutlineCoord(p.y + dy),
    })),
  };
}

/** Move a single vertex independently. */
export function moveOutlineVertex(
  outline: PitchOutlinePolygon,
  index: number,
  x: number,
  y: number,
): PitchOutlinePolygon {
  if (index < 0 || index >= outline.points.length) return outline;
  return {
    type: "polygon",
    points: outline.points.map((p, i) =>
      i === index ? { x: clampOutlineCoord(x), y: clampOutlineCoord(y) } : p,
    ),
  };
}

/** Insert a vertex after `edgeIndex` (between edgeIndex and next). */
export function insertOutlineVertex(
  outline: PitchOutlinePolygon,
  edgeIndex: number,
  point: OutlinePoint,
): PitchOutlinePolygon {
  if (outline.points.length >= PITCH_OUTLINE_MAX_POINTS) return outline;
  if (edgeIndex < 0 || edgeIndex >= outline.points.length) return outline;
  const next = [...outline.points];
  next.splice(edgeIndex + 1, 0, {
    x: clampOutlineCoord(point.x),
    y: clampOutlineCoord(point.y),
  });
  return { type: "polygon", points: next };
}

export function removeOutlineVertex(outline: PitchOutlinePolygon, index: number): PitchOutlinePolygon {
  if (outline.points.length <= PITCH_OUTLINE_MIN_POINTS) return outline;
  if (index < 0 || index >= outline.points.length) return outline;
  return {
    type: "polygon",
    points: outline.points.filter((_, i) => i !== index),
  };
}

export function edgeMidpoint(outline: PitchOutlinePolygon, edgeIndex: number): OutlinePoint | null {
  if (edgeIndex < 0 || edgeIndex >= outline.points.length) return null;
  const a = outline.points[edgeIndex];
  const b = outline.points[(edgeIndex + 1) % outline.points.length];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/** Rotate all vertices around the centroid (degrees clockwise). */
export function withOutlineRotation(
  outline: PitchOutlinePolygon,
  rotation: number,
): PitchOutlinePolygon {
  const delta = clampOutlineRotation(rotation);
  if (!delta) return outline;
  const { cx, cy } = outlineCenter(outline);
  const rad = (delta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    type: "polygon",
    points: outline.points.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: clampOutlineCoord(cx + dx * cos - dy * sin),
        y: clampOutlineCoord(cy + dx * sin + dy * cos),
      };
    }),
  };
}

/** Absolute rotation is not stored on polygons; rotate by delta from current visual angle is caller-owned. */
export function rotateOutlineByDegrees(
  outline: PitchOutlinePolygon,
  degrees: number,
): PitchOutlinePolygon {
  return withOutlineRotation(outline, degrees);
}
