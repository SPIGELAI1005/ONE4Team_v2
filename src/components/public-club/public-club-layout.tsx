import { Outlet } from "react-router-dom";
import { Loader2, ShieldQuestion } from "lucide-react";
import { PublicClubProvider, usePublicClub } from "@/contexts/public-club-context";
import { PublicClubRouteSeoProvider } from "@/contexts/public-club-route-seo-context";
import { ClubThemeProvider } from "@/components/public-club/club-theme-provider";
import { PublicClubDocumentHead } from "@/components/public-club/public-club-document-head";
import { PublicClubNavbar } from "@/components/public-club/public-club-navbar";
import { PublicClubFooter } from "@/components/public-club/public-club-footer";
import { PublicClubInviteModal } from "@/components/public-club/public-club-invite-modal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

function PublicClubLayoutInner() {
  const { t } = useLanguage();
  const { loading, club, isPreviewMode, isDraftPreviewMode, draftPreviewBlocked } = usePublicClub();

  return (
    <PublicClubRouteSeoProvider>
      <PublicClubDocumentHead />
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !club ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldQuestion className="h-5 w-5" />
            <span>{t.clubPage.clubPageNotAvailable}</span>
          </div>
          <p className="max-w-md text-center text-sm text-muted-foreground">{t.clubPage.clubPageNotAvailableDesc}</p>
          <Button asChild variant="outline">
            <Link to="/">{t.clubPage.goHome}</Link>
          </Button>
        </div>
      ) : (
        <ClubThemeProvider club={club}>
          <div className="flex min-h-screen flex-col">
            {isPreviewMode ? (
              <div className="border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:text-amber-100">
                {t.clubPage.previewMode} · {t.clubPage.previewModeDesc}
              </div>
            ) : null}
            {isDraftPreviewMode ? (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:text-amber-100">
                {draftPreviewBlocked
                  ? `${t.clubPage.draftPreviewBlocked} · ${t.clubPage.draftPreviewBlockedDesc}`
                  : `${t.clubPage.draftPreviewMode} · ${t.clubPage.draftPreviewModeDesc}`}
              </div>
            ) : null}
            <PublicClubNavbar />
            <main className="flex-1">
              <Outlet />
            </main>
            <PublicClubFooter club={club} />
            <PublicClubInviteModal />
          </div>
        </ClubThemeProvider>
      )}
    </PublicClubRouteSeoProvider>
  );
}

/** Wraps all `/club/:clubSlug/*` routes: loads club context, theme, chrome, and nested `<Outlet />`. */
export function PublicClubLayout() {
  return (
    <PublicClubProvider>
      <PublicClubLayoutInner />
    </PublicClubProvider>
  );
}

export default PublicClubLayout;
