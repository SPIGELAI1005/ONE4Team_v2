import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clearStaleChunkReloadFlag,
  isStaleChunkLoadError,
  reloadForStaleChunkOnce,
} from "@/lib/stale-chunk-reload";

describe("stale-chunk-reload", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("detects dynamic import failures", () => {
    expect(
      isStaleChunkLoadError(
        new Error("Failed to fetch dynamically imported module: https://www.one4team.com/assets/CoTrainer-x.js"),
      ),
    ).toBe(true);
    expect(isStaleChunkLoadError(new Error("Random UI bug"))).toBe(false);
  });

  it("reloads only once per session guard", () => {
    expect(reloadForStaleChunkOnce("test")).toBe(true);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(reloadForStaleChunkOnce("test")).toBe(false);
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    clearStaleChunkReloadFlag();
    expect(reloadForStaleChunkOnce("test")).toBe(true);
    expect(window.location.reload).toHaveBeenCalledTimes(2);
  });
});
