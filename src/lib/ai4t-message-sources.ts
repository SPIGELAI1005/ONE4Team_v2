/** Split assistant reply body from trailing **Sources:** citations block. */
export function splitAssistantMessageSources(content: string): {
  body: string;
  sources: string[];
} {
  const trimmed = content.trimEnd();
  const match = trimmed.match(/\n\*\*Sources:\*\*\s*([\s\S]+)$/i) ?? trimmed.match(/\nSources:\s*([\s\S]+)$/i);
  if (!match) {
    return { body: content, sources: [] };
  }
  const body = trimmed.slice(0, match.index).trimEnd();
  const sources = match[1]
    .split(/[;\n]/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  return { body, sources };
}
