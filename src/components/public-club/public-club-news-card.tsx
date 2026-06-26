import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Newspaper } from "lucide-react";
import type { NewsRowLite } from "@/lib/public-club-models";
import { publicNewsExcerpt } from "@/lib/public-club-news";
import { clubGlassInteractiveClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

/** A4 portrait ratio for poster thumbnails on wide news cards. */
export const PUBLIC_CLUB_NEWS_POSTER_ASPECT = "aspect-[210/297]";

export function PublicClubNewsPoster({
  imageUrl,
  title,
  className,
  fillHeight = false,
}: {
  imageUrl?: string | null;
  title: string;
  className?: string;
  /** Stretch poster to match card height (compact grid cards). */
  fillHeight?: boolean;
}) {
  if (imageUrl?.trim()) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[color:var(--club-card)]",
          fillHeight ? "h-full min-h-[100px]" : PUBLIC_CLUB_NEWS_POSTER_ASPECT,
          className
        )}
      >
        <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-[color:var(--club-primary)]/20 via-[color:var(--club-card)] to-[color:var(--club-border)]/40 p-2 text-center",
        fillHeight ? "h-full min-h-[100px]" : PUBLIC_CLUB_NEWS_POSTER_ASPECT,
        className
      )}
      aria-hidden
    >
      <span className="line-clamp-4 font-display text-[9px] font-semibold leading-snug text-[color:var(--club-foreground)]/70 sm:text-[10px]">
        {title}
      </span>
    </div>
  );
}

export type PublicClubNewsCardVariant = "compact" | "wide";

export interface PublicClubNewsCardProps {
  item: NewsRowLite;
  href: string;
  locale: string;
  categoryLabel: string;
  readMoreLabel: string;
  className?: string;
  /** `compact` = original grid tile size with left text / right poster split. */
  variant?: PublicClubNewsCardVariant;
}

/** News card: title + short text left, A4 poster right; entire card links to the article. */
export function PublicClubNewsCard({
  item,
  href,
  locale,
  categoryLabel,
  readMoreLabel,
  className,
  variant = "compact",
}: PublicClubNewsCardProps) {
  const isCompact = variant === "compact";

  return (
    <Link
      to={href}
      className={cn(
        clubGlassInteractiveClass,
        "group flex h-full items-stretch overflow-hidden text-left no-underline hover:border-[color:var(--club-primary)]/40",
        isCompact ? "min-h-[132px]" : "min-h-[140px]",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isCompact ? "justify-between p-3 sm:p-3.5" : "justify-center p-4 sm:p-5"
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[color:var(--club-muted)]",
              isCompact ? "text-[9px]" : "text-[10px]"
            )}
          >
            <span className="inline-flex items-center gap-1 text-[color:var(--club-primary)]">
              <Newspaper className={isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {categoryLabel}
            </span>
            <span>{new Date(item.created_at).toLocaleDateString(locale)}</span>
          </div>
          <h3
            className={cn(
              "font-display font-semibold leading-snug text-[color:var(--club-foreground)] transition-colors group-hover:text-[color:var(--club-primary)]",
              isCompact ? "line-clamp-2 text-sm" : "text-base sm:text-lg"
            )}
          >
            {item.title}
          </h3>
          <p
            className={cn(
              "mt-1 leading-relaxed text-[color:var(--club-muted)]",
              isCompact ? "line-clamp-2 text-xs" : "line-clamp-3 text-sm"
            )}
          >
            {publicNewsExcerpt(item)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold text-[color:var(--club-primary)]",
            isCompact ? "mt-2 text-[10px]" : "mt-3 text-xs"
          )}
        >
          {readMoreLabel}
          <ArrowRight className={cn("transition-transform group-hover:translate-x-0.5", isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />
        </span>
      </div>
      <PublicClubNewsPoster
        imageUrl={item.image_url}
        title={item.title}
        fillHeight={isCompact}
        className={cn(
          "border-l border-[color:var(--club-border)]",
          isCompact
            ? "w-[36%] min-w-[72px] max-w-[108px] sm:max-w-[118px]"
            : cn("w-[30%] min-w-[88px] max-w-[168px] sm:min-w-[104px] sm:max-w-[200px]", PUBLIC_CLUB_NEWS_POSTER_ASPECT)
        )}
      />
    </Link>
  );
}
