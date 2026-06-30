export type FeeInterval = "monthly" | "quarterly" | "yearly" | "one_time";
export type FeeKind = "membership" | "levy" | "joining" | "other";
export type MemberCategory = "youth" | "adult" | "senior" | "shared" | "none";

export interface PriceComponent {
  label: string;
  amount: number;
}

export interface MembershipFeePackage {
  id: string;
  club_id: string;
  name: string;
  amount: number;
  currency: string | null;
  interval: string | null;
  description: string | null;
  is_active: boolean | null;
  price_components?: unknown;
  member_category?: string | null;
  fee_kind?: string | null;
  sort_order?: number | null;
}

export interface AnnualMemberSummaryRow {
  key: MemberCategory;
  label: string;
  membershipTotal: number;
  levyTotal: number;
  grandTotal: number;
}

export function parsePriceComponents(raw: unknown): PriceComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const amount = Number(record.amount);
      if (!label || !Number.isFinite(amount) || amount < 0) return null;
      return { label, amount };
    })
    .filter((item): item is PriceComponent => item !== null);
}

export function sumPriceComponents(components: PriceComponent[]): number {
  return components.reduce((sum, row) => sum + row.amount, 0);
}

export function getPackageTotal(pkg: Pick<MembershipFeePackage, "amount" | "price_components">): number {
  const components = parsePriceComponents(pkg.price_components);
  if (components.length > 0) return sumPriceComponents(components);
  return Number(pkg.amount) || 0;
}

const LEVY_COMPONENT_LABEL = /sonderumlage|shared\s*levy|gemeinsame\s*umlage|\bumlage\b|levy|surcharge|zuschlag/i;

export function isLevyComponentLabel(label: string): boolean {
  return LEVY_COMPONENT_LABEL.test(label.trim());
}

export function splitPackageMembershipAndLevy(
  pkg: Pick<MembershipFeePackage, "amount" | "price_components" | "fee_kind">,
): { membership: number; levy: number } {
  if (pkg.fee_kind === "levy") {
    return { membership: 0, levy: getPackageTotal(pkg) };
  }

  const components = parsePriceComponents(pkg.price_components);
  if (components.length === 0) {
    return { membership: getPackageTotal(pkg), levy: 0 };
  }

  let membership = 0;
  let levy = 0;
  for (const component of components) {
    if (isLevyComponentLabel(component.label)) levy += component.amount;
    else membership += component.amount;
  }
  return { membership, levy };
}

export function formatPackageMoney(
  amount: number,
  currency: string | null | undefined,
  language: "en" | "de",
): string {
  const code = (currency || "EUR").toUpperCase();
  const locale = language === "de" ? "de-DE" : "en-GB";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function intervalLabel(
  interval: string | null | undefined,
  labels: {
    monthly: string;
    quarterly: string;
    yearly: string;
    oneTime: string;
    unknown: string;
  },
): string {
  switch (interval) {
    case "monthly":
      return labels.monthly;
    case "quarterly":
      return labels.quarterly;
    case "yearly":
      return labels.yearly;
    case "one_time":
      return labels.oneTime;
    default:
      return labels.unknown;
  }
}

export function buildAnnualMemberSummary(
  packages: MembershipFeePackage[],
  rowLabels: { youth: string; adult: string; senior: string },
): AnnualMemberSummaryRow[] {
  const activeYearly = packages.filter((pkg) => pkg.is_active !== false && pkg.interval === "yearly");

  const sharedLevyTotal = activeYearly
    .filter((pkg) => pkg.fee_kind === "levy" && pkg.member_category === "shared")
    .reduce((sum, pkg) => sum + getPackageTotal(pkg), 0);

  const categories: Array<{ key: Exclude<MemberCategory, "shared" | "none">; label: string }> = [
    { key: "youth", label: rowLabels.youth },
    { key: "adult", label: rowLabels.adult },
    { key: "senior", label: rowLabels.senior },
  ];

  return categories
    .map((category) => {
      const categoryPackages = activeYearly.filter((pkg) => pkg.member_category === category.key);

      let membershipTotal = 0;
      let levyFromComponents = 0;

      for (const pkg of categoryPackages) {
        if (pkg.fee_kind === "levy") {
          levyFromComponents += getPackageTotal(pkg);
          continue;
        }
        if (pkg.fee_kind === "membership" || pkg.fee_kind === "other" || !pkg.fee_kind) {
          const split = splitPackageMembershipAndLevy(pkg);
          membershipTotal += split.membership;
          levyFromComponents += split.levy;
        }
      }

      const levyTotal = sharedLevyTotal + levyFromComponents;
      return {
        key: category.key,
        label: category.label,
        membershipTotal,
        levyTotal,
        grandTotal: membershipTotal + levyTotal,
      };
    })
    .filter((row) => row.membershipTotal > 0 || row.levyTotal > 0);
}

export function sortFeePackages(packages: MembershipFeePackage[]): MembershipFeePackage[] {
  return [...packages].sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function feePackageDisplayAmount(
  pkg: Pick<MembershipFeePackage, "amount" | "currency" | "price_components">,
  language: "en" | "de",
): string {
  return formatPackageMoney(getPackageTotal(pkg), pkg.currency, language);
}
