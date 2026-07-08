import { describe, expect, it } from "vitest";
import type { PlatformPlan } from "@/lib/platform-catalog";
import type { OperatorClubListItem } from "@/lib/operator-club-detail";
import {
  DEFAULT_COST_MODEL,
  DEFAULT_DEVELOPMENT_MODEL,
  COST_MODEL_HISTORY_STORAGE_KEY,
  COST_MODEL_STORAGE_KEY,
  appendCostModelChange,
  areCostModelsEqual,
  buildInvestmentTimeline,
  computeCosts,
  computeDevelopmentCost,
  computeInvestmentSummary,
  computeProfitability,
  computeRevenue,
  createCostLineItem,
  createCostModelSnapshot,
  isCostModelSnapshotDirty,
  isPayingBillingStatus,
  isTrialBillingStatus,
  loadCostModelHistory,
  loadCostModelSnapshot,
  normalizeCostModel,
  saveCostModelSnapshot,
  type CostModel,
} from "@/lib/operator-financials";

function plan(overrides: Partial<PlatformPlan>): PlatformPlan {
  return {
    id: overrides.key ?? "plan",
    key: overrides.key ?? "plan",
    name: overrides.name ?? "Plan",
    description: null,
    price_monthly: overrides.price_monthly ?? 0,
    price_yearly: overrides.price_yearly ?? null,
    max_users: null,
    max_teams: null,
    status: "ACTIVE",
    modules: [],
    created_at: "",
    updated_at: "",
  };
}

function club(overrides: Partial<OperatorClubListItem>): OperatorClubListItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Club",
    slug: overrides.slug ?? "club",
    status: overrides.status ?? "ACTIVE",
    plan_name: overrides.plan_name ?? null,
    billing_status: overrides.billing_status ?? null,
    created_at: overrides.created_at ?? "",
    updated_at: overrides.updated_at ?? "",
  };
}

describe("billing status classifiers", () => {
  it("treats active and past_due as paying", () => {
    expect(isPayingBillingStatus("active")).toBe(true);
    expect(isPayingBillingStatus("past_due")).toBe(true);
    expect(isPayingBillingStatus("trialing")).toBe(false);
    expect(isPayingBillingStatus(null)).toBe(false);
  });

  it("treats trialing as trial", () => {
    expect(isTrialBillingStatus("trialing")).toBe(true);
    expect(isTrialBillingStatus("active")).toBe(false);
  });
});

describe("computeRevenue", () => {
  const plans = [
    plan({ key: "pro", name: "Club Pro", price_monthly: 100 }),
    plan({ key: "starter", name: "Starter", price_monthly: 40 }),
  ];

  it("sums MRR from paying clubs matched by plan name", () => {
    const clubs = [
      club({ plan_name: "Club Pro", billing_status: "active" }),
      club({ plan_name: "Club Pro", billing_status: "past_due" }),
      club({ plan_name: "Starter", billing_status: "active" }),
      club({ plan_name: "Starter", billing_status: "trialing" }),
    ];
    const revenue = computeRevenue(plans, clubs);
    expect(revenue.mrr).toBe(240);
    expect(revenue.arr).toBe(240 * 12);
    expect(revenue.payingClubs).toBe(3);
    expect(revenue.trialClubs).toBe(1);
    expect(revenue.arpu).toBe(80);
    expect(revenue.trialPipelineMrr).toBe(40);
  });

  it("matches plan names case-insensitively and ignores unmatched billed clubs", () => {
    const clubs = [
      club({ plan_name: "club pro", billing_status: "active" }),
      club({ plan_name: "Legacy", billing_status: "active" }),
    ];
    const revenue = computeRevenue(plans, clubs);
    expect(revenue.mrr).toBe(100);
    expect(revenue.unmatchedClubs).toBe(1);
  });
});

describe("computeCosts", () => {
  it("combines fixed, variable, and payment processing", () => {
    const costs = computeCosts(DEFAULT_COST_MODEL, { activeClubs: 10, activeUsers: 100, mrr: 1000 });
    const expectedFixed = 40 + 200 + 100 + 60 + 10 + 5 + 20 + 25 + 20;
    const expectedVariable = 8 * 10 + 0.15 * 100;
    const expectedPayments = (2.9 / 100) * 1000;
    expect(costs.fixed).toBe(expectedFixed);
    expect(costs.variable).toBe(expectedVariable);
    expect(costs.paymentProcessing).toBeCloseTo(expectedPayments);
    expect(costs.total).toBeCloseTo(expectedFixed + expectedVariable + expectedPayments);
  });
});

describe("computeProfitability", () => {
  it("computes net, margin, and break-even", () => {
    const revenue = computeRevenue(
      [plan({ key: "pro", name: "Pro", price_monthly: 100 })],
      [
        club({ plan_name: "Pro", billing_status: "active" }),
        club({ plan_name: "Pro", billing_status: "active" }),
      ],
    );
    const costs = computeCosts(DEFAULT_COST_MODEL, { activeClubs: 2, activeUsers: 20, mrr: revenue.mrr });
    const profit = computeProfitability(revenue, costs, 2);
    expect(profit.netMonthly).toBeCloseTo(revenue.mrr - costs.total);
    expect(profit.netYearly).toBeCloseTo(profit.netMonthly * 12);
  });
});

describe("normalizeCostModel", () => {
  it("migrates legacy flat payloads into itemized subscriptions and clamps negatives", () => {
    const model = normalizeCostModel({ cursorMonthly: -50, chatgptMonthly: 250 });
    const cursor = model.fixedItems.find((item) => item.id === "cursor");
    const chatgpt = model.fixedItems.find((item) => item.id === "chatgpt");
    const vercel = model.fixedItems.find((item) => item.id === "vercel");
    expect(cursor?.monthly).toBe(0);
    expect(chatgpt?.monthly).toBe(250);
    expect(vercel?.monthly).toBe(20);
  });

  it("keeps custom fixed items and generates ids when missing", () => {
    const model = normalizeCostModel({
      fixedItems: [
        { id: "figma", name: "Figma", monthly: 15 },
        { name: "GitHub", monthly: -5 },
      ],
      costPerActiveClub: 12,
    });
    expect(model.fixedItems).toHaveLength(2);
    expect(model.fixedItems[0]).toEqual({ id: "figma", name: "Figma", monthly: 15 });
    expect(model.fixedItems[1].name).toBe("GitHub");
    expect(model.fixedItems[1].monthly).toBe(0);
    expect(model.fixedItems[1].id).toBeTruthy();
    expect(model.costPerActiveClub).toBe(12);
  });

  it("falls back to defaults when no fixed data is present", () => {
    const model = normalizeCostModel({ costPerActiveUser: 0.2 });
    expect(model.fixedItems).toHaveLength(DEFAULT_COST_MODEL.fixedItems.length);
    expect(model.costPerActiveUser).toBe(0.2);
  });
});

describe("computeDevelopmentCost", () => {
  it("uses lines of code × cost per line for the loc method", () => {
    const dev = computeDevelopmentCost(DEFAULT_COST_MODEL);
    expect(dev.method).toBe("loc");
    expect(dev.locCost).toBe(DEFAULT_DEVELOPMENT_MODEL.linesOfCode * DEFAULT_DEVELOPMENT_MODEL.costPerLine);
    expect(dev.total).toBe(dev.locCost);
  });

  it("switches to person-days × daily rate for the effort method", () => {
    const model: CostModel = {
      ...DEFAULT_COST_MODEL,
      development: { ...DEFAULT_DEVELOPMENT_MODEL, method: "effort", personDays: 100, dailyRate: 500 },
    };
    const dev = computeDevelopmentCost(model);
    expect(dev.method).toBe("effort");
    expect(dev.effortCost).toBe(50000);
    expect(dev.total).toBe(50000);
  });

  it("clamps negative development inputs to zero", () => {
    const model = normalizeCostModel({ development: { linesOfCode: -10, costPerLine: -1, method: "loc" } });
    const dev = computeDevelopmentCost(model);
    expect(dev.linesOfCode).toBe(0);
    expect(dev.costPerLine).toBe(0);
    expect(dev.total).toBe(0);
  });
});

describe("investment timeline helpers", () => {
  it("accumulates the development build cost into a purple cumulative line and net", () => {
    const model: CostModel = {
      ...DEFAULT_COST_MODEL,
      fixedItems: [],
      development: { ...DEFAULT_DEVELOPMENT_MODEL, method: "loc", linesOfCode: 100, costPerLine: 30 },
    };
    const timeline = buildInvestmentTimeline(model, [], [], { startMonth: "2026-01", nowMonth: "2026-03" });
    const last = timeline[timeline.length - 1];
    // 100 * 30 = 3000 spread across 3 months, fully accumulated at the end.
    expect(last.cumulativeDevelopment).toBeCloseTo(3000);
    expect(last.netCumulative).toBeCloseTo(-3000);

    const summary = computeInvestmentSummary(timeline);
    expect(summary.developmentInvested).toBeCloseTo(3000);
    expect(summary.totalInvested).toBeCloseTo(3000);
  });

  it("builds a monthly cumulative series and computes break-even", () => {
    const plans = [plan({ key: "pro", name: "Club Pro", price_monthly: 100 })];
    const clubs = [
      club({
        plan_name: "Club Pro",
        billing_status: "active",
        created_at: "2026-02-15T12:00:00.000Z",
      }),
    ];

    const timeline = buildInvestmentTimeline(DEFAULT_COST_MODEL, clubs, plans, {
      startMonth: "2026-01",
      nowMonth: "2026-03",
    });

    expect(timeline.map((point) => point.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(timeline[0].monthlyRevenue).toBe(0);
    expect(timeline[1].monthlyRevenue).toBe(100);
    expect(timeline[2].monthlyRevenue).toBe(100);

    const summary = computeInvestmentSummary(timeline);
    expect(summary.totalInvested).toBeGreaterThan(0);
    expect(summary.cumulativeRevenue).toBe(200);
    expect(summary.monthsElapsed).toBe(3);
  });
});

describe("cost model snapshot persistence", () => {
  function createMemoryStorage(): Storage {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key) => store.get(key) ?? null,
      key: (index) => [...store.keys()][index] ?? null,
      removeItem: (key) => {
        store.delete(key);
      },
      setItem: (key, value) => {
        store.set(key, value);
      },
    };
  }

  it("loads legacy flat cost model payloads", () => {
    const storage = createMemoryStorage();
    storage.setItem(COST_MODEL_STORAGE_KEY, JSON.stringify({ cursorMonthly: 99 }));

    const snapshot = loadCostModelSnapshot(storage);
    expect(snapshot.model.fixedItems.find((item) => item.id === "cursor")?.monthly).toBe(99);
    expect(snapshot.comment).toBe("");
    expect(snapshot.savedAt).toBeNull();
  });

  it("saves snapshot with comment and tracks dirty state", () => {
    const storage = createMemoryStorage();
    const withRaisedCursor: CostModel = {
      ...DEFAULT_COST_MODEL,
      fixedItems: DEFAULT_COST_MODEL.fixedItems.map((item) =>
        item.id === "cursor" ? { ...item, monthly: 55 } : { ...item },
      ),
    };
    const snapshot = createCostModelSnapshot(withRaisedCursor, "Raised Cursor budget");
    saveCostModelSnapshot(snapshot, storage);

    const loaded = loadCostModelSnapshot(storage);
    expect(loaded.model.fixedItems.find((item) => item.id === "cursor")?.monthly).toBe(55);
    expect(loaded.comment).toBe("Raised Cursor budget");
    expect(loaded.savedAt).toBeTruthy();
    expect(isCostModelSnapshotDirty(loaded.model, loaded.comment, loaded)).toBe(false);
    expect(isCostModelSnapshotDirty({ ...loaded.model, costPerActiveClub: 99 }, loaded.comment, loaded)).toBe(true);
    expect(isCostModelSnapshotDirty(loaded.model, "Different note", loaded)).toBe(true);
  });

  it("adds and removes custom tools", () => {
    const withNewTool: CostModel = {
      ...DEFAULT_COST_MODEL,
      fixedItems: [...DEFAULT_COST_MODEL.fixedItems, createCostLineItem("Figma", 15)],
    };
    const costs = computeCosts(withNewTool, { activeClubs: 0, activeUsers: 0, mrr: 0 });
    expect(costs.lines.some((line) => line.label === "Figma" && line.amount === 15)).toBe(true);
    expect(areCostModelsEqual(withNewTool, DEFAULT_COST_MODEL)).toBe(false);
  });

  it("appends change history entries", () => {
    const storage = createMemoryStorage();
    const first = createCostModelSnapshot(DEFAULT_COST_MODEL, "Initial assumptions");
    appendCostModelChange({ savedAt: first.savedAt!, comment: first.comment, model: first.model }, storage);
    const upgraded: CostModel = {
      ...DEFAULT_COST_MODEL,
      fixedItems: DEFAULT_COST_MODEL.fixedItems.map((item) =>
        item.id === "vercel" ? { ...item, monthly: 40 } : { ...item },
      ),
    };
    const second = createCostModelSnapshot(upgraded, "Vercel upgrade");
    const history = appendCostModelChange(
      { savedAt: second.savedAt!, comment: second.comment, model: second.model },
      storage,
    );

    expect(history).toHaveLength(2);
    expect(loadCostModelHistory(storage)).toHaveLength(2);
    expect(storage.getItem(COST_MODEL_HISTORY_STORAGE_KEY)).toBeTruthy();
  });
});
