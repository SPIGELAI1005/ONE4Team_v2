/**
 * Legacy entry: the public club experience is the multi-route microsite under
 * `PublicClubLayout` + `src/pages/public-club/*`. This re-export preserves any
 * deep imports of `./pages/ClubPage` without duplicating the home implementation.
 */
export { default } from "./public-club/public-club-home-page";
