import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperatorCommercialOffersTab } from "@/components/operator/OperatorCommercialOffersTab";
import { OperatorPlanMatrixTab } from "@/components/operator/OperatorPlanMatrixTab";
import { OperatorPlatformModulesTab } from "@/components/operator/OperatorPlatformModulesTab";
import { OperatorPlatformPlansTab } from "@/components/operator/OperatorPlatformPlansTab";
import {
  OperatorInternalBanner,
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
} from "@/components/operator/OperatorPageShell";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { usePlatformCatalog } from "@/hooks/use-platform-catalog";
import { hasOperatorPermission } from "@/lib/operator-permissions";

export default function OperatorModules() {
  const { t } = useLanguage();
  const m = t.operator.modules;
  const { access, role } = useOperatorAccess();
  const { modules, plans, matrix, isLoading, isError, error } = usePlatformCatalog();

  const isOwner = role === "OWNER";
  const canManagePlans = hasOperatorPermission(access, "operator.plans.manage");
  const canEditCatalog = isOwner;

  if (isError) {
    return (
      <OperatorPageError
        title={m.loadErrorTitle}
        message={error instanceof Error ? error.message : m.loadErrorMessage}
      />
    );
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader icon={CreditCard} title={m.title} description={m.description} />

      <OperatorInternalBanner>{m.banner}</OperatorInternalBanner>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="modules">{m.tabs.modules}</TabsTrigger>
            <TabsTrigger value="plans">{m.tabs.plans}</TabsTrigger>
            <TabsTrigger value="matrix">{m.tabs.matrix}</TabsTrigger>
            <TabsTrigger value="offers">{m.tabs.offers ?? "Offers"}</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-5">
            <OperatorPlatformModulesTab modules={modules} isLoading={isLoading} canEdit={canEditCatalog} />
          </TabsContent>
          <TabsContent value="plans" className="mt-5">
            <OperatorPlatformPlansTab plans={plans} isLoading={isLoading} canEdit={canEditCatalog} />
          </TabsContent>
          <TabsContent value="matrix" className="mt-5">
            <OperatorPlanMatrixTab matrix={matrix} isLoading={isLoading} canEdit={canManagePlans} />
          </TabsContent>
          <TabsContent value="offers" className="mt-5">
            <OperatorCommercialOffersTab canManage={canManagePlans} />
          </TabsContent>
        </Tabs>
      )}
    </OperatorPageShell>
  );
}
