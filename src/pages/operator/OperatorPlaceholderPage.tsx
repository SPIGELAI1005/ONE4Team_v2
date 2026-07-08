import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OperatorComingSoonAction,
  OperatorInternalBanner,
  OperatorPageHeader,
  OperatorPageShell,
  OperatorPlaceholderBadge,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";

interface OperatorPlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
  plannedItems: string[];
}

export function OperatorPlaceholderPage({
  title,
  description,
  icon: Icon,
  statusLabel = "Placeholder",
  emptyTitle,
  emptyDescription,
  plannedItems,
}: OperatorPlaceholderPageProps) {
  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Icon}
        title={title}
        description={description}
        badge={<OperatorPlaceholderBadge label={statusLabel} />}
        actions={<OperatorComingSoonAction />}
      />

      <OperatorInternalBanner>
        This section is reserved for future Control Center capabilities. Sensitive settings will require OWNER-only,
        audited mutations when implemented.
      </OperatorInternalBanner>

      <Tabs defaultValue="empty-state" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="empty-state">Overview</TabsTrigger>
          <TabsTrigger value="planned">Planned scope</TabsTrigger>
        </TabsList>
        <TabsContent value="empty-state">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardContent className="p-6">
              <OperatorSectionEmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="planned">
          <Card className={OPERATOR_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="font-display text-lg">Planned capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plannedItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </OperatorPageShell>
  );
}
