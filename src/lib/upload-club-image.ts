import { supabase } from "@/integrations/supabase/client";

export const CLUB_ASSETS_BUCKET = "images-clubs";

/** Upload a club-scoped public image (path: `{clubId}/{folder}/…`). */
export async function uploadClubImageAsset(
  clubId: string,
  file: File,
  folder: string,
): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const filePath = `${clubId}/${folder}/${Date.now()}-${cleanName}`;
  const { error } = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(filePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
