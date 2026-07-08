import {
  BadgeCheck,
  Boxes,
  FileSignature,
  Handshake,
  Receipt,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import {
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorMarketplace } from "@/hooks/use-operator-marketplace";
import { formatLabel, type OperatorMarketplaceCount } from "@/lib/operator-marketplace";
import { formatEur } from "@/lib/operator-financials";
import { formatOverviewTimestamp } from "@/lib/operator-formatters";
import type { Translations } from "@/i18n";

function formatProviderTypeLocalized(value: string | null | undefined, t: Translations): string {
  if (!value) return "—";
  const labels = t.operator.marketplace.providerTypes;
  return labels[value as keyof typeof labels] ?? formatLabel(value);
}

function DistributionCard({
  title,
  rows,
  isLoading,
  labelFormatter,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  rows: OperatorMarketplaceCount[];
  isLoading: boolean;
  labelFormatter?: (value: string) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0);
  const formatLabelFn = labelFormatter ?? formatLabel;

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <OperatorSectionEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">{formatLabelFn(row.key)}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{row.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${max > 0 ? Math.max(4, (row.count / max) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OperatorMarketplace() {
  const { t } = useLanguage();
  const m = t.operator.marketplace;
  const shell = t.operator.shell;
  const empty = m.empty;

  const { data, isLoading, isError, error, refetch, isFetching } = useOperatorMarketplace();

  const formatProviderType = (value: string | null | undefined) => formatProviderTypeLocalized(value, t);

  if (isError) {
    return (
      <OperatorPageError
        title={m.loadErrorTitle}
        message={error instanceof Error ? error.message : m.loadErrorMessage}
      />
    );
  }

  const providers = data?.providers;
  const requests = data?.requests;
  const offers = data?.offers;
  const partners = data?.partners;
  const contracts = data?.contracts;
  const invoices = data?.invoices;
  const engagements = data?.engagements;

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={Store}
        title={m.title}
        description={m.description}
        meta={
          isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {shell.updated} {formatOverviewTimestamp(data?.generated_at)}
            </span>
          )
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? shell.refreshing : shell.refresh}
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{m.providersSection}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard label={m.totalProviders} value={providers?.total} icon={Store} isLoading={isLoading} />
          <OperatorMetricCard label={m.activeListings} value={providers?.active} icon={BadgeCheck} tone="success" isLoading={isLoading} />
          <OperatorMetricCard label={m.pendingReview} value={providers?.pending_review} icon={Store} tone={(providers?.pending_review ?? 0) > 0 ? "warning" : "default"} isLoading={isLoading} />
          <OperatorMetricCard
            label={m.verified}
            value={providers?.verified}
            hint={m.featured.replace("{count}", String(providers?.featured ?? 0))}
            icon={BadgeCheck}
            isLoading={isLoading}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <DistributionCard
            title={m.providersByType}
            rows={providers?.by_type ?? []}
            isLoading={isLoading}
            labelFormatter={formatProviderType}
            emptyTitle={empty.providersType.title}
            emptyDescription={empty.providersType.desc}
          />
          <DistributionCard
            title={m.providersByStatus}
            rows={providers?.by_status ?? []}
            isLoading={isLoading}
            emptyTitle={empty.providersStatus.title}
            emptyDescription={empty.providersStatus.desc}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{m.demandSection}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard
            label={m.requests}
            value={requests?.total}
            hint={m.openCount.replace("{count}", String(requests?.open ?? 0))}
            icon={Boxes}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.offers}
            value={offers?.total}
            hint={m.acceptedCount.replace("{count}", String(offers?.accepted ?? 0))}
            icon={Handshake}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.requestBudgetMax}
            value={formatEur(requests?.budget_max_total ?? 0)}
            hint={m.requestBudgetHint}
            icon={Tag}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.engagements}
            value={engagements?.total}
            hint={m.openEngagements.replace("{count}", String(engagements?.open ?? 0))}
            icon={Users}
            isLoading={isLoading}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <DistributionCard
            title={m.requestsByCategory}
            rows={requests?.by_category ?? []}
            isLoading={isLoading}
            emptyTitle={empty.requestsCategory.title}
            emptyDescription={empty.requestsCategory.desc}
          />
          <DistributionCard
            title={m.offersByStatus}
            rows={offers?.by_status ?? []}
            isLoading={isLoading}
            emptyTitle={empty.offersStatus.title}
            emptyDescription={empty.offersStatus.desc}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{m.engagementsSection}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard
            label={m.clubPartners}
            value={partners?.total}
            hint={m.clubsEngaged.replace("{count}", String(partners?.clubs_with_partners ?? 0))}
            icon={Handshake}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.fromMarketplace}
            value={partners?.marketplace_sourced}
            hint={m.fromMarketplaceHint}
            icon={Store}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.activeContracts}
            value={contracts?.active}
            hint={m.activeValue.replace("{amount}", formatEur(contracts?.active_value_eur ?? 0))}
            icon={FileSignature}
            tone="success"
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={m.invoicedOutstanding}
            value={formatEur(invoices?.outstanding_value_eur ?? 0)}
            hint={m.overduePaid
              .replace("{overdue}", String(invoices?.overdue_count ?? 0))
              .replace("{paid}", formatEur(invoices?.paid_value_eur ?? 0))}
            icon={Receipt}
            tone={(invoices?.overdue_count ?? 0) > 0 ? "warning" : "default"}
            isLoading={isLoading}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <DistributionCard
            title={m.partnersByType}
            rows={partners?.by_type ?? []}
            isLoading={isLoading}
            labelFormatter={formatProviderType}
            emptyTitle={empty.partnersType.title}
            emptyDescription={empty.partnersType.desc}
          />
          <DistributionCard
            title={m.engagementsByCategory}
            rows={engagements?.by_category ?? []}
            isLoading={isLoading}
            emptyTitle={empty.engagementsCategory.title}
            emptyDescription={empty.engagementsCategory.desc}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{m.topProviders}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.top_providers.length ?? 0) === 0 ? (
              <OperatorSectionEmptyState title={empty.topProviders.title} description={empty.topProviders.desc} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.provider}</TableHead>
                    <TableHead>{m.type}</TableHead>
                    <TableHead className="text-right">{m.clubs}</TableHead>
                    <TableHead className="text-right">{m.saved}</TableHead>
                    <TableHead className="text-right">{m.won}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.top_providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{provider.name}</div>
                        <div className="text-xs text-muted-foreground">{formatLabel(provider.listing_status)}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatProviderType(provider.provider_type)}</TableCell>
                      <TableCell className="text-right">{provider.clubs_reached}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{provider.saved_count}</TableCell>
                      <TableCell className="text-right">{provider.accepted_offers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{m.recentRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.recent_requests.length ?? 0) === 0 ? (
              <OperatorSectionEmptyState title={empty.recentRequests.title} description={empty.recentRequests.desc} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.request}</TableHead>
                    <TableHead>{m.club}</TableHead>
                    <TableHead>{m.status}</TableHead>
                    <TableHead className="text-right">{m.budget}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recent_requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{request.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.category ? formatLabel(request.category) : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{request.club_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatLabel(request.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {request.budget_max ? formatEur(request.budget_max) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {(data?.top_categories.length ?? 0) > 0 ? (
        <DistributionCard
          title={m.topCategories}
          rows={data?.top_categories ?? []}
          isLoading={isLoading}
          emptyTitle={empty.topCategories.title}
          emptyDescription={empty.topCategories.desc}
        />
      ) : null}
    </OperatorPageShell>
  );
}
