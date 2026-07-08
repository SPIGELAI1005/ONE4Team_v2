import { useQuery } from "@tanstack/react-query";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  buildOperatorAccess,
  type OperatorAccess,
  type OperatorPermission,
} from "@/lib/operator-permissions";

interface OperatorAccessOptions {
  requiredPermission?: OperatorPermission;
}

const EMPTY_OPERATOR_ACCESS: OperatorAccess = {
  isOperator: false,
  role: null,
  permissions: [],
  email: null,
  displayName: null,
  status: null,
};

function shouldFallbackToExistingRpc(message: string | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the function") ||
    normalized.includes("function public.get_current_platform_user") ||
    normalized.includes("schema cache")
  );
}

async function fetchOperatorAccess(): Promise<OperatorAccess> {
  const accessResult = await supabaseDynamic.rpc("get_current_platform_user");

  if (!accessResult.error) return buildOperatorAccess(accessResult.data);

  if (!shouldFallbackToExistingRpc(accessResult.error.message)) {
    throw new Error(accessResult.error.message ?? "Unable to verify operator access.");
  }

  const existingResult = await supabaseDynamic.rpc("get_platform_operator_access");
  if (existingResult.error) {
    throw new Error(existingResult.error.message ?? "Unable to verify operator access.");
  }

  return buildOperatorAccess(existingResult.data);
}

export function useOperatorAccess(options: OperatorAccessOptions = {}) {
  const query = useQuery({
    queryKey: ["operator-access"],
    queryFn: fetchOperatorAccess,
    staleTime: 60_000,
    retry: 1,
  });

  const access = query.data ?? EMPTY_OPERATOR_ACCESS;
  const hasRequiredPermission = options.requiredPermission
    ? access.permissions.includes(options.requiredPermission)
    : true;

  return {
    ...query,
    access,
    isOperator: access.isOperator,
    role: access.role,
    permissions: access.permissions,
    hasRequiredPermission,
    isAllowed: access.isOperator && hasRequiredPermission,
  };
}
