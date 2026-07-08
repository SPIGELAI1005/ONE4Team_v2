import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  OperatorInternalBanner,
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import { formatOverviewTimestamp, operatorStatusBadgeVariant } from "@/lib/operator-formatters";
import type { OperatorClubListItem } from "@/lib/operator-club-detail";

function filterClubs(
  clubs: OperatorClubListItem[],
  status: string | null,
  billing: string | null,
): OperatorClubListItem[] {
  return clubs.filter((club) => {
    if (status && club.status.toUpperCase() !== status.toUpperCase()) return false;
    if (billing && (club.billing_status ?? "").toLowerCase() !== billing.toLowerCase()) return false;
    return true;
  });
}

export default function OperatorClubs() {
  const { t } = useLanguage();
  const c = t.operator.clubs;
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const billingFilter = searchParams.get("billing");
  const { data, isLoading, isError, error } = useOperatorClubs();

  const filteredClubs = useMemo(
    () => filterClubs(data ?? [], statusFilter, billingFilter),
    [billingFilter, data, statusFilter],
  );

  function clearFilters() {
    setSearchParams({});
  }

  if (isError) {
    return (
      <OperatorPageError
        title={c.loadErrorTitle}
        message={error instanceof Error ? error.message : c.loadErrorMessage}
      />
    );
  }

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Building2}
        title={c.title}
        description={c.description}
        badge={
          statusFilter || billingFilter ? (
            <Badge variant="secondary">
              {c.filtered.replace("{count}", String(filteredClubs.length))}
            </Badge>
          ) : undefined
        }
      />

      <OperatorInternalBanner>{c.banner}</OperatorInternalBanner>

      {(statusFilter || billingFilter) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">{c.activeFilters}</span>
          {statusFilter ? <Badge variant="outline">{c.statusFilter.replace("{value}", statusFilter)}</Badge> : null}
          {billingFilter ? <Badge variant="outline">{c.billingFilter.replace("{value}", billingFilter)}</Badge> : null}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            {c.clear}
          </Button>
        </div>
      )}

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="font-display text-lg">{c.allClubs}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : filteredClubs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{c.club}</TableHead>
                  <TableHead>{c.status}</TableHead>
                  <TableHead>{c.plan}</TableHead>
                  <TableHead>{c.billing}</TableHead>
                  <TableHead>{c.created}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell>
                      <Link to={`/operator/clubs/${club.id}`} className="font-medium text-primary hover:underline">
                        {club.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{club.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={operatorStatusBadgeVariant(club.status)}>{club.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{club.plan_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{club.billing_status ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOverviewTimestamp(club.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <OperatorSectionEmptyState icon={Building2} title={c.emptyTitle} description={c.emptyDesc} />
          )}
        </CardContent>
      </Card>
    </OperatorPageShell>
  );
}
