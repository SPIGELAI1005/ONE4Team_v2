import { isTsvAllach09Club } from "@/lib/is-tsv-allach-club";
import type { PublicClubRecord } from "@/lib/public-club-models";

/** Sportanlage TSV Allach 09 only — not used for any other ONE4Team club. */
export const TSV_ALLACH_CLUB_ADDRESS = "Enterstraße 55, 80999 München";

/** WGS84 for Enterstraße 55 (Sportanlage TSV Allach 09). */
export const TSV_ALLACH_CLUB_LATITUDE = 48.2067894;
export const TSV_ALLACH_CLUB_LONGITUDE = 11.4487366;

/** Fills missing contact fields only for slug `tsv-allach-09`. */
export function applyTsvAllachClubContactDefaults(club: PublicClubRecord): PublicClubRecord {
  if (!isTsvAllach09Club(club)) return club;
  return {
    ...club,
    address: club.address?.trim() || TSV_ALLACH_CLUB_ADDRESS,
    latitude: club.latitude ?? TSV_ALLACH_CLUB_LATITUDE,
    longitude: club.longitude ?? TSV_ALLACH_CLUB_LONGITUDE,
  };
}
