import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperatorPlatformUsersTab } from "@/components/operator/OperatorPlatformUsersTab";
import {
  OperatorControlCenterSettingsTab,
  OperatorDataSecurityTab,
} from "@/components/operator/OperatorSettingsTabs";
import {
  OperatorInternalBanner,
  OperatorPageHeader,
  OperatorPageShell,
} from "@/components/operator/OperatorPageShell";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { canManagePlatform, hasOperatorPermission } from "@/lib/operator-permissions";

export default function OperatorSettings() {
  const { t } = useLanguage();
  const s = t.operator.settingsPage;
  const { access, role } = useOperatorAccess();
  const canManagePlatformUsers = canManagePlatform(access) && role === "OWNER";
  const canViewSettings = hasOperatorPermission(access, "operator.settings.read");

  if (!canViewSettings) {
    return null;
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader icon={Settings} title={s.title} description={s.description} />

      <OperatorInternalBanner>{s.banner}</OperatorInternalBanner>

      <Tabs defaultValue="platform-users" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="platform-users">{s.tabs.platformUsers}</TabsTrigger>
          <TabsTrigger value="control-center">{s.tabs.controlCenter}</TabsTrigger>
          <TabsTrigger value="data-security">{s.tabs.dataSecurity}</TabsTrigger>
        </TabsList>

        <TabsContent value="platform-users" className="mt-5">
          <OperatorPlatformUsersTab canManage={canManagePlatformUsers} />
        </TabsContent>
        <TabsContent value="control-center" className="mt-5">
          <OperatorControlCenterSettingsTab canEdit={role === "OWNER"} />
        </TabsContent>
        <TabsContent value="data-security" className="mt-5">
          <OperatorDataSecurityTab canEdit={role === "OWNER"} />
        </TabsContent>
      </Tabs>
    </OperatorPageShell>
  );
}
