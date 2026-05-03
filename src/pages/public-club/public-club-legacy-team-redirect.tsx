import { Navigate, useLocation, useParams } from "react-router-dom";

/** Old public URLs used `/club/:slug/team/:id`; canonical path is `/club/:slug/teams/:id`. */
export default function PublicClubLegacyTeamRedirect() {
  const { clubSlug, teamId } = useParams();
  const { search } = useLocation();
  if (!clubSlug || !teamId) return <Navigate to="/" replace />;
  return <Navigate to={`/club/${clubSlug}/teams/${teamId}${search}`} replace />;
}
