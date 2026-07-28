/** Club registry profile photo validity (2 years from upload). */

export const PHOTO_VALIDITY_YEARS = 2;

export function photoValidUntil(
  photoUploadedAt: string | Date | null | undefined,
): Date | null {
  if (!photoUploadedAt) return null;
  const uploaded =
    photoUploadedAt instanceof Date ? photoUploadedAt : new Date(photoUploadedAt);
  if (Number.isNaN(uploaded.getTime())) return null;
  const until = new Date(uploaded.getTime());
  until.setFullYear(until.getFullYear() + PHOTO_VALIDITY_YEARS);
  return until;
}

export function isPhotoExpired(
  photoUploadedAt: string | Date | null | undefined,
  asOf: Date = new Date(),
): boolean {
  const until = photoValidUntil(photoUploadedAt);
  if (!until) return false;
  return until.getTime() <= asOf.getTime();
}

/** Days until expiry; negative when already expired. Null when unknown. */
export function daysUntilPhotoExpiry(
  photoUploadedAt: string | Date | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const until = photoValidUntil(photoUploadedAt);
  if (!until) return null;
  const ms = until.getTime() - asOf.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function shouldShowPhotoRenewalHint(
  photoUrl: string | null | undefined,
  photoUploadedAt: string | Date | null | undefined,
  asOf: Date = new Date(),
): boolean {
  if (!photoUrl?.trim()) return false;
  return isPhotoExpired(photoUploadedAt, asOf);
}
