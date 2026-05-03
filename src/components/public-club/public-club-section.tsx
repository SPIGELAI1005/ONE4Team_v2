import type { ReactNode } from "react";

const container =
  "w-full max-w-lg sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 text-center md:text-left";

interface PublicClubSectionProps {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PublicClubSection({ id, title, subtitle, children, className = "" }: PublicClubSectionProps) {
  return (
    <section id={id} className={`py-10 sm:py-14 border-t border-[color:var(--club-border)]/80 ${className}`}>
      <div className={container}>
        {title ? (
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[color:var(--club-foreground)] mb-2 sm:mb-4">
            {title}
          </h2>
        ) : null}
        {subtitle ? <div className="text-sm text-[color:var(--club-muted)] max-w-2xl mx-auto md:mx-0 mb-6">{subtitle}</div> : null}
        {children}
      </div>
    </section>
  );
}

export { container as publicClubSectionContainer };
