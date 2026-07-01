/** JAKO teamshop catalog for TSV Allach 09 — source: https://team.jako.com/de-de/team/tsv_allach_09/ */

export const TSV_ALLACH_JAKO_TEAMSHOP_URL = "https://team.jako.com/de-de/team/tsv_allach_09/";

export type JakoShopCategoryKey =
  | "sets"
  | "jerseys"
  | "pants"
  | "jackets"
  | "accessories"
  | "sustainable";

export interface JakoSizeGroup {
  label: string;
  sizes: string;
  priceEur: number;
}

export interface JakoShopCatalogItem {
  importKey: string;
  name: string;
  brand: "JAKO";
  categoryKey: JakoShopCategoryKey;
  priceFromEur: number;
  priceToEur?: number;
  listPriceEur?: number;
  colors?: string[];
  sizeGroups: JakoSizeGroup[];
  sustainable?: boolean;
  notes?: string;
  imageUrl: string;
}

/** Product preview/thumb URLs from https://team.jako.com/de-de/team/tsv_allach_09/ (cdn.jako.de). */
export const TSV_ALLACH_JAKO_PRODUCT_IMAGES: Record<string, string> = {
  "jako-allach09-starter-set":
    "https://cdn.jako.de/userdata/dcshop/images/thumb_4/SET-17391-001-002b871d469ade34e16ec71ac4aba129.jpg",
  "jako-trikot-team-kurzarm":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/7/8/preview_78703bc3ad295d4fa17d83bb2d194744_4233_06.jpg",
  "jako-sporthose-manchester-2":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/d/d/preview_dd93e4208c9c695a1a9517d588a008b4_4400_06.jpg",
  "jako-trainingsanzug-polyester-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/b/7/preview_b7065f36d0bd26c84c9c1ae6c0b141b1_M9123_200.jpg",
  "jako-praesentationsanzug-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/c/c/preview_cc7909dabca3cbab9a5e95216a1f6b65_M9623_200.jpg",
  "jako-polyesterjacke-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/f/7/preview_f7168a942090b1134f944e4916f7e87e_9323_200.jpg",
  "jako-kapuzenjacke-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/0/0/preview_005e3f0f052a9269de80077205980321_6823_200.jpg",
  "jako-ziptop-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea0c6795929e3bf5918c1a2e54e0f3c7_8623_200.jpg",
  "jako-trainingshose-active":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/9/f/preview_9f072376c7a3a8022c33304e85de3f7a_8495_08_Classic.jpg",
  "jako-allwetterjacke-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/f/4/preview_f41e55271e7674dba0b4b1c5a850fa33_7423_200.jpg",
  "jako-polo-power":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea8478acefa42388af5f479df4e332f4_6323_200.jpg",
  "jako-coachjacke-team":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/4/d/preview_4d5788e31947411f957b097259056c88_7104_800.jpg",
  "jako-winterjacke-function":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/7/6/preview_76f24167acadf4f788c540f27c7c0663_7208_800.jpg",
  "jako-longsleeve-comfort-2":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/8/6/preview_865b4c7d06ccb08418ef4327c709c5c7_6455_06.jpg",
  "jako-stutzen-glasgow-2": "https://cdn.jako.de/userdata/dcshop/images/thumb_4/3414_06.jpg",
  "jako-rucksack-tls":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/7/a/preview_7a49c293380e8ef6d41fca9d2f435d46_1816_06.jpg",
  "jako-sporttasche-classico":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/0/d/preview_0d7799d80001fa6cfcaef333ca822aab_2050_08.jpg",
  "jako-trinkflasche-premium":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/f/e/preview_fefaef65b5b9193b92e94898448bb24e_2177_00.jpg",
  "jako-kapuzensweat-organic":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/1/6/preview_16eb0daf224128cf8a2c1f95fdf91a2b_C6720_840.jpg",
  "jako-t-shirt-organic":
    "https://cdn.jako.de/userdata/dcshop/individualization/previews/9/3/preview_93dd8b12e8747f456ee30a7598ed1c16_c6120_800.jpg",
};

export const JAKO_SHOP_CATEGORY_LABELS: Record<JakoShopCategoryKey, { de: string; en: string }> = {
  sets: { de: "Sets & Pakete", en: "Sets & Bundles" },
  jerseys: { de: "Trikots & Shirts", en: "Jerseys & Shirts" },
  pants: { de: "Hosen", en: "Pants" },
  jackets: { de: "Jacken & Anzüge", en: "Jackets & Suits" },
  accessories: { de: "Accessoires", en: "Accessories" },
  sustainable: { de: "Nachhaltig", en: "Sustainable" },
};

const KIDS_SIZES = "104, 116, 128, 140, 152, 164";
const KIDS_SIZES_SHORT = "128, 140, 152, 164";
const UNISEX_SIZES = "S, M, L, XL, XXL, 3XL";
const UNISEX_SIZES_4XL = "S, M, L, XL, XXL, 3XL, 4XL";
const DAMEN_SIZES = "34, 36, 38, 40, 42, 44";
const DAMEN_SIZES_WIDE = "34, 36, 38, 40, 42, 44, 46, 48";

/** 20 unique articles (29 JAKO listing entries include color variants). */
const TSV_ALLACH_JAKO_SHOP_CATALOG_BASE: Omit<JakoShopCatalogItem, "imageUrl">[] = [
  {
    importKey: "jako-allach09-starter-set",
    name: "Allach09 Starter-Set",
    brand: "JAKO",
    categoryKey: "sets",
    priceFromEur: 96.87,
    priceToEur: 111.95,
    listPriceEur: 111.95,
    sizeGroups: [{ label: "Set", sizes: "Verschiedene Größen (Trikot, Hose, Stutzen)", priceEur: 96.87 }],
    notes: "Komplett-Set mit Vereinsveredelung.",
  },
  {
    importKey: "jako-trikot-team-kurzarm",
    name: "Trikot Team kurzarm",
    brand: "JAKO",
    categoryKey: "jerseys",
    priceFromEur: 15.99,
    priceToEur: 21.89,
    colors: ["Grün", "Schwarz", "Weiß"],
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES, priceEur: 20.29 },
      { label: "Unisex", sizes: UNISEX_SIZES, priceEur: 21.89 },
    ],
  },
  {
    importKey: "jako-sporthose-manchester-2",
    name: "Sporthose Manchester 2.0 ohne Innenslip",
    brand: "JAKO",
    categoryKey: "pants",
    priceFromEur: 13.99,
    priceToEur: 16.29,
    colors: ["Grün", "Schwarz", "Grau"],
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES, priceEur: 14.69 },
      { label: "Unisex", sizes: UNISEX_SIZES, priceEur: 16.29 },
    ],
  },
  {
    importKey: "jako-trainingsanzug-polyester-power",
    name: "Trainingsanzug Polyester Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 63.48,
    priceToEur: 75.48,
    listPriceEur: 74.98,
    sizeGroups: [
      { label: "Kinder", sizes: "116, 128, 140, 152, 164", priceEur: 63.48 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 75.48 },
      { label: "Damen", sizes: DAMEN_SIZES, priceEur: 75.48 },
    ],
  },
  {
    importKey: "jako-praesentationsanzug-power",
    name: "Präsentationsanzug Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 83.48,
    priceToEur: 95.48,
    listPriceEur: 99.98,
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES_SHORT, priceEur: 83.48 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 95.48 },
      { label: "Damen", sizes: DAMEN_SIZES, priceEur: 95.48 },
    ],
  },
  {
    importKey: "jako-polyesterjacke-power",
    name: "Polyesterjacke Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 39.49,
    priceToEur: 47.49,
    listPriceEur: 39.99,
    sizeGroups: [
      { label: "Kinder", sizes: "116, 128, 140, 152, 164", priceEur: 39.49 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 47.49 },
      { label: "Damen", sizes: DAMEN_SIZES, priceEur: 47.49 },
    ],
  },
  {
    importKey: "jako-kapuzenjacke-power",
    name: "Kapuzenjacke Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 51.49,
    priceToEur: 59.49,
    listPriceEur: 54.99,
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES_SHORT, priceEur: 51.49 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 59.49 },
      { label: "Damen", sizes: DAMEN_SIZES, priceEur: 59.49 },
    ],
  },
  {
    importKey: "jako-ziptop-power",
    name: "Ziptop Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 43.49,
    priceToEur: 47.49,
    listPriceEur: 44.99,
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES_SHORT, priceEur: 43.49 },
      { label: "Unisex", sizes: UNISEX_SIZES, priceEur: 47.49 },
    ],
  },
  {
    importKey: "jako-trainingshose-active",
    name: "Trainingshose Active",
    brand: "JAKO",
    categoryKey: "pants",
    priceFromEur: 27.99,
    priceToEur: 34.99,
    listPriceEur: 34.99,
    sizeGroups: [
      { label: "Kinder", sizes: "116, 128, 140, 152, 164", priceEur: 27.99 },
      { label: "Unisex", sizes: UNISEX_SIZES, priceEur: 31.99 },
    ],
  },
  {
    importKey: "jako-allwetterjacke-power",
    name: "Allwetterjacke Power",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 51.49,
    priceToEur: 59.99,
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES_SHORT, priceEur: 51.49 },
      { label: "Unisex", sizes: UNISEX_SIZES, priceEur: 59.49 },
    ],
  },
  {
    importKey: "jako-polo-power",
    name: "Polo Power",
    brand: "JAKO",
    categoryKey: "jerseys",
    priceFromEur: 34.99,
    priceToEur: 39.49,
    sizeGroups: [
      { label: "Kinder", sizes: "140, 152, 164", priceEur: 35.49 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 39.49 },
      { label: "Damen", sizes: DAMEN_SIZES, priceEur: 39.49 },
    ],
  },
  {
    importKey: "jako-coachjacke-team",
    name: "Coachjacke Team",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 79.49,
    priceToEur: 89.99,
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES_SHORT, priceEur: 79.49 },
      { label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 87.49 },
    ],
  },
  {
    importKey: "jako-winterjacke-function",
    name: "Winterjacke Function",
    brand: "JAKO",
    categoryKey: "jackets",
    priceFromEur: 143.99,
    priceToEur: 179.99,
    listPriceEur: 179.99,
    sizeGroups: [{ label: "Unisex", sizes: UNISEX_SIZES_4XL, priceEur: 143.99 }],
  },
  {
    importKey: "jako-longsleeve-comfort-2",
    name: "Longsleeve Comfort 2.0",
    brand: "JAKO",
    categoryKey: "jerseys",
    priceFromEur: 27.99,
    priceToEur: 34.99,
    listPriceEur: 34.99,
    colors: ["Schwarz", "Grün"],
    sizeGroups: [
      { label: "Kinder", sizes: "3XS, XXS, XS", priceEur: 27.99 },
      { label: "Unisex", sizes: "S, M, L, XL, XXL", priceEur: 31.99 },
    ],
  },
  {
    importKey: "jako-stutzen-glasgow-2",
    name: "Stutzen Glasgow 2.0",
    brand: "JAKO",
    categoryKey: "accessories",
    priceFromEur: 5.59,
    priceToEur: 6.99,
    listPriceEur: 6.99,
    colors: ["Grün", "Schwarz", "Weiß"],
    sizeGroups: [{ label: "Größe", sizes: "0 (Bambini), 1 (Junior), 2 (Senior)", priceEur: 5.59 }],
  },
  {
    importKey: "jako-rucksack-tls",
    name: "Rucksack TLS",
    brand: "JAKO",
    categoryKey: "accessories",
    priceFromEur: 23.49,
    priceToEur: 24.99,
    listPriceEur: 24.99,
    sizeGroups: [{ label: "Größe", sizes: "Einheitsgröße (ca. 32 Liter)", priceEur: 23.49 }],
  },
  {
    importKey: "jako-sporttasche-classico",
    name: "Sporttasche Classico",
    brand: "JAKO",
    categoryKey: "accessories",
    priceFromEur: 17.99,
    priceToEur: 53.49,
    sizeGroups: [
      { label: "Junior", sizes: "ca. 40 Liter", priceEur: 17.99 },
      { label: "Senior", sizes: "ca. 88 Liter", priceEur: 53.49 },
    ],
  },
  {
    importKey: "jako-trinkflasche-premium",
    name: "Trinkflasche Premium",
    brand: "JAKO",
    categoryKey: "accessories",
    priceFromEur: 7.19,
    priceToEur: 8.99,
    listPriceEur: 8.99,
    colors: ["Grün", "Schwarz"],
    sizeGroups: [{ label: "Größe", sizes: "0,75 Liter", priceEur: 7.19 }],
  },
  {
    importKey: "jako-kapuzensweat-organic",
    name: "Kapuzensweat Organic",
    brand: "JAKO",
    categoryKey: "sustainable",
    priceFromEur: 44.99,
    priceToEur: 49.99,
    listPriceEur: 49.99,
    sustainable: true,
    colors: ["Grün", "Schwarz"],
    sizeGroups: [
      { label: "Kinder", sizes: "116, 128, 140, 152, 164", priceEur: 44.99 },
      { label: "Unisex", sizes: "S, M, L, XL, XXL, 3XL, 4XL, 5XL", priceEur: 49.49 },
    ],
  },
  {
    importKey: "jako-t-shirt-organic",
    name: "T-Shirt Organic",
    brand: "JAKO",
    categoryKey: "sustainable",
    priceFromEur: 11.69,
    priceToEur: 13.49,
    listPriceEur: 12.99,
    sustainable: true,
    colors: ["Grün", "Schwarz"],
    sizeGroups: [
      { label: "Kinder", sizes: KIDS_SIZES, priceEur: 11.69 },
      { label: "Unisex", sizes: "S, M, L, XL, XXL, 3XL, 4XL, 5XL", priceEur: 13.49 },
      { label: "Damen", sizes: DAMEN_SIZES_WIDE, priceEur: 13.49 },
    ],
  },
];

export const TSV_ALLACH_JAKO_SHOP_CATALOG: JakoShopCatalogItem[] = TSV_ALLACH_JAKO_SHOP_CATALOG_BASE.map((item) => ({
  ...item,
  imageUrl: TSV_ALLACH_JAKO_PRODUCT_IMAGES[item.importKey],
}));

export function buildJakoProductDescription(item: JakoShopCatalogItem, locale: "de" | "en" = "de"): string {
  const lines: string[] = [];
  const sizeLabel = locale === "de" ? "Größen" : "Sizes";
  const colorsLabel = locale === "de" ? "Farben" : "Colors";

  if (item.colors?.length) {
    lines.push(`${colorsLabel}: ${item.colors.join(", ")}`);
  }
  for (const group of item.sizeGroups) {
    lines.push(`${group.label} (${group.priceEur.toFixed(2)} €) — ${sizeLabel}: ${group.sizes}`);
  }
  if (item.notes) lines.push(item.notes);
  lines.push(
    locale === "de"
      ? "Offizieller JAKO Teamshop-Artikel (Sportecke München). Veredelte Artikel über team.jako.com bestellen."
      : "Official JAKO teamshop article (Sportecke München). Order personalized items via team.jako.com.",
  );
  return lines.join("\n");
}

export function jakoProductMeta(item: JakoShopCatalogItem): Record<string, unknown> {
  return {
    brand: item.brand,
    supplier: "Sportecke München GmbH",
    source: "jako-teamshop",
    colors: item.colors ?? [],
    sizeGroups: item.sizeGroups,
    priceFromEur: item.priceFromEur,
    priceToEur: item.priceToEur ?? item.priceFromEur,
    listPriceEur: item.listPriceEur ?? null,
    sustainable: Boolean(item.sustainable),
  };
}
