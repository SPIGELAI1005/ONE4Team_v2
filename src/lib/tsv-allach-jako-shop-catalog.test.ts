import { describe, expect, it } from "vitest";
import {
  TSV_ALLACH_JAKO_SHOP_CATALOG,
  buildJakoProductDescription,
  jakoProductMeta,
} from "./tsv-allach-jako-shop-catalog";
import { formatShopPrice } from "./shop-product-display";

describe("tsv-allach-jako-shop-catalog", () => {
  it("contains 20 unique JAKO articles", () => {
    expect(TSV_ALLACH_JAKO_SHOP_CATALOG).toHaveLength(20);
    const keys = TSV_ALLACH_JAKO_SHOP_CATALOG.map((p) => p.importKey);
    expect(new Set(keys).size).toBe(20);
  });

  it("builds German descriptions with sizes and colors", () => {
    const trikot = TSV_ALLACH_JAKO_SHOP_CATALOG.find((p) => p.importKey === "jako-trikot-team-kurzarm");
    expect(trikot).toBeDefined();
    const desc = buildJakoProductDescription(trikot!, "de");
    expect(desc).toContain("Farben: Grün, Schwarz, Weiß");
    expect(desc).toContain("Kinder");
    expect(desc).toContain("team.jako.com");
  });

  it("serializes product meta for storage", () => {
    const item = TSV_ALLACH_JAKO_SHOP_CATALOG[0];
    const meta = jakoProductMeta(item);
    expect(meta.brand).toBe("JAKO");
    expect(meta.priceFromEur).toBe(item.priceFromEur);
  });
});

describe("formatShopPrice", () => {
  it("shows from-price for ranged products", () => {
    const display = formatShopPrice(15.99, 21.89, { priceFromEur: 15.99, priceToEur: 21.89 }, "de-DE", "ab");
    expect(display.hasRange).toBe(true);
    expect(display.primary).toContain("ab");
    expect(display.primary).toContain("15,99");
  });
});
