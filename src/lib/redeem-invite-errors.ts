import { isErrorWithMessage } from "@/types/dashboard";

export interface RedeemInviteErrorLabels {
  unknown: string;
  notAuthenticated: string;
  invalidToken: string;
  notFound: string;
  alreadyUsed: string;
  expired: string;
  emailMismatch: string;
  serverMisconfigured: string;
}

function rawErrorMessage(err: unknown): string {
  if (isErrorWithMessage(err)) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

export function getRedeemInviteErrorMessage(err: unknown, labels: RedeemInviteErrorLabels): string {
  const raw = rawErrorMessage(err);
  const normalized = raw.toLowerCase();

  if (normalized.includes("not authenticated")) return labels.notAuthenticated;
  if (normalized.includes("invalid token")) return labels.invalidToken;
  if (normalized.includes("invite not found") || normalized.includes("not found")) return labels.notFound;
  if (normalized.includes("already used")) return labels.alreadyUsed;
  if (normalized.includes("expired")) return labels.expired;
  if (normalized.includes("email mismatch")) return labels.emailMismatch;
  if (normalized.includes("digest") && normalized.includes("does not exist")) {
    return labels.serverMisconfigured;
  }

  return raw.trim() || labels.unknown;
}
