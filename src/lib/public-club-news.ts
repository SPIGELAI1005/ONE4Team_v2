import type { NewsRowLite } from "@/lib/public-club-models";

export const PUBLIC_NEWS_CATEGORIES = ["club", "teams", "events", "youth", "seniors", "sponsors"] as const;

export type PublicNewsCategoryId = (typeof PUBLIC_NEWS_CATEGORIES)[number];

export function isPublicNewsCategoryId(value: string | null | undefined): value is PublicNewsCategoryId {
  return Boolean(value && (PUBLIC_NEWS_CATEGORIES as readonly string[]).includes(value));
}

export function normalizePublicNewsCategory(value: string | null | undefined): PublicNewsCategoryId {
  if (isPublicNewsCategoryId(value)) return value;
  return "club";
}

export function excerptFromNewsBody(content: string, maxLen = 160): string {
  const plain = content.replace(/\s+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export function publicNewsExcerpt(item: Pick<NewsRowLite, "excerpt" | "content">): string {
  const e = item.excerpt?.trim();
  if (e) return e.length > 280 ? `${e.slice(0, 277)}…` : e;
  return excerptFromNewsBody(item.content ?? "", 160);
}
