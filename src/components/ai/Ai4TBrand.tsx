import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Canonical product name string (plain text / i18n). */
export const AI_4_T_BRAND = "AI 4 T";

/** Collapsed or legacy spellings the model sometimes uses for the assistant name. */
const AI4T_ASSISTANT_NAME_ALIASES = /\bAI\s*4\s*Team\b|\bAI4Team\b|\bAI4team\b/gi;

/** Normalize assistant replies so the copilot name reads as AI 4 T. */
export function normalizeAi4tAssistantBrandText(text: string): string {
  return text.replace(AI4T_ASSISTANT_NAME_ALIASES, AI_4_T_BRAND);
}

const AI_4_T_DIGIT_CLASS = "ai-4-t-wordmark-digit";
const ONE_4_TEAM_DIGIT_CLASS = "one-4-team-wordmark-digit";

export function Ai4TBrand({ className }: { className?: string }) {
  return (
    <span className={cn("ai-4-t-wordmark", className)}>
      AI <span className={AI_4_T_DIGIT_CLASS}>4</span> T
    </span>
  );
}

export function Ai4TeamBrand({ className }: { className?: string }) {
  return (
    <span className={cn("ai-4-t-wordmark", className)}>
      AI <span className={AI_4_T_DIGIT_CLASS}>4</span> Team
    </span>
  );
}

export function One4TeamBrand({ className }: { className?: string }) {
  return (
    <span className={cn("ai-4-t-wordmark", className)}>
      ONE <span className={ONE_4_TEAM_DIGIT_CLASS}>4</span> Team
    </span>
  );
}

const AI4T_ONLY_REPLACEMENTS: ReadonlyArray<{ token: string; render: (key: string) => ReactNode }> = [
  { token: "AI 4 Team", render: (key) => <Ai4TeamBrand key={key} /> },
  { token: AI_4_T_BRAND, render: (key) => <Ai4TBrand key={key} /> },
  { token: "AI4Team", render: (key) => <Ai4TBrand key={key} /> },
];

const BRAND_REPLACEMENTS: ReadonlyArray<{ token: string; render: (key: string) => ReactNode }> = [
  ...AI4T_ONLY_REPLACEMENTS,
  { token: "ONE 4 Team", render: (key) => <One4TeamBrand key={key} /> },
  { token: "ONE4Team", render: (key) => <One4TeamBrand key={key} /> },
];

function getBrandReplacements(ai4tOnly?: boolean) {
  return ai4tOnly ? AI4T_ONLY_REPLACEMENTS : BRAND_REPLACEMENTS;
}

export function textIncludesBrandToken(text: string, ai4tOnly?: boolean): boolean {
  return getBrandReplacements(ai4tOnly).some(({ token }) => text.includes(token));
}

export function withBrandedProductNames(
  text: string,
  keyPrefix = "brand",
  ai4tOnly?: boolean,
): ReactNode {
  const replacements = getBrandReplacements(ai4tOnly);
  if (!textIncludesBrandToken(text, ai4tOnly)) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let partIndex = 0;

  while (cursor < text.length) {
    let nextIndex = -1;
    let match: (typeof replacements)[number] | null = null;

    for (const candidate of replacements) {
      const idx = text.indexOf(candidate.token, cursor);
      if (idx === -1) continue;
      if (nextIndex === -1 || idx < nextIndex) {
        nextIndex = idx;
        match = candidate;
      }
    }

    if (!match || nextIndex === -1) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (nextIndex > cursor) {
      nodes.push(text.slice(cursor, nextIndex));
    }

    nodes.push(match.render(`${keyPrefix}-${partIndex}`));
    partIndex += 1;
    cursor = nextIndex + match.token.length;
  }

  return nodes.map((node, i) => (
    <Fragment key={`${keyPrefix}-frag-${i}`}>{node}</Fragment>
  ));
}

/** @deprecated Use {@link withBrandedProductNames}. */
export function withAi4TBrand(text: string, keyPrefix = "ai4t"): ReactNode {
  return withBrandedProductNames(text, keyPrefix);
}

export function BrandedText({
  text,
  className,
  /** When true, only "AI 4 T" gets the red digit; ONE4Team stays plain text. */
  ai4tOnly,
}: {
  text: string;
  className?: string;
  ai4tOnly?: boolean;
}) {
  if (!textIncludesBrandToken(text, ai4tOnly)) {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }
  return <span className={className}>{withBrandedProductNames(text, "brand", ai4tOnly)}</span>;
}
