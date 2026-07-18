import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { AssetMapOverlay } from "@/lib/asset-map-overlay";
import { normalizeOverlayFit, overlayImageStyle } from "@/lib/asset-map-overlay";

interface AssetMapOverlayUnderlayProps {
  overlay: AssetMapOverlay;
  alignMode?: boolean;
  onPanDelta?: (deltaXPercent: number, deltaYPercent: number) => void;
  onPanEnd?: () => void;
  className?: string;
}

/** Absolute satellite underlay for Combined/Booked Asset Map (and element paint grid). */
export function AssetMapOverlayUnderlay({
  overlay,
  alignMode = false,
  onPanDelta,
  onPanEnd,
  className,
}: AssetMapOverlayUnderlayProps) {
  const dragRef = useRef<null | { x: number; y: number; el: HTMLElement }>(null);

  if (!overlay.url) return null;

  const fit = normalizeOverlayFit(overlay.fit);
  const objectClass = fit === "cover" ? "object-cover" : "object-contain";
  const overflowClass = fit === "cover" ? "overflow-hidden" : "overflow-visible";

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!alignMode || !onPanDelta) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, el: event.currentTarget };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!alignMode || !onPanDelta || !dragRef.current) return;
    const rect = dragRef.current.el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dx = ((event.clientX - dragRef.current.x) / rect.width) * 100;
    const dy = ((event.clientY - dragRef.current.y) / rect.height) * 100;
    dragRef.current = { x: event.clientX, y: event.clientY, el: dragRef.current.el };
    onPanDelta(dx, dy);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!alignMode) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    onPanEnd?.();
  }

  return (
    <div
      className={`absolute inset-0 z-0 rounded-[inherit] ${overflowClass} ${alignMode ? "cursor-grab active:cursor-grabbing touch-none" : "pointer-events-none"} ${className ?? ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={overlay.url}
        alt=""
        draggable={false}
        className={`h-full w-full select-none ${objectClass}`}
        style={overlayImageStyle(overlay)}
      />
    </div>
  );
}
