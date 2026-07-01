export interface Ai4tErrorCopy {
  rateLimit: string;
  planGate: string;
  noApiKey: string;
  settingsLinkLabel: string;
  generic: string;
}

export interface MappedAi4tError {
  description: string;
  includeHint: boolean;
  settingsHref?: string;
}

export function mapCoTrainerEdgeError(
  raw: string,
  copy: Ai4tErrorCopy,
): MappedAi4tError {
  const lower = raw.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return { description: copy.rateLimit, includeHint: true };
  }

  if (
    lower.includes("plan") ||
    lower.includes("entitlement") ||
    lower.includes("feature trial") ||
    lower.includes("not included")
  ) {
    return { description: copy.planGate, includeHint: true, settingsHref: "/settings" };
  }

  if (
    lower.includes("api key") ||
    lower.includes("openai") ||
    lower.includes("not configured") ||
    lower.includes("llm")
  ) {
    return {
      description: copy.noApiKey,
      includeHint: true,
      settingsHref: "/settings",
    };
  }

  return { description: raw.trim() || copy.generic, includeHint: true };
}
