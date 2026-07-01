export interface AiChatMessageLike {
  role: string;
  content: string;
}

const DEFAULT_MAX_TURNS = 24;
const DEFAULT_MAX_CHARS = 14_000;

/** Keep recent turns for the LLM API without unbounded context growth. */
export function prepareChatMessagesForApi<T extends AiChatMessageLike>(
  messages: T[],
  opts?: { maxTurns?: number; maxChars?: number },
): T[] {
  const maxTurns = opts?.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS;

  let trimmed = messages.slice(-maxTurns);
  while (trimmed.length > 2 && totalChars(trimmed) > maxChars) {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

function totalChars(messages: AiChatMessageLike[]): number {
  return messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
}
