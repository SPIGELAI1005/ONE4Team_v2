/** Club modal tab strip - shared by AI 4 T and Messages hub. */
export const ai4tMainTabListClass =
  "grid h-10 w-full min-w-0 rounded-xl border-0 bg-neutral-100 p-1 shadow-none";

export const ai4tMainTabTriggerClass =
  "inline-flex h-full w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors shadow-none " +
  "data-[state=inactive]:bg-neutral-200 data-[state=inactive]:text-neutral-600 " +
  "data-[state=inactive]:hover:bg-neutral-300 " +
  "data-[state=active]:bg-[#e31e24] data-[state=active]:text-white " +
  "data-[state=active]:hover:bg-[#c9191f]";

/** Dashboard /co-trainer - respects light & dark theme. */
export const ai4tDashboardTabListClass =
  "w-full grid grid-cols-3 h-11 rounded-xl p-1 bg-neutral-100/90 dark:bg-muted/30";

export const ai4tDashboardTabTriggerClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors shadow-none " +
  "data-[state=inactive]:bg-neutral-300 data-[state=inactive]:text-neutral-700 " +
  "data-[state=inactive]:hover:bg-neutral-400 " +
  "dark:data-[state=inactive]:bg-muted/80 dark:data-[state=inactive]:text-muted-foreground " +
  "dark:data-[state=inactive]:hover:bg-muted " +
  "data-[state=active]:bg-[#e31e24] data-[state=active]:text-white " +
  "data-[state=active]:hover:bg-[#c9191f]";
