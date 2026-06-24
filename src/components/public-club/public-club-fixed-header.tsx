import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pins club chrome to the viewport. Uses a spacer so page content is not hidden under the header.
 * (Sticky/fixed break inside Framer Motion `PageTransition` ancestors that apply `transform`.)
 */
export function PublicClubFixedHeader({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const syncHeight = () => setHeaderHeight(node.offsetHeight);
    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  return (
    <>
      <div ref={headerRef} className="fixed inset-x-0 top-0 z-50">
        {children}
      </div>
      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />
    </>
  );
}
