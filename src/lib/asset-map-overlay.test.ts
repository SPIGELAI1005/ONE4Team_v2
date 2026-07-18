import { describe, expect, it } from "vitest";
import {
  clampOverlayOffset,
  clampOverlayOpacity,
  clampOverlayRotation,
  clampOverlayScale,
  defaultAssetMapOverlay,
  isAllowedAssetMapOverlayFile,
  nextOverlayRotation,
  overlayImageStyle,
  parseAssetMapOverlay,
  serializeAssetMapOverlay,
} from "@/lib/asset-map-overlay";

describe("asset-map-overlay", () => {
  it("parses and clamps overlay fields including free rotation", () => {
    expect(parseAssetMapOverlay(null)).toEqual(defaultAssetMapOverlay());
    const parsed = parseAssetMapOverlay({
      url: " https://example.com/map.jpg ",
      opacity: 2,
      scale: 0.1,
      offset_x: -200,
      offset_y: 50,
      rotation: 37,
    });
    expect(parsed.url).toBe("https://example.com/map.jpg");
    expect(parsed.opacity).toBe(1);
    expect(parsed.scale).toBe(0.5);
    expect(parsed.offset_x).toBe(-100);
    expect(parsed.offset_y).toBe(50);
    expect(parsed.rotation).toBe(37);
  });

  it("normalizes rotation into 0–359", () => {
    expect(clampOverlayRotation(365)).toBe(5);
    expect(clampOverlayRotation(-10)).toBe(350);
    expect(clampOverlayRotation(12.6)).toBe(13);
  });

  it("serializes empty when no url", () => {
    expect(serializeAssetMapOverlay(defaultAssetMapOverlay())).toEqual({});
    expect(
      serializeAssetMapOverlay({
        url: "https://x/y.png",
        opacity: 0.4,
        scale: 1.2,
        offset_x: 10,
        offset_y: -5,
        rotation: 180,
        fit: "cover",
        pitch_display: "both",
      }),
    ).toEqual({
      url: "https://x/y.png",
      opacity: 0.4,
      scale: 1.2,
      offset_x: 10,
      offset_y: -5,
      rotation: 180,
      fit: "cover",
      pitch_display: "both",
    });
    expect(
      serializeAssetMapOverlay({
        ...defaultAssetMapOverlay(),
        pitch_display: "outlines",
      }),
    ).toEqual({ pitch_display: "outlines" });
  });

  it("defaults fit to contain and accepts cover", () => {
    expect(parseAssetMapOverlay({ url: "https://x/a.png" }).fit).toBe("contain");
    expect(parseAssetMapOverlay({ url: "https://x/a.png", fit: "cover" }).fit).toBe("cover");
  });

  it("parses pitch_display mode", () => {
    expect(parseAssetMapOverlay({}).pitch_display).toBe("cells");
    expect(parseAssetMapOverlay({ pitch_display: "outlines" }).pitch_display).toBe("outlines");
    expect(parseAssetMapOverlay({ pitch_display: "both" }).pitch_display).toBe("both");
  });

  it("builds transform style with free rotation", () => {
    const style = overlayImageStyle({
      opacity: 0.5,
      scale: 1.5,
      offset_x: 10,
      offset_y: -20,
      rotation: 15,
    });
    expect(style.opacity).toBe(0.5);
    expect(style.transform).toContain("translate(10%, -20%)");
    expect(style.transform).toContain("rotate(15deg)");
    expect(style.transform).toContain("scale(1.5)");
  });

  it("steps rotation by 90 degrees as a shortcut", () => {
    expect(nextOverlayRotation(0)).toBe(90);
    expect(nextOverlayRotation(90)).toBe(180);
    expect(nextOverlayRotation(270)).toBe(0);
  });

  it("validates upload files", () => {
    expect(clampOverlayOpacity(-1)).toBe(0);
    expect(clampOverlayScale(9)).toBe(3);
    expect(clampOverlayOffset(0)).toBe(0);
    expect(
      isAllowedAssetMapOverlayFile(new File([""], "a.jpg", { type: "image/jpeg" })),
    ).toEqual({ ok: true });
    expect(
      isAllowedAssetMapOverlayFile(new File([""], "a.gif", { type: "image/gif" })),
    ).toEqual({ ok: false, reason: "type" });
  });
});
