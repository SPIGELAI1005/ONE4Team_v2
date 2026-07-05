import { describe, expect, it } from "vitest";
import {
  messagePaginationRange,
  resolveMessagePaginationCount,
} from "@/lib/communication-pagination";

describe("communication-pagination", () => {
  describe("resolveMessagePaginationCount", () => {
    it("uses supabase count when present", () => {
      expect(
        resolveMessagePaginationCount({
          supabaseCount: 42,
          rowCount: 10,
          page: 1,
          visibleCount: 10,
          pageSize: 50,
        }),
      ).toBe(42);
    });

    it("falls back to row count when supabase count is zero", () => {
      expect(
        resolveMessagePaginationCount({
          supabaseCount: 0,
          rowCount: 12,
          page: 1,
          visibleCount: 12,
          pageSize: 50,
        }),
      ).toBe(12);
    });

    it("uses visible count on page 1 when both counts are zero", () => {
      expect(
        resolveMessagePaginationCount({
          supabaseCount: null,
          rowCount: 0,
          page: 1,
          visibleCount: 3,
          pageSize: 50,
        }),
      ).toBe(3);
    });
  });

  describe("messagePaginationRange", () => {
    it("returns zero range when empty", () => {
      expect(messagePaginationRange(0, 1, 50, 0)).toEqual({ from: 0, to: 0, total: 0 });
    });

    it("never shows zero total when messages are visible on page 1", () => {
      expect(messagePaginationRange(0, 1, 50, 5)).toEqual({ from: 1, to: 5, total: 5 });
    });

    it("computes range for paginated totals", () => {
      expect(messagePaginationRange(120, 2, 50, 50)).toEqual({ from: 51, to: 100, total: 120 });
    });
  });
});
