import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  edgeMidpoint,
  insertOutlineVertex,
  moveOutlineVertex,
  outlineBounds,
  outlineCenter,
  outlinePointsToSvg,
  parsePitchOutline,
  pointerToMapPercent,
  rectFromDrag,
  removeOutlineVertex,
  translateOutline,
  type PitchOutlinePolygon,
} from "@/lib/pitch-outline";

export interface AssetMapOutlinePitch {
  id: string;
  name: string;
  color: string;
  outline: PitchOutlinePolygon | null;
}

interface AssetMapPitchOutlinesLayerProps {
  pitches: AssetMapOutlinePitch[];
  /** When false, layer is not rendered. */
  visible: boolean;
  interactive: boolean;
  /** Pitch selected for outline editing (handles). */
  selectedPitchId: string | null;
  /** Pitch emphasized for schedule/booking focus (stronger than idle). */
  highlightedPitchId?: string | null;
  /** Optional second line under the pitch name when highlighted (team / time). */
  highlightCaption?: string | null;
  drawPitchId: string | null;
  drawMode: boolean;
  showLabels?: boolean;
  onSelectPitch: (pitchId: string | null) => void;
  onOutlineCommit: (pitchId: string, outline: PitchOutlinePolygon | null) => void;
}

type DragState =
  | { kind: "draw"; pitchId: string; startX: number; startY: number }
  | { kind: "move"; pitchId: string; lastX: number; lastY: number; outline: PitchOutlinePolygon }
  | { kind: "vertex"; pitchId: string; index: number; outline: PitchOutlinePolygon };

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(113,113,122,${alpha})`;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return `rgba(113,113,122,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function AssetMapPitchOutlinesLayer({
  pitches,
  visible,
  interactive,
  selectedPitchId,
  highlightedPitchId = null,
  highlightCaption = null,
  drawPitchId,
  drawMode,
  showLabels = true,
  onSelectPitch,
  onOutlineCommit,
}: AssetMapPitchOutlinesLayerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draft, setDraft] = useState<PitchOutlinePolygon | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [liveByPitch, setLiveByPitch] = useState<Record<string, PitchOutlinePolygon>>({});

  if (!visible) return null;

  const hasFocus = Boolean(highlightedPitchId);

  function outlineFor(pitch: AssetMapOutlinePitch): PitchOutlinePolygon | null {
    if (liveByPitch[pitch.id]) return liveByPitch[pitch.id];
    if (draft && drag?.kind === "draw" && drag.pitchId === pitch.id) return draft;
    return pitch.outline;
  }

  function clientToPercent(clientX: number, clientY: number) {
    const el = svgRef.current?.getBoundingClientRect();
    if (!el) return { x: 0, y: 0 };
    return pointerToMapPercent(clientX, clientY, el);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interactive) return;
    const target = event.target as Element;
    if (target.closest("[data-outline-handle]") || target.closest("[data-outline-mid]")) return;

    const { x, y } = clientToPercent(event.clientX, event.clientY);

    if (drawMode && drawPitchId) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ kind: "draw", pitchId: drawPitchId, startX: x, startY: y });
      setDraft(rectFromDrag(x, y, x, y));
      onSelectPitch(drawPitchId);
      return;
    }

    const hitPitchId = target.getAttribute("data-outline-pitch");
    if (hitPitchId) {
      const pitch = pitches.find((p) => p.id === hitPitchId);
      const outline = pitch ? outlineFor(pitch) : null;
      if (pitch && outline) {
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelectPitch(hitPitchId);
        setDrag({ kind: "move", pitchId: hitPitchId, lastX: x, lastY: y, outline });
        return;
      }
    }

    onSelectPitch(null);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const { x, y } = clientToPercent(event.clientX, event.clientY);

    if (drag.kind === "draw") {
      setDraft(rectFromDrag(drag.startX, drag.startY, x, y));
      return;
    }

    if (drag.kind === "move") {
      const next = translateOutline(drag.outline, x - drag.lastX, y - drag.lastY);
      setLiveByPitch((prev) => ({ ...prev, [drag.pitchId]: next }));
      setDrag({ ...drag, lastX: x, lastY: y, outline: next });
      return;
    }

    if (drag.kind === "vertex") {
      const next = moveOutlineVertex(drag.outline, drag.index, x, y);
      setLiveByPitch((prev) => ({ ...prev, [drag.pitchId]: next }));
      setDrag({ ...drag, outline: next });
    }
  }

  function handlePointerUp() {
    if (!drag) return;
    if (drag.kind === "draw" && draft) {
      const parsed = parsePitchOutline(draft);
      if (parsed) onOutlineCommit(drag.pitchId, parsed);
      setDraft(null);
    } else if (drag.kind === "move" || drag.kind === "vertex") {
      onOutlineCommit(drag.pitchId, drag.outline);
      setLiveByPitch((prev) => {
        const next = { ...prev };
        delete next[drag.pitchId];
        return next;
      });
    }
    setDrag(null);
  }

  function startVertexDrag(
    event: ReactPointerEvent<SVGCircleElement>,
    pitchId: string,
    index: number,
    outline: PitchOutlinePolygon,
  ) {
    if (!interactive || drawMode) return;
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    onSelectPitch(pitchId);
    setDrag({ kind: "vertex", pitchId, index, outline });
  }

  function handleAddVertex(
    event: ReactPointerEvent<SVGCircleElement>,
    pitchId: string,
    edgeIndex: number,
    outline: PitchOutlinePolygon,
  ) {
    if (!interactive || drawMode) return;
    event.stopPropagation();
    const mid = edgeMidpoint(outline, edgeIndex);
    if (!mid) return;
    const next = insertOutlineVertex(outline, edgeIndex, mid);
    onSelectPitch(pitchId);
    onOutlineCommit(pitchId, next);
    setLiveByPitch((prev) => {
      const copy = { ...prev };
      delete copy[pitchId];
      return copy;
    });
  }

  function handleRemoveVertex(
    event: ReactPointerEvent<SVGCircleElement>,
    pitchId: string,
    index: number,
    outline: PitchOutlinePolygon,
  ) {
    if (!interactive || drawMode) return;
    event.stopPropagation();
    event.preventDefault();
    const next = removeOutlineVertex(outline, index);
    if (next.points.length === outline.points.length) return;
    onSelectPitch(pitchId);
    onOutlineCommit(pitchId, next);
  }

  // Draw focused outline last so it sits on top.
  const orderedPitches = hasFocus
    ? [
        ...pitches.filter((p) => p.id !== highlightedPitchId),
        ...pitches.filter((p) => p.id === highlightedPitchId),
      ]
    : pitches;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 z-[15] h-full w-full ${
        interactive ? (drawMode ? "cursor-crosshair" : "cursor-default") : "pointer-events-none"
      }`}
      style={{ touchAction: interactive ? "none" : undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <defs>
        <filter id="outline-focus-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#fbbf24" floodOpacity="0.55" />
        </filter>
      </defs>
      {orderedPitches.map((pitch) => {
        const outline = outlineFor(pitch);
        if (!outline) return null;
        const editing = selectedPitchId === pitch.id;
        const focused = highlightedPitchId === pitch.id;
        const dimmed = hasFocus && !focused;
        const bounds = outlineBounds(outline);
        const center = outlineCenter(outline);
        const fillAlpha = focused ? 0.48 : editing ? 0.36 : dimmed ? 0.08 : 0.32;
        const strokeWidth = focused ? 1.75 : editing ? 1.2 : dimmed ? 0.35 : 0.95;
        const showPitchLabel = showLabels || focused;
        const labelSize = focused
          ? Math.min(4.2, Math.max(2.4, Math.min(bounds.w, bounds.h) / 5.5))
          : Math.min(3.4, Math.max(1.8, Math.min(bounds.w, bounds.h) / 7));

        return (
          <g
            key={pitch.id}
            opacity={dimmed ? 0.35 : 1}
            filter={focused ? "url(#outline-focus-glow)" : undefined}
          >
            {/* Dark under-stroke so the shape reads on bright grass */}
            <polygon
              points={outlinePointsToSvg(outline)}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={strokeWidth + (focused ? 1.1 : 0.55)}
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
            />
            <polygon
              data-outline-pitch={pitch.id}
              points={outlinePointsToSvg(outline)}
              fill={hexWithAlpha(pitch.color, fillAlpha)}
              stroke={focused ? "#fbbf24" : pitch.color}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className={interactive && !drawMode ? "cursor-move" : undefined}
            />
            {focused ? (
              <polygon
                points={outlinePointsToSvg(outline)}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={0.55}
                strokeDasharray="1.8 1.1"
                vectorEffect="non-scaling-stroke"
                className="pointer-events-none"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="12"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </polygon>
            ) : null}
            {showPitchLabel ? (
              <g className="pointer-events-none select-none">
                <rect
                  x={center.cx - Math.min(bounds.w, 28) / 2}
                  y={center.cy - (focused && highlightCaption ? labelSize * 1.15 : labelSize * 0.7)}
                  width={Math.min(bounds.w, 28)}
                  height={focused && highlightCaption ? labelSize * 2.35 : labelSize * 1.45}
                  rx={0.8}
                  fill={focused ? "rgba(15,15,18,0.78)" : "rgba(15,15,18,0.55)"}
                  stroke={focused ? "rgba(251,191,36,0.85)" : "rgba(255,255,255,0.25)"}
                  strokeWidth={focused ? 0.35 : 0.2}
                />
                <text
                  x={center.cx}
                  y={
                    focused && highlightCaption
                      ? center.cy - labelSize * 0.25
                      : center.cy
                  }
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={labelSize}
                  fontWeight={focused ? 700 : 600}
                >
                  {pitch.name}
                </text>
                {focused && highlightCaption ? (
                  <text
                    x={center.cx}
                    y={center.cy + labelSize * 0.85}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(253,230,138,0.98)"
                    fontSize={Math.max(1.5, labelSize * 0.55)}
                    fontWeight={600}
                  >
                    {highlightCaption}
                  </text>
                ) : null}
              </g>
            ) : null}
            {interactive && editing && !drawMode ? (
              <>
                {outline.points.map((_, edgeIndex) => {
                  const mid = edgeMidpoint(outline, edgeIndex);
                  if (!mid) return null;
                  return (
                    <circle
                      key={`${pitch.id}-mid-${edgeIndex}`}
                      data-outline-mid={edgeIndex}
                      cx={mid.x}
                      cy={mid.y}
                      r={0.9}
                      fill="rgba(255,255,255,0.85)"
                      stroke={pitch.color}
                      strokeWidth={0.25}
                      strokeDasharray="0.4 0.35"
                      className="cursor-copy"
                      onPointerDown={(e) => handleAddVertex(e, pitch.id, edgeIndex, outline)}
                    >
                      <title>Add corner</title>
                    </circle>
                  );
                })}
                {outline.points.map((point, index) => (
                  <circle
                    key={`${pitch.id}-v-${index}`}
                    data-outline-handle={index}
                    cx={point.x}
                    cy={point.y}
                    r={1.25}
                    fill="white"
                    stroke={pitch.color}
                    strokeWidth={0.35}
                    className="cursor-move"
                    onPointerDown={(e) => startVertexDrag(e, pitch.id, index, outline)}
                    onDoubleClick={(e) => handleRemoveVertex(e, pitch.id, index, outline)}
                    onContextMenu={(e) => handleRemoveVertex(e, pitch.id, index, outline)}
                  >
                    <title>Drag to move · double-click / right-click to remove</title>
                  </circle>
                ))}
              </>
            ) : null}
          </g>
        );
      })}
      {draft && drag?.kind === "draw" ? (
        <polygon
          points={outlinePointsToSvg(draft)}
          fill="rgba(59,130,246,0.28)"
          stroke="rgb(59,130,246)"
          strokeWidth={0.85}
          strokeDasharray="1.5 1"
          vectorEffect="non-scaling-stroke"
          className="pointer-events-none"
        />
      ) : null}
    </svg>
  );
}
