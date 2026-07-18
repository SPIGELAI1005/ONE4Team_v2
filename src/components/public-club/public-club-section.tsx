import type { ReactNode } from "react";

const container =
  "w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 text-left";

interface PublicClubSectionProps {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function PublicClubSection({
  id,
  title,
  subtitle,
  children,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
}: PublicClubSectionProps) {
  return (
    <section id={id} className={`py-10 sm:py-14 border-t border-[color:var(--club-border)]/80 ${className}`}>
      <div className={container}>
        {title ? (
          <h2
            className={`font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[color:var(--club-foreground)] mb-2 sm:mb-4 ${titleClassName}`}
          >
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <div
            className={`public-club-section-body text-sm text-[color:var(--club-muted)] max-w-2xl mb-8 leading-relaxed ${subtitleClassName}`}
          >
            {subtitle}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export { container as publicClubSectionContainer };
