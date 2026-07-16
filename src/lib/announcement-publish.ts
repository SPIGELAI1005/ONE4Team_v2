export function isAnnouncementPubliclyVisible(input: {
  publish_to_public_website?: boolean | null;
  is_draft?: boolean | null;
  scheduled_publish_at?: string | null;
  nowMs?: number;
}): boolean {
  if (!input.publish_to_public_website) return false;
  if (input.is_draft) return false;
  if (input.scheduled_publish_at) {
    const at = new Date(input.scheduled_publish_at).getTime();
    if (Number.isFinite(at) && at > (input.nowMs ?? Date.now())) return false;
  }
  return true;
}

export function announcementShareCard(input: {
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  url: string;
}): { title: string; description: string; imageUrl: string | null; url: string } {
  return {
    title: input.title.trim() || "Club news",
    description: (input.excerpt ?? "").trim().slice(0, 200),
    imageUrl: input.imageUrl?.trim() || null,
    url: input.url,
  };
}
