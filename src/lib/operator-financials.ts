import type { PlatformPlan } from "@/lib/platform-catalog";
import type { OperatorClubListItem } from "@/lib/operator-club-detail";

// Billing statuses that represent recognized recurring revenue vs. pipeline.
const PAYING_BILLING_STATUSES = new Set(["active", "past_due"]);
const TRIAL_BILLING_STATUSES = new Set(["trialing", "trial"]);
const PROMOTIONAL_BILLING_STATUSES = new Set(["promotional", "grace"]);

export function isPromotionalBillingStatus(status: string | null | undefined): boolean {
  return PROMOTIONAL_BILLING_STATUSES.has((status ?? "").trim().toLowerCase());
}

export interface RevenuePlanRow {
  planKey: string;
  planName: string;
  priceMonthly: number;
  payingClubs: number;
  trialClubs: number;
  mrr: number;
}

export interface RevenueBreakdown {
  mrr: number;
  arr: number;
  payingClubs: number;
  trialClubs: number;
  promotionalClubs: number;
  unmatchedClubs: number;
  arpu: number;
  trialPipelineMrr: number;
  /** Catalog Kick-off potential if all promotional clubs converted (list price, not charged). */
  potentialConversionMrr: number;
  byPlan: RevenuePlanRow[];
}

function toMonthKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function compareMonthKeys(a: string, b: string): number {
  const parsedA = parseMonthKey(a);
  const parsedB = parseMonthKey(b);
  if (!parsedA || !parsedB) return a.localeCompare(b);
  return parsedA.getTime() - parsedB.getTime();
}

function safeIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isPayingBillingStatus(status: string | null | undefined): boolean {
  return PAYING_BILLING_STATUSES.has((status ?? "").trim().toLowerCase());
}

export function isTrialBillingStatus(status: string | null | undefined): boolean {
  return TRIAL_BILLING_STATUSES.has((status ?? "").trim().toLowerCase());
}

export function computeRevenue(
  plans: PlatformPlan[],
  clubs: OperatorClubListItem[],
): RevenueBreakdown {
  const planByName = new Map<string, PlatformPlan>();
  for (const plan of plans) {
    planByName.set(normalizeName(plan.name), plan);
  }

  const rows = new Map<string, RevenuePlanRow>();
  const ensureRow = (plan: PlatformPlan): RevenuePlanRow => {
    const existing = rows.get(plan.key);
    if (existing) return existing;
    const created: RevenuePlanRow = {
      planKey: plan.key,
      planName: plan.name,
      priceMonthly: plan.price_monthly ?? 0,
      payingClubs: 0,
      trialClubs: 0,
      mrr: 0,
    };
    rows.set(plan.key, created);
    return created;
  };

  let payingClubs = 0;
  let trialClubs = 0;
  let promotionalClubs = 0;
  let unmatchedClubs = 0;
  let mrr = 0;
  let trialPipelineMrr = 0;
  let potentialConversionMrr = 0;

  for (const club of clubs) {
    const plan = planByName.get(normalizeName(club.plan_name));
    const paying = isPayingBillingStatus(club.billing_status);
    const trialing = isTrialBillingStatus(club.billing_status);
    const promotional = isPromotionalBillingStatus(club.billing_status);

    // Promotional clubs never contribute to current MRR
    if (promotional) {
      promotionalClubs += 1;
      if (plan) {
        potentialConversionMrr += plan.price_monthly ?? 0;
      }
      continue;
    }

    if (!plan) {
      if (paying || trialing) unmatchedClubs += 1;
      continue;
    }

    const row = ensureRow(plan);
    const price = plan.price_monthly ?? 0;

    if (paying) {
      payingClubs += 1;
      mrr += price;
      row.payingClubs += 1;
      row.mrr += price;
    } else if (trialing) {
      trialClubs += 1;
      trialPipelineMrr += price;
      row.trialClubs += 1;
    }
  }

  const byPlan = [...rows.values()].sort((a, b) => b.mrr - a.mrr || b.payingClubs - a.payingClubs);

  return {
    mrr,
    arr: mrr * 12,
    payingClubs,
    trialClubs,
    promotionalClubs,
    unmatchedClubs,
    arpu: payingClubs > 0 ? mrr / payingClubs : 0,
    trialPipelineMrr,
    potentialConversionMrr,
    byPlan,
  };
}

export interface CostLineItem {
  id: string;
  name: string;
  monthly: number;
}

export type DevelopmentCostMethod = "loc" | "effort";

// One-time build investment (development effort spent on the app before/while it
// generates revenue). Two interchangeable estimation methods are supported:
//   - "loc":    lines of code × estimated cost per line
//   - "effort": man-days × blended daily rate
export interface DevelopmentModel {
  linesOfCode: number;
  costPerLine: number;
  personDays: number;
  dailyRate: number;
  method: DevelopmentCostMethod;
}

export interface CostModel {
  fixedItems: CostLineItem[];
  costPerActiveClub: number;
  costPerActiveUser: number;
  paymentProcessingPct: number;
  development: DevelopmentModel;
}

// Defaults are anchored on documented codebase metrics (see
// docs/PROJECT_COMPREHENSIVE_AUDIT.md § "Codebase metrics": ~84,000 LOC in src/,
// development ongoing since early 2025). Cost/line and daily rate are chosen so
// both methods land in a comparable range and can be tuned by the operator.
export const DEFAULT_DEVELOPMENT_MODEL: DevelopmentModel = {
  linesOfCode: 84000,
  costPerLine: 3,
  personDays: 400,
  dailyRate: 600,
  method: "loc",
};

export const DEFAULT_FIXED_ITEMS: readonly CostLineItem[] = [
  { id: "cursor", name: "Cursor Pro+", monthly: 40 },
  { id: "chatgpt", name: "ChatGPT Pro", monthly: 200 },
  { id: "claude", name: "Claude", monthly: 100 },
  { id: "adobe", name: "Adobe Suite", monthly: 60 },
  { id: "domains", name: "Domains (IONOS)", monthly: 10 },
  { id: "email", name: "Email (IONOS)", monthly: 5 },
  { id: "vercel", name: "Vercel", monthly: 20 },
  { id: "database", name: "Database (Supabase)", monthly: 25 },
  { id: "otherTools", name: "Other tools", monthly: 20 },
];

export const DEFAULT_COST_MODEL: CostModel = {
  fixedItems: DEFAULT_FIXED_ITEMS.map((item) => ({ ...item })),
  costPerActiveClub: 8,
  costPerActiveUser: 0.15,
  paymentProcessingPct: 2.9,
  development: { ...DEFAULT_DEVELOPMENT_MODEL },
};

// Legacy flat cost model keys kept for one-time migration of stored payloads.
const LEGACY_FIXED_KEYS: ReadonlyArray<{ legacyKey: string; id: string; name: string }> = [
  { legacyKey: "cursorMonthly", id: "cursor", name: "Cursor Pro+" },
  { legacyKey: "chatgptMonthly", id: "chatgpt", name: "ChatGPT Pro" },
  { legacyKey: "claudeMonthly", id: "claude", name: "Claude" },
  { legacyKey: "adobeMonthly", id: "adobe", name: "Adobe Suite" },
  { legacyKey: "domainsMonthly", id: "domains", name: "Domains (IONOS)" },
  { legacyKey: "emailMonthly", id: "email", name: "Email (IONOS)" },
  { legacyKey: "vercelMonthly", id: "vercel", name: "Vercel" },
  { legacyKey: "databaseMonthly", id: "database", name: "Database (Supabase)" },
  { legacyKey: "otherToolsMonthly", id: "otherTools", name: "Other tools" },
];

export type CostDriverKey = "costPerActiveClub" | "costPerActiveUser" | "paymentProcessingPct";

export interface CostDriverFieldMeta {
  key: CostDriverKey;
  unit: "eur-per-club" | "eur-per-user" | "percent";
  step: number;
}

export const COST_DRIVER_FIELDS: readonly CostDriverFieldMeta[] = [
  { key: "costPerActiveClub", unit: "eur-per-club", step: 1 },
  { key: "costPerActiveUser", unit: "eur-per-user", step: 0.05 },
  { key: "paymentProcessingPct", unit: "percent", step: 0.1 },
];

export function createCostLineItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tool_${crypto.randomUUID()}`;
  }
  return `tool_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createCostLineItem(name = "", monthly = 0): CostLineItem {
  return { id: createCostLineItemId(), name, monthly: Math.max(0, safeNumber(monthly)) };
}

export function sumFixedMonthly(model: CostModel): number {
  return model.fixedItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.monthly)), 0);
}

export interface DevelopmentCostBreakdown {
  method: DevelopmentCostMethod;
  linesOfCode: number;
  costPerLine: number;
  locCost: number;
  personDays: number;
  dailyRate: number;
  effortCost: number;
  total: number;
}

// One-time development build investment derived from the selected method.
export function computeDevelopmentCost(model: CostModel): DevelopmentCostBreakdown {
  const dev = model.development ?? DEFAULT_DEVELOPMENT_MODEL;
  const linesOfCode = Math.max(0, safeNumber(dev.linesOfCode));
  const costPerLine = Math.max(0, safeNumber(dev.costPerLine));
  const personDays = Math.max(0, safeNumber(dev.personDays));
  const dailyRate = Math.max(0, safeNumber(dev.dailyRate));
  const locCost = linesOfCode * costPerLine;
  const effortCost = personDays * dailyRate;
  const method: DevelopmentCostMethod = dev.method === "effort" ? "effort" : "loc";
  return {
    method,
    linesOfCode,
    costPerLine,
    locCost,
    personDays,
    dailyRate,
    effortCost,
    total: method === "effort" ? effortCost : locCost,
  };
}

export interface CostInputs {
  activeClubs: number;
  activeUsers: number;
  mrr: number;
}

export interface CostLine {
  key: string;
  label: string;
  amount: number;
  kind: "fixed" | "variable";
}

export interface CostBreakdown {
  fixed: number;
  variable: number;
  paymentProcessing: number;
  total: number;
  lines: CostLine[];
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function normalizeFixedItems(input: unknown): CostLineItem[] {
  if (Array.isArray(input)) {
    const items = input
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const record = raw as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name : "";
        const monthly = Math.max(0, safeNumber(Number(record.monthly)));
        const id = typeof record.id === "string" && record.id ? record.id : createCostLineItemId();
        return { id, name, monthly } satisfies CostLineItem;
      })
      .filter((item): item is CostLineItem => item !== null);
    return items;
  }

  // Legacy flat payload: reconstruct itemized subscriptions from known keys.
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    const hasLegacy = LEGACY_FIXED_KEYS.some(({ legacyKey }) => legacyKey in record);
    if (hasLegacy) {
      return LEGACY_FIXED_KEYS.map(({ legacyKey, id, name }) => {
        const fallback = DEFAULT_FIXED_ITEMS.find((item) => item.id === id)?.monthly ?? 0;
        const monthly = legacyKey in record ? Math.max(0, safeNumber(Number(record[legacyKey]))) : fallback;
        return { id, name, monthly };
      });
    }
  }

  return DEFAULT_FIXED_ITEMS.map((item) => ({ ...item }));
}

function normalizeDevelopment(input: unknown): DevelopmentModel {
  if (!input || typeof input !== "object") return { ...DEFAULT_DEVELOPMENT_MODEL };
  const record = input as Record<string, unknown>;
  const readNumber = (key: keyof DevelopmentModel, fallback: number): number =>
    key in record ? Math.max(0, safeNumber(Number(record[key]))) : fallback;
  return {
    linesOfCode: readNumber("linesOfCode", DEFAULT_DEVELOPMENT_MODEL.linesOfCode),
    costPerLine: readNumber("costPerLine", DEFAULT_DEVELOPMENT_MODEL.costPerLine),
    personDays: readNumber("personDays", DEFAULT_DEVELOPMENT_MODEL.personDays),
    dailyRate: readNumber("dailyRate", DEFAULT_DEVELOPMENT_MODEL.dailyRate),
    method: record.method === "effort" ? "effort" : "loc",
  };
}

export function normalizeCostModel(input: Partial<CostModel> | Record<string, unknown> | null | undefined): CostModel {
  const record = (input ?? {}) as Record<string, unknown>;
  const fixedItems = normalizeFixedItems("fixedItems" in record ? record.fixedItems : record);
  const readNumber = (key: CostDriverKey): number =>
    key in record ? Math.max(0, safeNumber(Number(record[key]))) : DEFAULT_COST_MODEL[key];

  return {
    fixedItems: fixedItems.length > 0 ? fixedItems : DEFAULT_FIXED_ITEMS.map((item) => ({ ...item })),
    costPerActiveClub: readNumber("costPerActiveClub"),
    costPerActiveUser: readNumber("costPerActiveUser"),
    paymentProcessingPct: readNumber("paymentProcessingPct"),
    development: normalizeDevelopment("development" in record ? record.development : undefined),
  };
}

export function computeCosts(model: CostModel, inputs: CostInputs): CostBreakdown {
  const clubVariable = model.costPerActiveClub * Math.max(0, inputs.activeClubs);
  const userVariable = model.costPerActiveUser * Math.max(0, inputs.activeUsers);
  const paymentProcessing = (model.paymentProcessingPct / 100) * Math.max(0, inputs.mrr);

  const fixedLines: CostLine[] = model.fixedItems.map((item) => ({
    key: item.id,
    label: item.name,
    amount: Math.max(0, safeNumber(item.monthly)),
    kind: "fixed",
  }));

  const lines: CostLine[] = [
    ...fixedLines,
    { key: "clubs", label: "Active club infra", amount: clubVariable, kind: "variable" },
    { key: "users", label: "Active user compute", amount: userVariable, kind: "variable" },
    { key: "payments", label: "Payment processing", amount: paymentProcessing, kind: "variable" },
  ];

  const fixed = fixedLines.reduce((sum, line) => sum + line.amount, 0);
  const variable = clubVariable + userVariable;
  const total = fixed + variable + paymentProcessing;

  return { fixed, variable, paymentProcessing, total, lines };
}

export interface Profitability {
  netMonthly: number;
  netYearly: number;
  marginPct: number;
  costPerActiveClub: number;
  revenuePerPayingClub: number;
  grossMarginPerClub: number;
  breakEvenClubs: number | null;
}

export function computeProfitability(
  revenue: RevenueBreakdown,
  costs: CostBreakdown,
  activeClubs: number,
): Profitability {
  const netMonthly = revenue.mrr - costs.total;
  const revenuePerPayingClub = revenue.arpu;
  const costPerActiveClub = activeClubs > 0 ? costs.total / activeClubs : 0;

  // Contribution margin per paying club: ARPU minus marginal cost, used to
  // estimate how many paying clubs are needed to cover fixed costs.
  const marginalCostPerClub = costPerActiveClub;
  const contributionPerClub = revenuePerPayingClub - marginalCostPerClub;
  const breakEvenClubs = contributionPerClub > 0 ? Math.ceil(costs.fixed / contributionPerClub) : null;

  return {
    netMonthly,
    netYearly: netMonthly * 12,
    marginPct: revenue.mrr > 0 ? netMonthly / revenue.mrr : 0,
    costPerActiveClub,
    revenuePerPayingClub,
    grossMarginPerClub: revenuePerPayingClub - costPerActiveClub,
    breakEvenClubs,
  };
}

export function formatEur(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, maximumFractionDigits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(maximumFractionDigits)}%`;
}

export interface InvestmentTimelinePoint {
  month: string;
  monthlyCost: number;
  cumulativeInvestment: number;
  monthlyDevelopment: number;
  cumulativeDevelopment: number;
  monthlyRevenue: number;
  cumulativeRevenue: number;
  netCumulative: number;
}

export interface InvestmentTimelineOptions {
  startMonth: string;
  nowMonth?: string;
}

export function buildInvestmentTimeline(
  model: CostModel,
  clubs: OperatorClubListItem[],
  plans: PlatformPlan[],
  options: InvestmentTimelineOptions,
): InvestmentTimelinePoint[] {
  const start = parseMonthKey(options.startMonth);
  if (!start) return [];

  const resolvedNow = options.nowMonth ? parseMonthKey(options.nowMonth) : null;
  const now = resolvedNow ?? new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  if (end.getTime() < start.getTime()) return [];

  const planByName = new Map<string, PlatformPlan>();
  for (const plan of plans) {
    planByName.set(normalizeName(plan.name), plan);
  }

  const fixedMonthly = sumFixedMonthly(model);
  const monthsTotal = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  // Spread the one-time development build cost evenly across the timeline so it
  // renders as a rising cumulative investment line rather than a single spike.
  const developmentTotal = computeDevelopmentCost(model).total;
  const monthlyDevelopment = monthsTotal >= 0 ? developmentTotal / (monthsTotal + 1) : 0;

  const payingClubs = clubs
    .filter((club) => isPayingBillingStatus(club.billing_status))
    .map((club) => {
      const created = safeIsoDate(club.created_at);
      const plan = planByName.get(normalizeName(club.plan_name));
      const monthlyPrice = plan?.price_monthly ?? 0;
      return { createdMonth: created ? toMonthKey(created) : null, monthlyPrice };
    })
    .filter((row) => row.createdMonth && row.monthlyPrice > 0) as Array<{ createdMonth: string; monthlyPrice: number }>;

  let cumulativeInvestment = 0;
  let cumulativeDevelopment = 0;
  let cumulativeRevenue = 0;
  const points: InvestmentTimelinePoint[] = [];

  for (let index = 0; index <= monthsTotal; index += 1) {
    const current = addMonths(start, index);
    const monthKey = toMonthKey(current);

    const monthlyCost = fixedMonthly;
    const monthlyRevenue = payingClubs.reduce(
      (sum, row) => (compareMonthKeys(row.createdMonth, monthKey) <= 0 ? sum + row.monthlyPrice : sum),
      0,
    );

    cumulativeInvestment += monthlyCost;
    cumulativeDevelopment += monthlyDevelopment;
    cumulativeRevenue += monthlyRevenue;

    points.push({
      month: monthKey,
      monthlyCost,
      cumulativeInvestment,
      monthlyDevelopment,
      cumulativeDevelopment,
      monthlyRevenue,
      cumulativeRevenue,
      // Net position reflects the full build: revenue minus operating spend and
      // the accumulated development investment.
      netCumulative: cumulativeRevenue - (cumulativeInvestment + cumulativeDevelopment),
    });
  }

  return points.sort((a, b) => compareMonthKeys(a.month, b.month));
}

export interface InvestmentSummary {
  operatingInvested: number;
  developmentInvested: number;
  totalInvested: number;
  monthsElapsed: number;
  cumulativeRevenue: number;
  netPosition: number;
  projectedBreakEvenMonth: string | null;
}

export function computeInvestmentSummary(timeline: InvestmentTimelinePoint[]): InvestmentSummary {
  if (timeline.length === 0) {
    return {
      operatingInvested: 0,
      developmentInvested: 0,
      totalInvested: 0,
      monthsElapsed: 0,
      cumulativeRevenue: 0,
      netPosition: 0,
      projectedBreakEvenMonth: null,
    };
  }

  const last = timeline[timeline.length - 1];
  const breakEven = timeline.find((point) => point.netCumulative >= 0) ?? null;

  return {
    operatingInvested: last.cumulativeInvestment,
    developmentInvested: last.cumulativeDevelopment,
    totalInvested: last.cumulativeInvestment + last.cumulativeDevelopment,
    monthsElapsed: timeline.length,
    cumulativeRevenue: last.cumulativeRevenue,
    netPosition: last.netCumulative,
    projectedBreakEvenMonth: breakEven?.month ?? null,
  };
}

export const COST_MODEL_STORAGE_KEY = "one4team.operator.costModel";
export const COST_MODEL_HISTORY_STORAGE_KEY = "one4team.operator.costModelHistory";
const COST_MODEL_HISTORY_LIMIT = 20;

export interface CostModelSnapshot {
  model: CostModel;
  comment: string;
  savedAt: string | null;
}

export interface CostModelChangeLogEntry {
  savedAt: string;
  comment: string;
  model: CostModel;
}

export const DEFAULT_COST_MODEL_SNAPSHOT: CostModelSnapshot = {
  model: DEFAULT_COST_MODEL,
  comment: "",
  savedAt: null,
};

export function areCostModelsEqual(a: CostModel, b: CostModel): boolean {
  if (a.fixedItems.length !== b.fixedItems.length) return false;
  const fixedEqual = a.fixedItems.every((item, index) => {
    const other = b.fixedItems[index];
    return other && item.id === other.id && item.name === other.name && item.monthly === other.monthly;
  });
  const devEqual =
    a.development.method === b.development.method &&
    a.development.linesOfCode === b.development.linesOfCode &&
    a.development.costPerLine === b.development.costPerLine &&
    a.development.personDays === b.development.personDays &&
    a.development.dailyRate === b.development.dailyRate;

  return (
    fixedEqual &&
    devEqual &&
    a.costPerActiveClub === b.costPerActiveClub &&
    a.costPerActiveUser === b.costPerActiveUser &&
    a.paymentProcessingPct === b.paymentProcessingPct
  );
}

export function isCostModelSnapshotDirty(
  draftModel: CostModel,
  draftComment: string,
  saved: CostModelSnapshot,
): boolean {
  return !areCostModelsEqual(draftModel, saved.model) || draftComment.trim() !== saved.comment.trim();
}

function parseCostModelSnapshot(raw: unknown): CostModelSnapshot {
  if (!raw || typeof raw !== "object") return DEFAULT_COST_MODEL_SNAPSHOT;
  const record = raw as Record<string, unknown>;
  if ("model" in record) {
    return {
      model: normalizeCostModel(record.model as Partial<CostModel>),
      comment: typeof record.comment === "string" ? record.comment : "",
      savedAt: typeof record.savedAt === "string" ? record.savedAt : null,
    };
  }
  return {
    model: normalizeCostModel(record as Partial<CostModel>),
    comment: "",
    savedAt: null,
  };
}

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem">;

export function loadCostModelSnapshot(
  storage: StorageReader | null | undefined = typeof window !== "undefined" ? window.localStorage : null,
): CostModelSnapshot {
  if (!storage) return DEFAULT_COST_MODEL_SNAPSHOT;
  try {
    const raw = storage.getItem(COST_MODEL_STORAGE_KEY);
    if (!raw) return DEFAULT_COST_MODEL_SNAPSHOT;
    return parseCostModelSnapshot(JSON.parse(raw));
  } catch {
    return DEFAULT_COST_MODEL_SNAPSHOT;
  }
}

export function saveCostModelSnapshot(
  snapshot: CostModelSnapshot,
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window !== "undefined" ? window.localStorage : null,
): void {
  if (!storage) return;
  storage.setItem(COST_MODEL_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadCostModelHistory(
  storage: StorageReader | null | undefined = typeof window !== "undefined" ? window.localStorage : null,
): CostModelChangeLogEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(COST_MODEL_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is CostModelChangeLogEntry =>
          Boolean(entry) && typeof entry === "object" && typeof (entry as CostModelChangeLogEntry).savedAt === "string",
      )
      .map((entry) => ({
        savedAt: entry.savedAt,
        comment: typeof entry.comment === "string" ? entry.comment : "",
        model: normalizeCostModel(entry.model),
      }))
      .slice(0, COST_MODEL_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendCostModelChange(
  entry: CostModelChangeLogEntry,
  storage: StorageWriter | null | undefined = typeof window !== "undefined" ? window.localStorage : null,
): CostModelChangeLogEntry[] {
  if (!storage) return [entry];
  const history = [entry, ...loadCostModelHistory(storage)].slice(0, COST_MODEL_HISTORY_LIMIT);
  storage.setItem(COST_MODEL_HISTORY_STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function createCostModelSnapshot(draftModel: CostModel, draftComment: string): CostModelSnapshot {
  return {
    model: normalizeCostModel(draftModel),
    comment: draftComment.trim(),
    savedAt: new Date().toISOString(),
  };
}
