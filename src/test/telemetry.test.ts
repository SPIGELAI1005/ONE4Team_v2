import { describe, expect, it, vi, beforeEach } from "vitest";
import { trackEvent } from "@/lib/telemetry";

describe("trackEvent", () => {
  beforeEach(() => {
    (window as Window & { one4teamTelemetryQueue?: unknown[] }).one4teamTelemetryQueue = [];
    (window as Window & { dataLayer?: unknown[] }).dataLayer = [];
  });

  it("stores event in one4team queue", () => {
    trackEvent("login_success", { hasReturnTo: true });

    const queue = (window as Window & { one4teamTelemetryQueue?: Array<{ event: string }> }).one4teamTelemetryQueue;
    expect(queue?.length).toBe(1);
    expect(queue?.[0]?.event).toBe("login_success");
  });

  it("forwards event into dataLayer when present", () => {
    const dataLayer: unknown[] = [];
    (window as Window & { dataLayer?: unknown[] }).dataLayer = dataLayer;

    trackEvent("club_join_outcome", { outcome: "pending_review" });

    expect(dataLayer.length).toBe(1);
  });

  it("logs in dev mode", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    trackEvent("invite_created");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
