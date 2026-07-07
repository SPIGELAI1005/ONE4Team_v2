/**
 * Layout primitives for routes rendered inside `DashboardLayout` (sidebar + main + mobile bottom nav).
 * Mobile bottom clearance: `padding-bottom` on `.dashboard-scroll-area` in `DashboardLayout`.
 *
 * Mobile (`max-lg`, <1024px): slightly larger type, padding, and touch targets — iOS-like readability.
 * Desktop (`lg+`): unchanged from prior defaults.
 */
export const DASHBOARD_PAGE_ROOT =
  "flex min-w-0 w-full max-w-full flex-col lg:flex-1 lg:min-h-0 bg-background scroll-glow";

/** Horizontal padding + max width; add your own `py-*` or use `DASHBOARD_PAGE_INNER`. */
export const DASHBOARD_PAGE_MAX_INNER =
  "mx-auto w-full min-w-0 max-w-[min(100%,92rem)] px-4 max-lg:px-5 sm:px-5 lg:px-8";

export const DASHBOARD_PAGE_INNER = `${DASHBOARD_PAGE_MAX_INNER} py-5 max-lg:py-5 sm:py-6`;

export const DASHBOARD_PAGE_INNER_SM = `${DASHBOARD_PAGE_MAX_INNER} py-4 max-lg:py-4`;

/** Vertical rhythm between major page blocks */
export const DASHBOARD_PAGE_STACK = "flex min-h-0 flex-1 flex-col gap-5 max-lg:gap-6";

export const DASHBOARD_TABS_ROW = "w-full min-w-0 border-b border-border";

/** Underlined tab strip: scrolls horizontally on small screens without widening the page */
export const DASHBOARD_TABS_INNER_SCROLL =
  "mx-auto flex min-w-0 max-w-[min(100%,92rem)] gap-1 overflow-x-auto px-4 max-lg:px-5 sm:px-5 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Shared underline tab button (active/inactive classes appended in pages) */
export const DASHBOARD_TAB_BUTTON =
  "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 max-lg:py-3.5 text-sm max-lg:text-[15px] font-medium transition-colors touch-manipulation";

/** iOS-style segmented control (2–4 tabs; see Matches / Settings) */
export const DASHBOARD_IOS_SEGMENT = "ios-segment flex overflow-x-auto min-w-0";

export const DASHBOARD_IOS_SEGMENT_BUTTON =
  "flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all duration-200 touch-manipulation sm:px-3 max-lg:text-[13px] sm:text-[12px]";

/** Compact toolbar buttons in dashboard header slots */
export const DASHBOARD_TOOLBAR_BUTTON =
  "haptic-press shrink-0 rounded-xl text-xs sm:text-[12px] max-lg:min-h-[44px]";

/** Top-bar icon controls (bell, theme, language) — see `.dashboard-header-actions` in index.css */
export const DASHBOARD_HEADER_ICON_BUTTON = "dashboard-header-icon-btn";

export const DASHBOARD_HEADER_ICON = "dashboard-header-icon h-4 w-4 shrink-0";

/** Ghost + glass utility control (notification, language, theme) */
export const DASHBOARD_HEADER_UTILITY_BUTTON = `${DASHBOARD_HEADER_ICON_BUTTON} glass-card`;

/** Wrap column of header utility buttons (notification, language, theme, avatar) */
export const DASHBOARD_HEADER_ACTIONS = "dashboard-header-actions flex shrink-0 items-center gap-1.5 sm:gap-2";

/** Card surface — extra padding on phone */
export const DASHBOARD_CARD = "rounded-2xl glass-card p-4 max-lg:p-5 sm:p-5";

/** KPI / stat grid */
export const DASHBOARD_KPI_GRID = "grid grid-cols-2 lg:grid-cols-4 gap-3 max-lg:gap-4";

/** Typography tokens (import instead of ad-hoc text-[11px] on new work) */
export const DASHBOARD_TYPE_SECTION_TITLE =
  "font-display font-semibold text-foreground text-[15px] max-lg:text-base lg:text-lg";

export const DASHBOARD_TYPE_BODY = "text-sm max-lg:text-[15px] max-lg:leading-snug text-foreground";

export const DASHBOARD_TYPE_MUTED = "text-sm max-lg:text-[15px] max-lg:leading-snug text-muted-foreground";

export const DASHBOARD_TYPE_CAPTION = "text-xs max-lg:text-[13px] leading-snug text-muted-foreground";

export const DASHBOARD_TYPE_MICRO = "text-[11px] max-lg:text-xs leading-snug text-muted-foreground";

