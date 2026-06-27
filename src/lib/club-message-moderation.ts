/** Senders may edit their own chat messages within this window after posting. */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditMessage(
  message: { sender_id: string; created_at: string },
  userId: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!userId || message.sender_id !== userId) return false;
  return nowMs - new Date(message.created_at).getTime() <= MESSAGE_EDIT_WINDOW_MS;
}

export function canDeleteMessage(
  message: { sender_id: string },
  userId: string | undefined,
): boolean {
  return Boolean(userId && message.sender_id === userId);
}

export function canManageAnnouncements(isAdmin: boolean): boolean {
  return isAdmin;
}
