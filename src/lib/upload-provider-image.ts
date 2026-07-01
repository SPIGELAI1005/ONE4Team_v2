import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-error";

export const PROVIDER_ASSETS_BUCKET = "images-marketplace-providers";

export const MAX_PROVIDER_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_PROVIDER_COVER_BYTES = 5 * 1024 * 1024;

export type ProviderImageFolder = "logo" | "cover";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateProviderImageFile(
  file: File,
  folder: ProviderImageFolder,
): "type" | "size" | null {
  if (!ALLOWED_MIMES.has(file.type)) {
    return "type";
  }
  const maxBytes = folder === "logo" ? MAX_PROVIDER_LOGO_BYTES : MAX_PROVIDER_COVER_BYTES;
  if (file.size > maxBytes) {
    return "size";
  }
  return null;
}

/** Upload a provider-scoped public image (path: `{userId}/{folder}/…`). */
export async function uploadProviderImageAsset(
  file: File,
  folder: ProviderImageFolder,
): Promise<string> {
  const validation = validateProviderImageFile(file, folder);
  if (validation === "type") {
    throw new Error("INVALID_IMAGE_TYPE");
  }
  if (validation === "size") {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const filePath = `${session.user.id}/${folder}/${Date.now()}-${cleanName}`;
  const { error } = await supabase.storage.from(PROVIDER_ASSETS_BUCKET).upload(filePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) {
    const message = formatSupabaseError(error) || "Upload failed";
    throw new Error(message);
  }
  const { data } = supabase.storage.from(PROVIDER_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
