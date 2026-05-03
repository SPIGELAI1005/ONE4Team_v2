import type { ClubPublicPageConfig } from "@/lib/club-public-page-config";
import {
  DEFAULT_PRIVACY,
  effectivePrivacyPack,
  normalizePrivacy,
  type PrivacyPack,
} from "@/lib/club-page-settings-helpers";

/** Visitor-side flags derived from published (or draft) config after youth / safety rules. */
export interface PublicMicrositePrivacy {
  showMemberCountOnHome: boolean;
  showCoachNamesPublic: boolean;
  showCoachContactPublic: boolean;
  showTrainingLocationsPublic: boolean;
  showTrainingTimesPublic: boolean;
  showMatchResultsPublic: boolean;
  showPlayerStatsPublic: boolean;
  showPlayerNamesPublic: boolean;
  showDocumentsPublic: boolean;
  showContactPersonsPublic: boolean;
  allowJoinRequestsPublic: boolean;
  youthProtectionMode: boolean;
  youthHidePublicPlayerImages: boolean;
}

export function publicMicrositePrivacyFromConfig(cfg: ClubPublicPageConfig | null): PublicMicrositePrivacy {
  const privacyNormalized = cfg?.privacy
    ? normalizePrivacy(cfg.privacy, cfg.visibilityRules ?? {})
    : normalizePrivacy(null, cfg?.visibilityRules ?? {});
  const p = effectivePrivacyPack(privacyNormalized);
  return {
    showMemberCountOnHome: p.show_member_count_on_public_home,
    showCoachNamesPublic: p.show_coach_names_public,
    showCoachContactPublic: p.show_coach_contact_public,
    showTrainingLocationsPublic: p.show_training_locations_public,
    showTrainingTimesPublic: p.show_team_training_times_public,
    showMatchResultsPublic: p.show_match_results_public,
    showPlayerStatsPublic: p.show_player_stats_public,
    showPlayerNamesPublic: p.show_player_names_public,
    showDocumentsPublic: p.show_documents_public,
    showContactPersonsPublic: p.show_contact_persons_public,
    allowJoinRequestsPublic: p.allow_join_requests_public,
    youthProtectionMode: p.youth_protection_mode,
    youthHidePublicPlayerImages: p.youth_protection_mode,
  };
}

export function redactMatchScoresForPrivacy<T extends { home_score?: number | null; away_score?: number | null }>(
  row: T,
  showMatchResults: boolean
): T {
  if (showMatchResults) return row;
  return { ...row, home_score: null, away_score: null };
}

export function redactSessionLocationForPrivacy<T extends { location?: string | null }>(
  row: T,
  showLocations: boolean
): T {
  if (showLocations) return row;
  return { ...row, location: null };
}

export function redactSessionTimesForPrivacy<T extends { starts_at: string; ends_at?: string | null }>(
  row: T,
  showTimes: boolean
): T {
  if (showTimes) return row;
  const d = new Date(row.starts_at);
  if (Number.isNaN(d.getTime())) return row;
  const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  return { ...row, starts_at: dayOnly.toISOString(), ends_at: null };
}

export function redactEventForPrivacy<T extends { starts_at: string; ends_at?: string | null; location?: string | null }>(
  row: T,
  showLocations: boolean,
  showTimes: boolean
): T {
  let x: T = { ...row };
  if (!showLocations) x = { ...x, location: null };
  if (!showTimes) {
    const d = new Date(x.starts_at);
    if (!Number.isNaN(d.getTime())) {
      const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
      x = { ...x, starts_at: dayOnly.toISOString(), ends_at: null };
    }
  }
  return x;
}
