import { describe, expect, it } from "vitest";
import {
  clampOutlineCoord,
  clampOutlineRotation,
  clampOutlineSize,
  edgeMidpoint,
  insertOutlineVertex,
  moveOutlineVertex,
  outlineCenter,
  outlinePointsToSvg,
  parsePitchOutline,
  pointerToMapPercent,
  rectFromDrag,
  removeOutlineVertex,
  serializePitchOutline,
  translateOutline,
} from "@/lib/pitch-outline";

describe("pitch-outline", () => {
  it("parses polygons and migrates legacy rects", () => {
    expect(parsePitchOutline(null)).toBeNull();
    expect(parsePitchOutline({ type: "polygon", points: [{ x: 1, y: 1 }] })).toBeNull();
    expect(
      parsePitchOutline({
        type: "polygon",
        points: [
          { x: 10, y: 10 },
          { x: 40, y: 10 },
          { x: 40, y: 30 },
        ],
      }),
    ).toEqual({
      type: "polygon",
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 10 },
        { x: 40, y: 30 },
      ],
    });
    const fromRect = parsePitchOutline({ type: "rect", x: 10, y: 20, w: 30, h: 15, rotation: 0 });
    expect(fromRect?.type).toBe("polygon");
    expect(fromRect?.points).toHaveLength(4);
    expect(fromRect?.points[0]).toEqual({ x: 10, y: 20 });
    expect(fromRect?.points[2]).toEqual({ x: 40, y: 35 });
  });

  it("clamps coords, size, and rotation", () => {
    expect(clampOutlineCoord(-5)).toBe(0);
    expect(clampOutlineCoord(120)).toBe(100);
    expect(clampOutlineSize(0.5)).toBe(2);
    expect(clampOutlineRotation(400)).toBe(40);
    expect(clampOutlineRotation(-10)).toBe(350);
  });

  it("builds a 4-point polygon from drag corners", () => {
    expect(rectFromDrag(40, 50, 10, 20)).toEqual({
      type: "polygon",
      points: [
        { x: 10, y: 20 },
        { x: 40, y: 20 },
        { x: 40, y: 50 },
        { x: 10, y: 50 },
      ],
    });
  });

  it("serializes, centers, and builds svg points", () => {
    const outline = parsePitchOutline({
      type: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ],
    })!;
    expect(serializePitchOutline(outline)).toEqual(outline);
    expect(outlineCenter(outline)).toEqual({ cx: 10, cy: 10 });
    expect(outlinePointsToSvg(outline)).toBe("0,0 20,0 20,20 0,20");
  });

  it("maps pointer to percent and translates outline", () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect;
    expect(pointerToMapPercent(100, 50, rect)).toEqual({ x: 50, y: 50 });
    const moved = translateOutline(
      {
        type: "polygon",
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 30, y: 30 },
        ],
      },
      5,
      -3,
    );
    expect(moved.points[0]).toEqual({ x: 15, y: 7 });
  });

  it("moves, inserts, and removes vertices independently", () => {
    const base = {
      type: "polygon" as const,
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
        { x: 30, y: 30 },
        { x: 10, y: 30 },
      ],
    };
    const moved = moveOutlineVertex(base, 1, 45, 12);
    expect(moved.points[1]).toEqual({ x: 45, y: 12 });
    expect(moved.points[0]).toEqual({ x: 10, y: 10 });
    expect(moved.points[2]).toEqual({ x: 30, y: 30 });

    const mid = edgeMidpoint(base, 0);
    expect(mid).toEqual({ x: 20, y: 10 });
    const inserted = insertOutlineVertex(base, 0, mid!);
    expect(inserted.points).toHaveLength(5);
    expect(inserted.points[1]).toEqual({ x: 20, y: 10 });

    const removed = removeOutlineVertex(inserted, 1);
    expect(removed.points).toHaveLength(4);
    expect(removeOutlineVertex(base, 0).points).toHaveLength(3);
    expect(removeOutlineVertex(removeOutlineVertex(removeOutlineVertex(base, 0), 0), 0).points).toHaveLength(3);
  });
});
