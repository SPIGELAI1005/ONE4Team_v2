export interface SupabaseErrorLike {
  message: string;
}

export function isErrorWithMessage(err: unknown): err is SupabaseErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  );
}
