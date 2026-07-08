import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";

interface OperatorChartCardProps {
  title: string;
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  hasData: boolean;
  children: ReactNode;
}

export function OperatorChartCard({
  title,
  isLoading,
  emptyTitle,
  emptyDescription,
  hasData,
  children,
}: OperatorChartCardProps) {
  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? <Skeleton className="h-56 w-full" /> : hasData ? children : <OperatorSectionEmptyState title={emptyTitle} description={emptyDescription} />}
      </CardContent>
    </Card>
  );
}

