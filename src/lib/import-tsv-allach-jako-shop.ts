import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  JAKO_SHOP_CATEGORY_LABELS,
  TSV_ALLACH_JAKO_SHOP_CATALOG,
  TSV_ALLACH_JAKO_TEAMSHOP_URL,
  buildJakoProductDescription,
  jakoProductMeta,
  type JakoShopCategoryKey,
} from "@/lib/tsv-allach-jako-shop-catalog";

export interface ImportJakoShopResult {
  categoriesUpserted: number;
  productsUpserted: number;
  error?: string;
}

async function upsertCategory(clubId: string, key: JakoShopCategoryKey, locale: "de" | "en", createdBy: string): Promise<string | null> {
  const name = JAKO_SHOP_CATEGORY_LABELS[key][locale];
  const { data, error } = await supabaseDynamic
    .from("shop_categories")
    .upsert(
      { club_id: clubId, name, is_active: true, created_by: createdBy, updated_at: new Date().toISOString() },
      { onConflict: "club_id,name" },
    )
    .select("id")
    .single();

  if (error) return null;
  return (data as { id: string }).id;
}

export async function importTsvAllachJakoShopCatalog(
  clubId: string,
  locale: "de" | "en" = "de",
): Promise<ImportJakoShopResult> {
  const { data: authData } = await supabase.auth.getUser();
  const createdBy = authData.user?.id;
  if (!createdBy) {
    return { categoriesUpserted: 0, productsUpserted: 0, error: "Not authenticated" };
  }

  const categoryKeys = [...new Set(TSV_ALLACH_JAKO_SHOP_CATALOG.map((p) => p.categoryKey))];
  const categoryIdByKey = new Map<JakoShopCategoryKey, string>();

  for (const key of categoryKeys) {
    const id = await upsertCategory(clubId, key, locale, createdBy);
    if (id) categoryIdByKey.set(key, id);
  }

  let productsUpserted = 0;
  for (const item of TSV_ALLACH_JAKO_SHOP_CATALOG) {
    const categoryId = categoryIdByKey.get(item.categoryKey) ?? null;
    const payload = {
      club_id: clubId,
      category_id: categoryId,
      name: item.name,
      description: buildJakoProductDescription(item, locale),
      price_eur: item.priceFromEur,
      price_max_eur: item.priceToEur ?? item.priceFromEur,
      stock: 99,
      image_url: item.imageUrl,
      image_urls: [item.imageUrl],
      is_active: true,
      import_key: item.importKey,
      external_url: TSV_ALLACH_JAKO_TEAMSHOP_URL,
      product_meta: jakoProductMeta(item),
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDynamic
      .from("shop_products")
      .upsert(payload, { onConflict: "club_id,import_key" });

    if (error) {
      return {
        categoriesUpserted: categoryIdByKey.size,
        productsUpserted,
        error: error.message,
      };
    }
    productsUpserted += 1;
  }

  return { categoriesUpserted: categoryIdByKey.size, productsUpserted };
}

export function countJakoCatalogProducts(): number {
  return TSV_ALLACH_JAKO_SHOP_CATALOG.length;
}
