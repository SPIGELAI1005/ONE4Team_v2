/**
 * Layout primitives for routes rendered inside `DashboardLayout` (sidebar + main + mobile bottom nav).
 * Aligns with `DashboardContent` (`/dashboard/:role`): prevents horizontal overflow, clears bottom nav, caps content width.
 */
export const DASHBOARD_PAGE_ROOT =
  "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 scroll-glow";

/** Horizontal padding + max width; add your own `py-*` or use `DASHBOARD_PAGE_INNER`. */
export const DASHBOARD_PAGE_MAX_INNER =
  "mx-auto w-full min-w-0 max-w-[min(100%,92rem)] px-4 sm:px-5 lg:px-8";

export const DASHBOARD_PAGE_INNER = `${DASHBOARD_PAGE_MAX_INNER} py-4 sm:py-6`;

export const DASHBOARD_PAGE_INNER_SM = `${DASHBOARD_PAGE_MAX_INNER} py-3`;

export const DASHBOARD_TABS_ROW = "w-full min-w-0 border-b border-border";

/** Underlined tab strip: scrolls horizontally on small screens without widening the page */
export const DASHBOARD_TABS_INNER_SCROLL =
  "mx-auto flex min-w-0 max-w-[min(100%,92rem)] gap-1 overflow-x-auto px-4 sm:px-5 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
