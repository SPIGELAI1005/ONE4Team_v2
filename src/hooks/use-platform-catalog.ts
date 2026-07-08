import { useQuery } from "@tanstack/react-query";
import { getPlatformModules, getPlatformPlans } from "@/lib/platform-catalog";
import { getPlatformPlanMatrix } from "@/lib/platform-catalog-admin";

export function usePlatformCatalog() {
  const modulesQuery = useQuery({
    queryKey: ["platform-modules"],
    queryFn: getPlatformModules,
    staleTime: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ["platform-plans"],
    queryFn: getPlatformPlans,
    staleTime: 30_000,
  });

  const matrixQuery = useQuery({
    queryKey: ["platform-plan-matrix"],
    queryFn: getPlatformPlanMatrix,
    staleTime: 30_000,
  });

  return {
    modules: modulesQuery.data ?? [],
    plans: plansQuery.data ?? [],
    matrix: matrixQuery.data,
    isLoading: modulesQuery.isLoading || plansQuery.isLoading || matrixQuery.isLoading,
    isError: modulesQuery.isError || plansQuery.isError || matrixQuery.isError,
    error: modulesQuery.error ?? plansQuery.error ?? matrixQuery.error,
    refetchAll: async () => {
      await Promise.all([modulesQuery.refetch(), plansQuery.refetch(), matrixQuery.refetch()]);
    },
  };
}
