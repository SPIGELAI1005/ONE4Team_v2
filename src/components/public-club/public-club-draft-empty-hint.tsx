import { usePublicClub } from "@/contexts/public-club-context";

/** Shown only in `?draft=1` when the viewer is an authenticated club admin. Never rendered for public visitors. */
export function PublicClubDraftEmptyHint({ children }: { children: React.ReactNode }) {
  const { showAdminDraftEmptyHints } = usePublicClub();
  if (!showAdminDraftEmptyHints) return null;
  return (
    <p className="mt-3 rounded-xl border border-amber-400/60 bg-white/95 px-3 py-2 text-left text-[12px] leading-snug text-slate-900 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-50/95">
      {children}
    </p>
  );
}
