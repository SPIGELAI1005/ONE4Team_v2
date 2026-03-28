import { supabase } from "@/integrations/supabase/client";

export const SHOP_PRODUCT_IMAGE_BUCKET = "shop-product-images";
export const MAX_SHOP_PRODUCT_IMAGES = 3;
/** Per-file limit (aligned with storage bucket file_size_limit in migration). */
export const MAX_SHOP_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const SHOP_PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const ALLOWED_MIMES = new Set<string>(SHOP_PRODUCT_IMAGE_TYPES);

export function parseProductImageUrls(row: { image_urls?: unknown; image_url?: string | null }): string[] {
  const raw = row.image_urls;
  if (Array.isArray(raw)) {
    const urls = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
    if (urls.length) return urls.slice(0, MAX_SHOP_PRODUCT_IMAGES);
  }
  if (typeof row.image_url === "string" && row.image_url.trim()) return [row.image_url.trim()];
  return [];
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIMES.has(file.type)) {
    return "type";
  }
  if (file.size > MAX_SHOP_PRODUCT_IMAGE_BYTES) {
    return "size";
  }
  return null;
}

export async function uploadShopProductImage(
  clubId: string,
  file: File,
): Promise<{ url: string } | { error: "type" | "size" | "upload" }> {
  const v = validateImageFile(file);
  if (v === "type") return { error: "type" };
  if (v === "size") return { error: "size" };

  const ext = MIME_TO_EXT[file.type] || "jpg";
  const path = `${clubId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(SHOP_PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("shop product image upload:", error.message);
    return { error: "upload" };
  }

  const { data } = supabase.storage.from(SHOP_PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
