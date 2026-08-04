interface MyMemberDataErrorLabels {
  loadFailedGeneric: string;
  loadFailedNotAuthenticated: string;
  loadFailedNotAuthorized: string;
  loadFailedServer: string;
  loadFailedMigration: string;
}

interface MyMemberDataSaveErrorLabels {
  saveFailedGeneric: string;
  saveFailedNoEditableFields: string;
  saveFailedNotAuthorized: string;
}

/** Map Supabase/Postgres RPC errors to member-friendly copy for /my-data. */
export function resolveMyMemberDataLoadError(
  message: string,
  labels: MyMemberDataErrorLabels,
): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("not authenticated")) {
    return labels.loadFailedNotAuthenticated;
  }
  if (normalized.includes("not authorized")) {
    return labels.loadFailedNotAuthorized;
  }
  if (
    normalized.includes("structure of query does not match function result type") ||
    normalized.includes("does not exist") ||
    normalized.includes("could not find the function")
  ) {
    return labels.loadFailedMigration;
  }
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("timeout")
  ) {
    return labels.loadFailedGeneric;
  }

  return labels.loadFailedServer;
}

/** Map save RPC errors to member-friendly copy for /my-data. */
export function resolveMyMemberDataSaveError(
  message: string,
  labels: MyMemberDataSaveErrorLabels,
): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("no_editable_fields")) {
    return labels.saveFailedNoEditableFields;
  }
  if (normalized.includes("not authorized") || normalized.includes("not_authenticated")) {
    return labels.saveFailedNotAuthorized;
  }

  return labels.saveFailedGeneric;
}
