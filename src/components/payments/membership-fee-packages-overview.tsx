import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import {
  buildAnnualMemberSummary,
  feePackageDisplayAmount,
  formatPackageMoney,
  intervalLabel,
  parsePriceComponents,
  sortFeePackages,
  type MembershipFeePackage,
} from "@/lib/membership-fee-packages";

interface MembershipFeePackagesOverviewProps {
  packages: MembershipFeePackage[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (pkg: MembershipFeePackage) => void;
}

export function MembershipFeePackagesOverview({
  packages,
  canEdit,
  onAdd,
  onEdit,
}: MembershipFeePackagesOverviewProps) {
  const { t, language } = useLanguage();
  const sorted = sortFeePackages(packages);
  const activePackages = sorted.filter((pkg) => pkg.is_active !== false);

  const intervalLabels = {
    monthly: t.payments.intervalPerMonth,
    quarterly: t.payments.intervalPerQuarter,
    yearly: t.payments.intervalPerYear,
    oneTime: t.payments.intervalOneTime,
    unknown: t.common.unknown ?? "—",
  };

  const annualSummary = buildAnnualMemberSummary(activePackages, {
    youth: t.payments.memberCategoryYouth,
    adult: t.payments.memberCategoryAdult,
    senior: t.payments.memberCategorySenior,
  });

  const defaultCurrency = activePackages[0]?.currency || "EUR";

  if (packages.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground text-center">{t.payments.feeTypesHint}</p>
        <div className="rounded-xl bg-card border border-border p-10 text-center space-y-4">
          <p className="text-muted-foreground text-sm">{t.payments.noFeeTypesConfigured}</p>
          {canEdit && (
            <Button
              className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              onClick={onAdd}
            >
              <Plus className="w-4 h-4 mr-1" /> {t.payments.addFirstPackage}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t.payments.feeTypesHint}</p>
        {canEdit && (
          <Button
            size="sm"
            className="bg-gradient-gold-static text-primary-foreground hover:brightness-110 shrink-0"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4 mr-1" /> {t.payments.addFeeType}
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-display font-semibold text-foreground">{t.payments.packagesOverviewTitle}</h3>
        <div className="rounded-xl border border-border overflow-x-auto bg-card">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t.payments.packageColumn}</th>
                <th className="px-4 py-3 font-medium text-right">{t.payments.amountColumn}</th>
                <th className="px-4 py-3 font-medium">{t.payments.typeColumn}</th>
                <th className="px-4 py-3 font-medium">{t.payments.notesColumn}</th>
                {canEdit && <th className="px-4 py-3 w-12" />}
              </tr>
            </thead>
            <tbody>
              {activePackages.map((pkg) => {
                const components = parsePriceComponents(pkg.price_components);
                const amountLabel =
                  components.length > 1
                    ? `${feePackageDisplayAmount(pkg, language)} (${components.length} ${t.payments.componentsShort})`
                    : feePackageDisplayAmount(pkg, language);
                return (
                  <tr key={pkg.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-primary whitespace-nowrap">
                      {amountLabel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {intervalLabel(pkg.interval, intervalLabels)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs">
                      {pkg.description?.trim() || "—"}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pkg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {annualSummary.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">{t.payments.annualSummaryTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t.payments.annualSummaryHint}</p>
          </div>
          <div className="rounded-xl border border-border overflow-x-auto bg-card">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t.payments.memberCategory}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.payments.annualMembershipColumn}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.payments.annualLevyColumn}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.payments.totalPerYearColumn}</th>
                </tr>
              </thead>
              <tbody>
                {annualSummary.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.membershipTotal > 0
                        ? formatPackageMoney(row.membershipTotal, defaultCurrency, language)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.levyTotal > 0
                        ? formatPackageMoney(row.levyTotal, defaultCurrency, language)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold text-primary">
                      {formatPackageMoney(row.grandTotal, defaultCurrency, language)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">/ {t.payments.perYearShort}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
