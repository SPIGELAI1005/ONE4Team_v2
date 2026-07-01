export interface ShopProductMeta {
  brand?: string;
  supplier?: string;
  source?: string;
  colors?: string[];
  sizeGroups?: { label: string; sizes: string; priceEur: number }[];
  priceFromEur?: number;
  priceToEur?: number;
  listPriceEur?: number | null;
  sustainable?: boolean;
}

export interface ShopPriceDisplay {
  primary: string;
  secondary?: string;
  hasRange: boolean;
}

function formatEur(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
}

export function parseShopProductMeta(raw: unknown): ShopProductMeta | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ShopProductMeta;
}

export function formatShopPrice(
  priceEur: number,
  priceMaxEur: number | null | undefined,
  meta: ShopProductMeta | null,
  locale: string,
  fromLabel: string,
): ShopPriceDisplay {
  const from = meta?.priceFromEur ?? priceEur;
  const to = meta?.priceToEur ?? priceMaxEur ?? priceEur;
  const list = meta?.listPriceEur;

  if (from < to - 0.001) {
    return {
      primary: `${fromLabel} ${formatEur(from, locale)}`,
      secondary: list && list > to ? formatEur(list, locale) : undefined,
      hasRange: true,
    };
  }

  return {
    primary: formatEur(priceEur, locale),
    secondary: list && list > priceEur ? formatEur(list, locale) : undefined,
    hasRange: false,
  };
}

export function shopProductSizeHint(meta: ShopProductMeta | null, maxGroups = 2): string | null {
  if (!meta?.sizeGroups?.length) return null;
  const parts = meta.sizeGroups.slice(0, maxGroups).map((g) => g.label);
  if (meta.sizeGroups.length > maxGroups) parts.push("…");
  return parts.join(" · ");
}
