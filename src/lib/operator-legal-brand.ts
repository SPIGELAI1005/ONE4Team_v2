import one4teamLogoUrl from "@/assets/one4team-logo.png";

export const DEFAULT_ONE4TEAM_LOGO_SRC = one4teamLogoUrl;

export const LEGAL_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export interface LegalBrandingAssets {
  providerLogoDataUrl: string | null;
  counterpartyLogoDataUrl: string | null;
}

export async function loadImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Failed to load image");
  const blob = await response.blob();
  return readBlobAsDataUrl(blob);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
    return Promise.reject(new Error("INVALID_IMAGE_TYPE"));
  }
  if (file.size > LEGAL_LOGO_MAX_BYTES) {
    return Promise.reject(new Error("IMAGE_TOO_LARGE"));
  }
  return readBlobAsDataUrl(file);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export function imageDataUrlFormat(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.includes("image/png")) return "PNG";
  return "JPEG";
}
